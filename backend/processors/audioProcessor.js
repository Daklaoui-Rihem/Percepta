/**
 * audioProcessor.js — With Key Entity Extraction
 *
 * Pipeline:
 *   1. Whisper STT → raw transcription
 *   2. Entity extraction (location, phones, people count, incident type, etc.)
 *   3. Optional translation
 *   4. PDF report generation (now includes extracted entities)
 *
 * ENV variables:
 *   WHISPER_PYTHON       path to python exe  (default: "python")
 *   WHISPER_SCRIPT       path to whisper_transcribe.py
 *   EXTRACT_SCRIPT       path to extract_entities.py
 *   WHISPER_LANG         'fr'|'en'|'ar'|'auto'  (default: 'auto')
 *   WHISPER_TIMEOUT      ms before kill  (default: 600000)
 *   ANTHROPIC_API_KEY    for LLM-based extraction (optional, recommended)
 *   OPENAI_API_KEY       alternative LLM (optional)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateTranscriptionPDF } = require('../utils/Pdfreportgenerator');

// ── Config ─────────────────────────────────────────────────────
// ── Config ─────────────────────────────────────────────────────
const PYTHON_BIN = process.env.WHISPER_PYTHON || 'python';
const PYTHON_ARGS_PREFIX = process.env.WHISPER_PYTHON_VERSION 
    ? ['-' + process.env.WHISPER_PYTHON_VERSION] 
    : [];

// Choix du moteur selon la variable d'environnement
const TRANSCRIPTION_ENGINE = process.env.TRANSCRIPTION_ENGINE || 'whisper'; // 'whisper' | 'voxtral'

const SCRIPT_PATH = process.env.WHISPER_SCRIPT ||
    path.join(__dirname, '..', 'scripts', 'whisper_transcribe.py');

const VOXTRAL_SCRIPT_PATH = process.env.VOXTRAL_SCRIPT ||
    path.join(__dirname, '..', 'scripts', 'voxtral_transcribe.py');

const EXTRACT_SCRIPT_PATH = process.env.EXTRACT_SCRIPT ||
    path.join(__dirname, '..', 'scripts', 'extract_entities.py');

const TRANSLATE_SCRIPT_PATH = process.env.TRANSLATE_SCRIPT ||
    path.join(__dirname, '..', 'scripts', 'translate_text.py');

const DEFAULT_LANG = process.env.WHISPER_LANG || 'auto';
const TIMEOUT_MS   = parseInt(process.env.WHISPER_TIMEOUT || '600000');

// ── Main ───────────────────────────────────────────────────────
async function processAudio({ analysisId, filePath, job, userId, userName, userEmail, originalName, translateTo }) {
    console.log(`🎵 [AudioProcessor] Starting Whisper for: ${path.basename(filePath)}`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Audio file not found: ${filePath}`);
    }

    if (!fs.existsSync(SCRIPT_PATH)) {
        throw new Error(
            `whisper_transcribe.py not found at: ${SCRIPT_PATH}\n` +
            `Create the folder backend/scripts/ and place the file there.`
        );
    }

    await job.updateProgress(10);

    // ── Step 1: Transcription ──────────────────────────────────
    // APRÈS
// Read engine from DB (admin setting), fall back to env
    let activeEngine = TRANSCRIPTION_ENGINE;
    try {
        const Settings = require('../models/Settings');
        const dbSettings = await Settings.findOne();
        if (dbSettings?.transcriptionEngine) {
            activeEngine = dbSettings.transcriptionEngine;
        }
    } catch (_) {}

    const result = activeEngine === 'voxtral'
        ? await runVoxtral(filePath, DEFAULT_LANG)
        : await runWhisper(filePath, DEFAULT_LANG);

    console.log(`🤖 [AudioProcessor] Engine used: ${activeEngine}`);

    await job.updateProgress(60);

    console.log(
        `✅ [AudioProcessor] Whisper done — ` +
        `lang=${result.language}, ` +
        `duration=${result.duration}s, ` +
        `chars=${result.text.length}`
    );

    // Summary removed as per user request

    // ── Step 2: Entity Extraction ──────────────────────────────
    let extractedEntities = null;
    try {
        console.log(`🔍 [AudioProcessor] Extracting key entities...`);
        extractedEntities = await runEntityExtraction(result.text, result.language);
        console.log(
            `✅ [AudioProcessor] Entities extracted — ` +
            `method=${extractedEntities.extraction_method}, ` +
            `incident=${extractedEntities.incident_type || 'unknown'}, ` +
            `severity=${extractedEntities.severity}`
        );
    } catch (extractErr) {
        // Entity extraction failure is NON-FATAL — transcription still succeeds
        console.error(`⚠️  [AudioProcessor] Entity extraction failed:`, extractErr.message);
        extractedEntities = null;
    }

    await job.updateProgress(75);

    // ── Step 3: Optional Translation ──────────────────────────
    let translatedText = '';
    let translationLang = '';

    if (translateTo && translateTo !== result.language) {
        console.log(`🌐 [AudioProcessor] Translating to: ${translateTo}`);
        try {
            const translationResult = await runTranslation(result.text, result.language, translateTo);
            translatedText = translationResult;
            translationLang = translateTo;
            console.log(`✅ [AudioProcessor] Translation done (${result.language} → ${translateTo})`);
        } catch (translErr) {
            console.error(`⚠️  [AudioProcessor] Translation failed:`, translErr.message);
        }
    } else if (translateTo && translateTo === result.language) {
        console.log(`ℹ️  [AudioProcessor] Source and target language are the same (${result.language}), skipping translation.`);
    }

    await job.updateProgress(85);

    // ── Step 4: PDF Report ─────────────────────────────────────
    let pdfPath = '';
    try {
        const pdfOutputDir = path.join(__dirname, '..', 'uploads', String(userId || 'unknown'), 'reports');
        pdfPath = await generateTranscriptionPDF({
            analysisId: String(analysisId),
            originalName: originalName || path.basename(filePath),
            transcription: result.text,
            translatedText,
            translationLang,
            extractedEntities,          // ← Pass entities to PDF generator
            userName: userName || 'User',
            userEmail: userEmail || '',
            createdAt: new Date(),
            outputDir: pdfOutputDir,
        });
        console.log(`📄 [AudioProcessor] PDF report generated: ${path.basename(pdfPath)}`);
    } catch (pdfErr) {
        console.error(`⚠️  [AudioProcessor] PDF generation failed:`, pdfErr.message);
    }

    await job.updateProgress(95);

    return {
        transcription: result.text,
        language: result.language || 'auto',
        duration: result.duration || 0,
        pdfPath,
        translatedText,
        translationLang,
        extractedEntities,              // ← Return to worker/controller
    };
}

// ── Spawn Whisper Python ───────────────────────────────────────
function runWhisper(filePath, language) {
    return new Promise((resolve, reject) => {
        const args = [...PYTHON_ARGS_PREFIX,SCRIPT_PATH, filePath, language];

        console.log(`🐍 [AudioProcessor] Spawning: ${PYTHON_BIN} ${args.join(' ')}`);

        const proc = spawn(PYTHON_BIN, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', chunk => { stdout += chunk.toString(); });
        proc.stderr.on('data', chunk => {
            const line = chunk.toString().trimEnd();
            stderr += line + '\n';
            if (line) process.stdout.write(`  [Whisper] ${line}\n`);
        });

        const timer = setTimeout(() => {
            proc.kill();
            reject(new Error(`Whisper timed out after ${TIMEOUT_MS / 1000}s.`));
        }, TIMEOUT_MS);

        proc.on('close', code => {
            clearTimeout(timer);
            let parsed;
            try {
                parsed = extractJSON(stdout);
            } catch (_) {
                return reject(new Error(
                    `Whisper returned non-JSON output (exit ${code}).\n` +
                    `stdout: ${stdout.slice(0, 400)}\nstderr: ${stderr.slice(0, 400)}`
                ));
            }

            if (code !== 0 || parsed.error) {
                return reject(new Error(parsed.error || `Whisper exited with code ${code}`));
            }
            resolve(parsed);
        });

        proc.on('error', err => {
            clearTimeout(timer);
            if (err.code === 'ENOENT') {
                reject(new Error(`Python not found: "${PYTHON_BIN}"\nAdd Python to PATH or set WHISPER_PYTHON in .env`));
            } else {
                reject(err);
            }
        });
    });
}
// ── Spawn Voxtral Python ───────────────────────────────────────
function runVoxtral(filePath, language) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(VOXTRAL_SCRIPT_PATH)) {
            return reject(new Error(
                `voxtral_transcribe.py introuvable à: ${VOXTRAL_SCRIPT_PATH}`
            ));
        }

        const args = [...PYTHON_ARGS_PREFIX,VOXTRAL_SCRIPT_PATH, filePath, language];

        console.log(`🐍 [AudioProcessor] Lancement Voxtral: ${PYTHON_BIN} ${args.join(' ')}`);

        const proc = spawn(PYTHON_BIN, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8',
                PYTHONUTF8: '1',
                MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || '',
            },
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', chunk => { stdout += chunk.toString(); });
        proc.stderr.on('data', chunk => {
            const line = chunk.toString().trimEnd();
            stderr += line + '\n';
            if (line) process.stdout.write(`  [Voxtral] ${line}\n`);
        });

        const timer = setTimeout(() => {
            proc.kill();
            reject(new Error(`Voxtral a dépassé le délai de ${TIMEOUT_MS / 1000}s.`));
        }, TIMEOUT_MS);

        proc.on('close', code => {
            clearTimeout(timer);
            let parsed;
            try {
                parsed = extractJSON(stdout);
            } catch (_) {
                return reject(new Error(
                    `Voxtral a retourné un résultat non-JSON (exit ${code}).\n` +
                    `stdout: ${stdout.slice(0, 400)}\nstderr: ${stderr.slice(0, 400)}`
                ));
            }

            if (code !== 0 || parsed.error) {
                return reject(new Error(parsed.error || `Voxtral a échoué avec le code ${code}`));
            }
            resolve(parsed);
        });

        proc.on('error', err => {
            clearTimeout(timer);
            if (err.code === 'ENOENT') {
                reject(new Error(`Python introuvable: "${PYTHON_BIN}"`));
            } else {
                reject(err);
            }
        });
    });
}

// ── Run Entity Extraction ──────────────────────────────────────
async function runEntityExtraction(text, language) {
    if (!fs.existsSync(EXTRACT_SCRIPT_PATH)) {
        throw new Error(`extract_entities.py not found at: ${EXTRACT_SCRIPT_PATH}`);
    }

    // Write text to a temp file to avoid command-line length limits
    const tmpFile = path.join(os.tmpdir(), `percepta_extract_${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, text, 'utf-8');

    return new Promise((resolve, reject) => {
        const args = [...PYTHON_ARGS_PREFIX,EXTRACT_SCRIPT_PATH, tmpFile, language || 'auto'];

        const proc = spawn(PYTHON_BIN, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8',
                PYTHONUTF8: '1',
                // Pass API keys so the Python script can use them
                ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
            },
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', chunk => { stdout += chunk.toString(); });
        proc.stderr.on('data', chunk => {
            const line = chunk.toString().trimEnd();
            stderr += line + '\n';
        });

        // 3-minute timeout for extraction
        const timer = setTimeout(() => {
            proc.kill();
            fs.unlink(tmpFile, () => {});
            reject(new Error('Entity extraction timed out after 3 minutes.'));
        }, 3 * 60 * 1000);

        proc.on('close', code => {
            clearTimeout(timer);
            fs.unlink(tmpFile, () => {}); // cleanup

            let parsed;
            try {
                parsed = extractJSON(stdout);
                console.log(`🔍 [AudioProcessor] Entity extraction raw stdout length: ${stdout.length}`);
            } catch (_) {
                return reject(new Error(
                    `Entity extraction returned non-JSON (exit ${code}).\n` +
                    `stdout: ${stdout.slice(0, 300)}\nstderr: ${stderr.slice(0, 300)}`
                ));
            }

            if (code !== 0 || parsed.error) {
                return reject(new Error(parsed.error || `Extraction exited with code ${code}`));
            }

            resolve(parsed);
        });

        proc.on('error', err => {
            clearTimeout(timer);
            fs.unlink(tmpFile, () => {});
            reject(new Error(`Failed to spawn extraction script: ${err.message}`));
        });
    });
}

// ── Run Translation Script ─────────────────────────────────────
async function runTranslation(text, sourceLang, targetLang) {
    if (!fs.existsSync(TRANSLATE_SCRIPT_PATH)) {
        throw new Error(`translate_text.py not found at: ${TRANSLATE_SCRIPT_PATH}`);
    }

    const tmpFile = path.join(os.tmpdir(), `percepta_translate_${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, text, 'utf-8');

    return new Promise((resolve, reject) => {
        const args = [TRANSLATE_SCRIPT_PATH, sourceLang || 'auto', targetLang, tmpFile];

        const proc = spawn(PYTHON_BIN, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', chunk => { stdout += chunk.toString(); });
        proc.stderr.on('data', chunk => {
            const line = chunk.toString().trimEnd();
            stderr += line + '\n';
        });

        const timer = setTimeout(() => {
            proc.kill();
            fs.unlink(tmpFile, () => {});
            reject(new Error('Translation timed out after 5 minutes.'));
        }, 5 * 60 * 1000);

        proc.on('close', code => {
            clearTimeout(timer);
            fs.unlink(tmpFile, () => {});

            let parsed;
            try {
                parsed = extractJSON(stdout);
            } catch (_) {
                return reject(new Error(
                    `Translate script returned non-JSON (exit ${code}).\n` +
                    `stdout: ${stdout.slice(0, 300)}\nstderr: ${stderr.slice(0, 300)}`
                ));
            }

            if (code !== 0 || parsed.error) {
                return reject(new Error(parsed.error || `Translation script exited with code ${code}`));
            }

            resolve(parsed.translated || '');
        });

        proc.on('error', err => {
            clearTimeout(timer);
            fs.unlink(tmpFile, () => {});
            reject(new Error(`Failed to spawn translation script: ${err.message}`));
        });
    });
}

// ── JSON extractor ─────────────────────────────────────────────
// Python scripts may print warnings/tqdm progress before the JSON.
// This finds the last top-level JSON object in stdout.
function extractJSON(raw) {
    const str = raw.trim();
    // Find the last '{' that starts a top-level JSON object
    let lastStart = -1;
    for (let i = str.length - 1; i >= 0; i--) {
        if (str[i] === '{') {
            try {
                const candidate = str.substring(i);
                const parsed = JSON.parse(candidate);
                return parsed;
            } catch (_) { /* keep searching */ }
        }
    }
    // Fallback: try parsing the whole thing
    return JSON.parse(str);
}

module.exports = { processAudio };