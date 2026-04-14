/**
 * videoProcessor.js — Real YOLO-based video incident detection
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateVideoReportPDF } = require('../utils/videoReportGenerator');

const PYTHON_BIN = process.env.WHISPER_PYTHON || 'python';
const SCRIPT_PATH = process.env.VIDEO_SCRIPT ||
    path.join(__dirname, '..', 'scripts', 'video_analyze.py');
const TIMEOUT_MS = parseInt(process.env.VIDEO_TIMEOUT || '1800000'); // 30 min

async function processVideo({ analysisId, filePath, job, userId, userName, userEmail, originalName }) {
    console.log(`🎬 [VideoProcessor] Starting for: ${path.basename(filePath)}`);

    if (!fs.existsSync(filePath)) throw new Error(`Video not found: ${filePath}`);
    if (!fs.existsSync(SCRIPT_PATH)) throw new Error(`video_analyze.py not found at: ${SCRIPT_PATH}`);

    await job.updateProgress(5);

    // Output dir for keyframes
    const framesDir = path.join(
        __dirname, '..', 'uploads',
        String(userId || 'unknown'), 'video_frames', String(analysisId)
    );
    fs.mkdirSync(framesDir, { recursive: true });

    await job.updateProgress(10);

    // Run Python detection
    const raw = await runPythonScript(filePath, framesDir, job);

    await job.updateProgress(75);

    let videoResult;
    try {
        videoResult = JSON.parse(raw);
    } catch (_) {
        throw new Error(`video_analyze.py returned non-JSON: ${raw.substring(0, 300)}`);
    }

    if (videoResult.error) throw new Error(videoResult.error);

    await job.updateProgress(80);

    // Build text transcription (incident log)
    const transcription = buildIncidentLog(videoResult);
    const summary = videoResult.summary || 'Analysis complete.';

    // Generate PDF with keyframe images
    let pdfPath = '';
    try {
        const pdfOutputDir = path.join(__dirname, '..', 'uploads', String(userId || 'unknown'), 'reports');
        pdfPath = await generateVideoReportPDF({
            analysisId: String(analysisId),
            originalName: originalName || path.basename(filePath),
            videoResult,
            userName: userName || 'User',
            userEmail: userEmail || '',
            createdAt: new Date(),
            outputDir: pdfOutputDir,
        });
        console.log(`📄 [VideoProcessor] PDF generated: ${path.basename(pdfPath)}`);
    } catch (err) {
        console.error(`⚠️  [VideoProcessor] PDF generation failed:`, err.message);
    }

    await job.updateProgress(95);

    return {
        transcription,
        summary,
        pdfPath,
        videoResult,   // stored on Analysis doc as videoAnalysisData
    };
}

function runPythonScript(filePath, framesDir, job) {
    return new Promise((resolve, reject) => {
        const proc = spawn(PYTHON_BIN, [SCRIPT_PATH, filePath, framesDir], {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', chunk => { stdout += chunk.toString(); });
        proc.stderr.on('data', chunk => {
            const line = chunk.toString().trimEnd();
            stderr += line + '\n';
            // Progress updates from YOLO
            if (line.includes('frame')) process.stdout.write(`  [YOLO] ${line}\n`);
        });

        const timer = setTimeout(() => {
            proc.kill();
            reject(new Error(`Video analysis timed out after ${TIMEOUT_MS / 60000} minutes.`));
        }, TIMEOUT_MS);

        proc.on('close', code => {
            clearTimeout(timer);
            if (code !== 0 && !stdout.includes('"incidents"')) {
                reject(new Error(`Script failed (exit ${code}): ${stderr.slice(0, 400)}`));
            } else {
                resolve(stdout.trim());
            }
        });

        proc.on('error', err => {
            clearTimeout(timer);
            reject(new Error(`Failed to spawn Python: ${err.message}`));
        });
    });
}

function buildIncidentLog(result) {
    const lines = [];
    const incidents = result.incidents || [];
    const keyframes = result.keyframes || [];

    lines.push(`=== VIDEO INCIDENT ANALYSIS REPORT ===`);
    lines.push(`Duration: ${secondsToHMS(result.duration || 0)}  |  FPS: ${result.fps || 0}  |  Resolution: ${result.resolution || '—'}`);
    lines.push(`Detection model: ${result.detection_model || 'unknown'}`);
    lines.push('');

    if (incidents.length === 0) {
        lines.push('NO INCIDENTS DETECTED');
    } else {
        lines.push(`INCIDENTS DETECTED: ${incidents.length}`);
        lines.push('');
        incidents.forEach((inc, i) => {
            const ts = inc.timestamp_str || secondsToHMS(inc.timestamp || 0);
            const sev = (inc.severity || 'medium').toUpperCase();
            lines.push(`[${i + 1}] ${inc.type?.toUpperCase() || 'UNKNOWN'}  —  ${sev}  @  ${ts}`);
            if (inc.details) lines.push(`    ${inc.details}`);
        });
    }

    lines.push('');
    lines.push(`KEYFRAMES EXTRACTED: ${keyframes.length}`);

    return lines.join('\n');
}

function secondsToHMS(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

module.exports = { processVideo };