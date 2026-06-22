/**
 * groupActivityProcessor.js — Processes group activity files (audio/video)
 * Delegates to audioProcessor or videoProcessor based on mimetype.
 */

const path = require('path');
const fs = require('fs');
const { processAudio } = require('./audioProcessor');
const { processVideo } = require('./videoProcessor');
const Analysis = require('../models/Analysis');

async function processGroupActivity({ analysisId, filePath, job, userId, userName, userEmail }) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const audioExts = ['.mp3', '.wav', '.m4a', '.ogg', '.mpeg', '.mpga', '.flac'];
    const videoExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];

    // Fetch analysis record to get originalName if not passed
    let originalName = path.basename(filePath);
    let resolvedUserId = userId;
    try {
        const analysis = await Analysis.findById(analysisId).select('originalName userId');
        if (analysis) {
            originalName = analysis.originalName || originalName;
            resolvedUserId = String(analysis.userId);
        }
    } catch (_) { }

    if (audioExts.includes(ext)) {
        console.log(`🎵 [GroupActivityProcessor] Delegating to audioProcessor for: ${originalName}`);
        return processAudio({
            analysisId,
            filePath,
            job,
            userId: resolvedUserId,
            userName: userName || 'User',
            userEmail: userEmail || '',
            originalName,
            translateTo: '',
        });
    }

    if (videoExts.includes(ext)) {
        console.log(`🎬 [GroupActivityProcessor] Delegating to videoProcessor for: ${originalName}`);
        return processVideo({
            analysisId,
            filePath,
            job,
            userId: resolvedUserId,
            userName: userName || 'User',
            userEmail: userEmail || '',
            originalName,
        });
    }

    // Fallback: try audio
    console.warn(`⚠️  [GroupActivityProcessor] Unknown extension "${ext}" — attempting audio processing`);
    return processAudio({
        analysisId,
        filePath,
        job,
        userId: resolvedUserId,
        userName: userName || 'User',
        userEmail: userEmail || '',
        originalName,
        translateTo: '',
    });
}

module.exports = { processGroupActivity };