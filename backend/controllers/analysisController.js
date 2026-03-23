/**
 * analysisController.js  — UPDATED for async queue processing
 *
 * Changes from the original:
 *  - uploadAudio / uploadVideo / uploadGroupActivity now call addAnalysisJob()
 *    immediately after saving the DB record, then return 202 Accepted.
 *  - Express is NEVER blocked by AI processing.
 *  - Added getAnalysisStatus() for polling, and retryAnalysis() for manual retry.
 */

const Analysis = require('../models/Analysis');
const { addAnalysisJob, getQueueStats } = require('../queue');
const { processAudio } = require('../processors/audioProcessor');
const { processVideo } = require('../processors/videoProcessor');
const { processGroupActivity } = require('../processors/groupActivityProcessor');
const path = require('path');
const fs = require('fs');

const ALLOWED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/x-m4a'];

// ── In-process fallback processor ─────────────────────────────
// Used when Redis is not available. Runs the processor directly
// in the Express process (fire-and-forget, no blocking).
async function processInBackground(analysisId, type, filePath) {
    const fakeJob = { updateProgress: async () => {} };
    try {
        await Analysis.findByIdAndUpdate(analysisId, { status: 'processing' });

        let result;
        if (type === 'audio')         result = await processAudio({ analysisId, filePath, job: fakeJob });
        else if (type === 'video')    result = await processVideo({ analysisId, filePath, job: fakeJob });
        else                          result = await processGroupActivity({ analysisId, filePath, job: fakeJob });

        await Analysis.findByIdAndUpdate(analysisId, {
            status: 'done',
            transcription: result.transcription,
            summary: result.summary,
            errorMessage: '',
        });
        console.log(`✅ [In-process] Analysis done for ${analysisId}`);
    } catch (err) {
        await Analysis.findByIdAndUpdate(analysisId, {
            status: 'error',
            errorMessage: err.message || 'Processing failed',
        });
        console.error(`❌ [In-process] Analysis failed for ${analysisId}:`, err.message);
    }
}

// ── Try queue, fall back to in-process ────────────────────────
async function dispatchJob(analysisId, type, filePath) {
    try {
        const job = await addAnalysisJob(analysisId, type, filePath);
        console.log(`📥 [Queue] Job dispatched: ${job.id}`);
        return { jobId: job.id, mode: 'queue' };
    } catch (redisErr) {
        console.warn(`⚠️  [Queue] Redis unavailable (${redisErr.message}). Falling back to in-process.`);
        // Run in background — don't await, don't block the response
        setImmediate(() => processInBackground(analysisId, type, filePath));
        return { jobId: null, mode: 'in-process' };
    }
}

// ── Upload Audio ───────────────────────────────────────────────
// POST /api/analyses/upload/audio
exports.uploadAudio = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // 1. Persist analysis record (status: 'pending')
        const analysis = await Analysis.create({
            userId: req.user.id,
            tenantId: req.user.tenantId || null,
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            type: 'audio',
            status: 'pending',
            filePath: req.file.path,
        });

        // 2. Dispatch — tries Redis queue, falls back to in-process
        const dispatch = await dispatchJob(String(analysis._id), 'audio', req.file.path);

        res.status(202).json({
            message: 'Audio uploaded. Transcription queued.',
            analysis: {
                id: analysis._id,
                originalName: analysis.originalName,
                size: analysis.size,
                status: analysis.status,
                createdAt: analysis.createdAt,
            },
            queue: dispatch,
        });
    } catch (error) {
        console.error('Audio upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
};

// ── Upload Video ───────────────────────────────────────────────
// POST /api/analyses/upload/video
exports.uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const analysis = await Analysis.create({
            userId: req.user.id,
            tenantId: req.user.tenantId || null,
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            type: 'video',
            status: 'pending',
            filePath: req.file.path,
        });

        const dispatch = await dispatchJob(String(analysis._id), 'video', req.file.path);

        res.status(202).json({
            message: 'Video uploaded. Analysis queued.',
            analysis: {
                id: analysis._id,
                originalName: analysis.originalName,
                size: analysis.size,
                status: analysis.status,
                createdAt: analysis.createdAt,
            },
            queue: dispatch,
        });
    } catch (error) {
        console.error('Video upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
};

// ── Upload Group Activity ──────────────────────────────────────
// POST /api/analyses/upload/group
exports.uploadGroupActivity = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const analysis = await Analysis.create({
            userId: req.user.id,
            tenantId: req.user.tenantId || null,
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            type: 'groupActivity',
            status: 'pending',
            filePath: req.file.path,
        });

        const dispatch = await dispatchJob(String(analysis._id), 'groupActivity', req.file.path);

        res.status(202).json({
            message: 'Group activity uploaded. Analysis queued.',
            analysis: {
                id: analysis._id,
                originalName: analysis.originalName,
                size: analysis.size,
                status: analysis.status,
                createdAt: analysis.createdAt,
            },
            queue: dispatch,
        });
    } catch (error) {
        console.error('Group activity upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
};

// ── Get My Analyses (history) ──────────────────────────────────
// GET /api/analyses
exports.getMyAnalyses = async (req, res) => {
    try {
        const analyses = await Analysis.find({ userId: req.user.id })
            .select('-filePath')
            .sort({ createdAt: -1 });

        res.json(analyses);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Get Single Analysis ────────────────────────────────────────
// GET /api/analyses/:id
exports.getAnalysisById = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id);

        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found' });
        }

        if (String(analysis.userId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(analysis);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Poll Analysis Status (new) ─────────────────────────────────
// GET /api/analyses/:id/status
// Lightweight endpoint — only returns id + status + progress fields.
// The frontend polls this every few seconds until status === 'done'.
exports.getAnalysisStatus = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id)
            .select('status errorMessage transcription summary');

        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found' });
        }

        res.json({
            id: req.params.id,
            status: analysis.status,
            errorMessage: analysis.errorMessage || null,
            // Only send these when done — avoids large payloads during polling
            transcription: analysis.status === 'done' ? analysis.transcription : null,
            summary: analysis.status === 'done' ? analysis.summary : null,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Retry Failed Analysis (new) ────────────────────────────────
// POST /api/analyses/:id/retry
// Allows manual retry of a failed analysis without re-uploading.
exports.retryAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id);

        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found' });
        }

        if (String(analysis.userId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (analysis.status !== 'error') {
            return res.status(400).json({
                message: `Cannot retry analysis with status '${analysis.status}'. Only 'error' status can be retried.`,
            });
        }

        if (!fs.existsSync(analysis.filePath)) {
            return res.status(410).json({
                message: 'Original file no longer exists. Please re-upload.',
            });
        }

        // Reset status to pending
        await Analysis.findByIdAndUpdate(req.params.id, {
            status: 'pending',
            errorMessage: '',
        });

        // Re-queue
        const job = await addAnalysisJob(
            String(analysis._id),
            analysis.type,
            analysis.filePath
        );

        res.json({
            message: 'Analysis re-queued successfully.',
            queue: { jobId: job.id },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Queue Health Stats (Admin/SuperAdmin) ──────────────────────
// GET /api/analyses/admin/queue-stats
exports.getQueueHealth = async (req, res) => {
    try {
        const stats = await getQueueStats();
        res.json({ queue: 'analysis', stats });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Get All Analyses (Admin sees their clients') ───────────────
// GET /api/analyses/admin/all
exports.getAllAnalyses = async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'Admin') {
            filter = { tenantId: req.user.id };
        }

        const analyses = await Analysis.find(filter)
            .select('-filePath')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.json(analyses);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Get User's Analyses (Admin/SuperAdmin) ──────────────────────
// GET /api/analyses/user/:userId
exports.getUserAnalyses = async (req, res) => {
    try {
        const { userId } = req.params;
        let filter = { userId };

        if (req.user.role === 'Admin') {
            filter.tenantId = req.user.id;
        }

        const analyses = await Analysis.find(filter)
            .select('-filePath')
            .sort({ createdAt: -1 });

        res.json(analyses);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Delete Analysis ────────────────────────────────────────────
// DELETE /api/analyses/:id
exports.deleteAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id);

        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found' });
        }

        if (String(analysis.userId) !== String(req.user.id) && req.user.role === 'Client') {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (fs.existsSync(analysis.filePath)) {
            fs.unlinkSync(analysis.filePath);
        }

        await Analysis.findByIdAndDelete(req.params.id);
        res.json({ message: 'Analysis deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};