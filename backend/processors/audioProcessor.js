/**
 * audioProcessor.js — Local Whisper via Python child process
 *
 * Works on Windows with Python in PATH.
 * Spawns whisper_transcribe.py, reads JSON from stdout.
 *
 * ENV variables you can set in backend/.env:
 *   WHISPER_PYTHON   path to python exe  (default: "python"  ← Windows default)
 *   WHISPER_SCRIPT   path to the .py file (default: auto-resolved)
 *   WHISPER_LANG     'fr'|'en'|'ar'|'auto'  (default: 'auto')
 *   WHISPER_TIMEOUT  ms before we kill the process  (default: 600000 = 10 min)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Config ─────────────────────────────────────────────────────
// Windows uses "python" not "python3"
const PYTHON_BIN = process.env.WHISPER_PYTHON || 'python';

const SCRIPT_PATH = process.env.WHISPER_SCRIPT ||
    path.join(__dirname, '..', 'scripts', 'whisper_transcribe.py');

const DEFAULT_LANG = process.env.WHISPER_LANG || 'auto';
const TIMEOUT_MS = parseInt(process.env.WHISPER_TIMEOUT || '600000');

// ── Main ───────────────────────────────────────────────────────
async function processAudio({ analysisId, filePath, job }) {
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

    await job.updateProgress(90);

    console.log(
        `✅ [AudioProcessor] Done — ` +
        `lang=${result.language}, ` +
        `duration=${result.duration}s, ` +
        `chars=${result.text.length}`
    );

    const summary = buildSummary(result.text, result.language, result.duration);

    await job.updateProgress(95);

    return { transcription: result.text, summary };
}

// ── Spawn Python ───────────────────────────────────────────────
function runWhisper(filePath, language) {
    return new Promise((resolve, reject) => {

        // On Windows paths often contain spaces — pass as array (no shell escaping needed)
        const args = [SCRIPT_PATH, filePath, language];

        console.log(`🐍 [AudioProcessor] Spawning: ${PYTHON_BIN} ${args.join(' ')}`);

        const proc = spawn(PYTHON_BIN, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
            // shell: false  ← default, don't change — avoids Windows quoting issues
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', chunk => { stdout += chunk.toString(); });

        proc.stderr.on('data', chunk => {
            const line = chunk.toString().trimEnd();
            stderr += line + '\n';
            // faster-whisper logs segment timestamps to stderr as it works
            // — useful to see progress in the worker terminal
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

            // Try to parse stdout regardless of exit code
            // (the script always prints JSON even for errors)
            let parsed;
            try {
                parsed = JSON.parse(stdout.trim());
            } catch (_) {
                // stdout wasn't JSON at all — show raw output
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
// Generates a lightweight summary without calling any AI.
// Replace with a GPT/Claude call later if you want smart summaries.
function buildSummary(text, lang, duration) {
    const mins = Math.floor(duration / 60);
    const secs = Math.round(duration % 60);
    const words = text.split(/\s+/).filter(Boolean).length;
    const LANG_NAMES = { fr: 'French', en: 'English', ar: 'Arabic' };
    const langLabel = LANG_NAMES[lang] || lang;

    // First 2 sentences as a preview
    const sentences = text.match(/[^.!?؟]+[.!?؟]+/g) || [];
    const preview = sentences.slice(0, 2).join(' ').trim();

    return (
        `Duration: ${mins}m ${secs}s  |  Language: ${langLabel}  |  ~${words} words\n\n` +
        (preview ? `Preview:\n${preview}` : '')
    );
}

module.exports = { processAudio };