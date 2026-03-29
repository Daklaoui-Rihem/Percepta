/**
 * audioProcessor.js — Local Whisper via Python child process
 *                     + automatic PDF report generation
 *
 * Works on Windows with Python in PATH.
 * Spawns whisper_transcribe.py, reads JSON from stdout,
 * then generates a PDF report via pdfReportGenerator.
 *
 * ENV variables:
 *   WHISPER_PYTHON   path to python exe  (default: "python")
 *   WHISPER_SCRIPT   path to the .py file (default: auto-resolved)
 *   WHISPER_LANG     'fr'|'en'|'ar'|'auto'  (default: 'auto')
 *   WHISPER_TIMEOUT  ms before we kill the process  (default: 600000)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { generateTranscriptionPDF } = require('../utils/pdfReportGenerator');

// ── Config ─────────────────────────────────────────────────────
const PYTHON_BIN = process.env.WHISPER_PYTHON || 'python';

const SCRIPT_PATH = process.env.WHISPER_SCRIPT ||
    path.join(__dirname, '..', 'scripts', 'whisper_transcribe.py');

const DEFAULT_LANG = process.env.WHISPER_LANG || 'auto';
const TIMEOUT_MS = parseInt(process.env.WHISPER_TIMEOUT || '600000');

// ── Main ───────────────────────────────────────────────────────
async function processAudio({ analysisId, filePath, job, userId, userName, userEmail, originalName }) {
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

    await job.updateProgress(85);

    console.log(
        `✅ [AudioProcessor] Whisper done — ` +
        `lang=${result.language}, ` +
        `duration=${result.duration}s, ` +
        `chars=${result.text.length}`
    );

    const summary = buildSummary(result.text, result.language, result.duration, result.confidence, result.summary);

    await job.updateProgress(90);

    // ── Generate PDF report ────────────────────────────────────
    let pdfPath = '';
    try {
        const pdfOutputDir = path.join(__dirname, '..', 'uploads', String(userId || 'unknown'), 'reports');
        pdfPath = await generateTranscriptionPDF({
            analysisId: String(analysisId),
            originalName: originalName || path.basename(filePath),
            transcription: result.text,
            summary,
            userName: userName || 'User',
            userEmail: userEmail || '',
            createdAt: new Date(),
            outputDir: pdfOutputDir,
        });
        console.log(`📄 [AudioProcessor] PDF report generated: ${path.basename(pdfPath)}`);
    } catch (pdfErr) {
        // PDF generation failure is non-fatal — transcription still succeeds
        console.error(`⚠️  [AudioProcessor] PDF generation failed:`, pdfErr.message);
    }

    await job.updateProgress(95);

    return { transcription: result.text, summary, pdfPath };
}

// ── Spawn Python ───────────────────────────────────────────────
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
            reject(new Error(
                `Whisper timed out after ${TIMEOUT_MS / 1000}s. ` +
                `The file may be very long. Increase WHISPER_TIMEOUT in .env.`
            ));
        }, TIMEOUT_MS);

        proc.on('close', code => {
            clearTimeout(timer);

            let parsed;
            try {
                parsed = JSON.parse(stdout.trim());
            } catch (_) {
                return reject(new Error(
                    `Whisper returned non-JSON output (exit ${code}).\n` +
                    `stdout: ${stdout.slice(0, 400)}\n` +
                    `stderr: ${stderr.slice(0, 400)}`
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
                reject(new Error(
                    `Python not found: "${PYTHON_BIN}"\n\n` +
                    `Fix options:\n` +
                    `  1. Add Python to your Windows PATH (reopen terminal after)\n` +
                    `  2. Set WHISPER_PYTHON=C:\\Python311\\python.exe in backend/.env`
                ));
            } else {
                reject(err);
            }
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

    return (
        `${header}\n\n` +
        (preview ? `Preview:\n${preview}` : '')
    );
}

module.exports = { processAudio };