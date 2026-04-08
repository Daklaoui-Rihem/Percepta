/**
 * audioProcessor.js — Local Whisper + optional translation
 *
 * After transcription, if a `translateTo` language is provided,
 * calls translate_text.py to produce a translated version.
 *
 * ENV variables:
 *   WHISPER_PYTHON   path to python exe  (default: "python")
 *   WHISPER_SCRIPT   path to whisper_transcribe.py
 *   WHISPER_LANG     'fr'|'en'|'ar'|'auto'  (default: 'auto')
 *   WHISPER_TIMEOUT  ms before we kill the process  (default: 600000)
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

    const result = await runWhisper(filePath, DEFAULT_LANG);

    await job.updateProgress(75);

    console.log(
        `✅ [AudioProcessor] Whisper done — ` +
        `lang=${result.language}, ` +
        `duration=${result.duration}s, ` +
        `chars=${result.text.length}`
    );

    const summary = buildSummary(result.text, result.language, result.duration, result.confidence, result.summary);

    // ── Optional Translation ───────────────────────────────────
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
            // Translation failure is non-fatal — transcription still succeeds
            console.error(`⚠️  [AudioProcessor] Translation failed:`, translErr.message);
        }
    } else if (translateTo && translateTo === result.language) {
        console.log(`ℹ️  [AudioProcessor] Source and target language are the same (${result.language}), skipping translation.`);
    }

    await job.updateProgress(85);

    // ── Generate PDF report ────────────────────────────────────
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

    return { transcription: result.text, summary, pdfPath, translatedText, translationLang };
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

// ── Run Translation Script ─────────────────────────────────────
async function runTranslation(text, sourceLang, targetLang) {
    if (!fs.existsSync(TRANSLATE_SCRIPT_PATH)) {
        throw new Error(`translate_text.py not found at: ${TRANSLATE_SCRIPT_PATH}`);
    }

    // Write text to a temp file to avoid command-line length limits
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

        // 5-minute timeout for translation
        const timer = setTimeout(() => {
            proc.kill();
            fs.unlink(tmpFile, () => {});
            reject(new Error('Translation timed out after 5 minutes.'));
        }, 5 * 60 * 1000);

        proc.on('close', code => {
            clearTimeout(timer);
            fs.unlink(tmpFile, () => {}); // cleanup temp file

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