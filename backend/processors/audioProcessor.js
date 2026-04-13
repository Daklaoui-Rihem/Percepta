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
const { generateTranscriptionPDF } = require('../utils/pdfReportGenerator');

// ── Config ─────────────────────────────────────────────────────
const PYTHON_BIN = process.env.WHISPER_PYTHON || 'python';

const SCRIPT_PATH = process.env.WHISPER_SCRIPT ||
    path.join(__dirname, '..', 'scripts', 'whisper_transcribe.py');

const EXTRACT_SCRIPT_PATH = process.env.EXTRACT_SCRIPT ||
    path.join(__dirname, '..', 'scripts', 'extract_entities.py');

const TRANSLATE_SCRIPT_PATH = process.env.TRANSLATE_SCRIPT ||
    path.join(__dirname, '..', 'scripts', 'translate_text.py');

const DEFAULT_LANG = process.env.WHISPER_LANG || 'auto';
const TIMEOUT_MS = parseInt(process.env.WHISPER_TIMEOUT || '600000');

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
    const result = await runWhisper(filePath, DEFAULT_LANG);

    await job.updateProgress(60);

    console.log(
        `✅ [AudioProcessor] Whisper done — ` +
        `lang=${result.language}, ` +
        `duration=${result.duration}s, ` +
        `chars=${result.text.length}`
    );

    const summary = buildSummary(result.text, result.language, result.duration, result.confidence, result.summary);

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
            summary,
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
        summary,
        pdfPath,
        translatedText,
        translationLang,
        extractedEntities,              // ← Return to worker/controller
    };
}

// ── Spawn Whisper Python ───────────────────────────────────────
function runWhisper(filePath, language) {
    return new Promise((resolve, reject) => {
        const args = [SCRIPT_PATH, filePath, language];

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
                parsed = JSON.parse(stdout.trim());
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

// ── Run Entity Extraction ──────────────────────────────────────
async function runEntityExtraction(text, language) {
    if (!fs.existsSync(EXTRACT_SCRIPT_PATH)) {
        throw new Error(`extract_entities.py not found at: ${EXTRACT_SCRIPT_PATH}`);
    }

    // Write text to a temp file to avoid command-line length limits
    const tmpFile = path.join(os.tmpdir(), `percepta_extract_${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, text, 'utf-8');

    return new Promise((resolve, reject) => {
        const args = [EXTRACT_SCRIPT_PATH, tmpFile, language || 'auto'];

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
                parsed = JSON.parse(stdout.trim());
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
                parsed = JSON.parse(stdout.trim());
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

// ── Summary builder ────────────────────────────────────────────
function buildSummary(text, lang, duration, confidence, intelligentSummary) {
    const mins = Math.floor(duration / 60);
    const secs = Math.round(duration % 60);
    const words = text.split(/\s+/).filter(Boolean).length;
    const LANG_NAMES = { fr: 'French', en: 'English', ar: 'Arabic' };
    const langLabel = LANG_NAMES[lang] || lang;

    const header = `Duration: ${mins}m ${secs}s  |  Language: ${langLabel}  |  ~${words} words  |  Confidence: ${confidence || 0}%`;

    if (intelligentSummary && intelligentSummary !== text) {
        return `${header}\n\nKey Highlights:\n${intelligentSummary}`;
    }

    const sentences = text.match(/[^.!?؟]+[.!?؟]+/g) || [];
    const preview = sentences.slice(0, 2).join(' ').trim();

    return `${header}\n\n${preview ? `Preview:\n${preview}` : ''}`;
}

module.exports = { processAudio };