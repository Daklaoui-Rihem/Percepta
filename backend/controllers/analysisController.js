/**
 * analysisController.js — Updated with extractedEntities support
 *
 * Changes:
 *  - uploadAudio stores extractedEntities after processing
 *  - getAnalysisStatus returns extractedEntities when done
 *  - getMyAnalyses returns extractedEntities
 *  - generateReport passes extractedEntities to PDF generator
 */

const Analysis = require('../models/Analysis');
const { addAnalysisJob, getQueueStats } = require('../queue');
const { processAudio } = require('../processors/audioProcessor');
const { processVideo } = require('../processors/videoProcessor');
const { processGroupActivity } = require('../processors/groupActivityProcessor');
const path = require('path');
const fs = require('fs');

// ── In-process fallback (when Redis is unavailable) ────────────
async function processInBackground(analysisId, type, filePath, userId, translateTo = '') {
    const fakeJob = { updateProgress: async () => { } };
    try {
        await Analysis.findByIdAndUpdate(analysisId, { status: 'processing' });

        let result;
        const analysis = await Analysis.findById(analysisId);

        if (type === 'audio') {
            result = await processAudio({
                analysisId,
                filePath,
                job: fakeJob,
                userId: String(userId),
                originalName: analysis?.originalName || path.basename(filePath),
                translateTo,
            });
        } else if (type === 'video') {
            result = await processVideo({ analysisId, filePath, job: fakeJob });
        } else {
            result = await processGroupActivity({ analysisId, filePath, job: fakeJob });
        }

        await Analysis.findByIdAndUpdate(analysisId, {
            status: 'done',
            transcription: result.transcription,
            summary: result.summary,
            translatedText: result.translatedText || '',
            translationLang: result.translationLang || '',
            extractedEntities: result.extractedEntities || null,   // ← NEW
            pdfPath: result.pdfPath || '',
            pdfGeneratedAt: result.pdfPath ? new Date() : null,
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
async function dispatchJob(analysisId, type, filePath, userId, translateTo = '') {
    try {
        const { addAnalysisJobWithOptions } = require('../queue');
        const job = await addAnalysisJobWithOptions(analysisId, type, filePath, { translateTo });
        console.log(`📥 [Queue] Job dispatched: ${job.id}`);
        return { jobId: job.id, mode: 'queue' };
    } catch (redisErr) {
        console.warn(`⚠️  [Queue] Redis unavailable. Falling back to in-process.`);
        setImmediate(() => processInBackground(analysisId, type, filePath, userId, translateTo));
        return { jobId: null, mode: 'in-process' };
    }
}

// ── Upload Audio ───────────────────────────────────────────────
exports.uploadAudio = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const translateTo = req.body.translateTo || '';

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
            translationLang: translateTo || '',
        });

        const dispatch = await dispatchJob(String(analysis._id), 'audio', req.file.path, req.user.id, translateTo);

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
exports.uploadVideo = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

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

        const dispatch = await dispatchJob(String(analysis._id), 'video', req.file.path, req.user.id);

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
exports.uploadGroupActivity = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

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

        const dispatch = await dispatchJob(String(analysis._id), 'groupActivity', req.file.path, req.user.id);

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
exports.getMyAnalyses = async (req, res) => {
    try {
        const analyses = await Analysis.find({ userId: req.user.id })
            .select('-filePath')
            .sort({ createdAt: -1 });

        const result = analyses.map(a => ({
            ...a.toObject(),
            hasPdf: !!(a.pdfPath && fs.existsSync(a.pdfPath)),
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Get Single Analysis ────────────────────────────────────────
exports.getAnalysisById = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id);

        if (!analysis) return res.status(404).json({ message: 'Analysis not found' });

        if (String(analysis.userId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({
            ...analysis.toObject(),
            hasPdf: !!(analysis.pdfPath && fs.existsSync(analysis.pdfPath)),
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Poll Analysis Status ───────────────────────────────────────
exports.getAnalysisStatus = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id)
            .select('status errorMessage transcription translatedText translationLang summary pdfPath pdfGeneratedAt extractedEntities');

        if (!analysis) return res.status(404).json({ message: 'Analysis not found' });

        const hasPdf = !!(analysis.pdfPath && fs.existsSync(analysis.pdfPath));

        res.json({
            id: req.params.id,
            status: analysis.status,
            errorMessage: analysis.errorMessage || null,
            transcription: analysis.status === 'done' ? analysis.transcription : null,
            translatedText: analysis.status === 'done' ? (analysis.translatedText || null) : null,
            translationLang: analysis.status === 'done' ? (analysis.translationLang || null) : null,
            summary: analysis.status === 'done' ? analysis.summary : null,
            // ── NEW: extracted entities ──────────────────────────
            extractedEntities: analysis.status === 'done' ? (analysis.extractedEntities || null) : null,
            hasPdf: analysis.status === 'done' ? hasPdf : false,
            pdfGeneratedAt: analysis.pdfGeneratedAt || null,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Download PDF Report ────────────────────────────────────────
exports.downloadReport = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id);

        if (!analysis) return res.status(404).json({ message: 'Analysis not found' });

        if (String(analysis.userId) !== String(req.user.id)) {
            if (
                req.user.role === 'SuperAdmin' ||
                (req.user.role === 'Admin' && String(analysis.tenantId) === String(req.user.id))
            ) {
                // allowed
            } else {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        if (!analysis.pdfPath) {
            return res.status(404).json({ message: 'PDF report not yet generated for this analysis.' });
        }

        if (!fs.existsSync(analysis.pdfPath)) {
            return res.status(410).json({ message: 'PDF file no longer exists on disk.' });
        }

        const safeName = analysis.originalName
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 40);

        const downloadName = `Percepta_Report_${safeName}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);

        const fileStream = fs.createReadStream(analysis.pdfPath);
        fileStream.pipe(res);

        fileStream.on('error', () => {
            res.status(500).json({ message: 'Error reading PDF file' });
        });

    } catch (error) {
        console.error('Download report error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Regenerate PDF ────────────────────────────────────────────
exports.generateReport = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id);

        if (!analysis) return res.status(404).json({ message: 'Analysis not found' });

        if (String(analysis.userId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (analysis.status !== 'done') {
            return res.status(400).json({ message: 'Analysis must be completed before generating a report.' });
        }

        if (!analysis.transcription) {
            return res.status(400).json({ message: 'No transcription data available.' });
        }

        const { generateTranscriptionPDF } = require('../utils/Pdfreportgenerator');
        const User = require('../models/User');

        let userName = 'User';
        let userEmail = '';
        try {
            const user = await User.findById(analysis.userId).select('name email');
            if (user) { userName = user.name; userEmail = user.email; }
        } catch (_) { }

        const pdfOutputDir = path.join(__dirname, '..', 'uploads', String(analysis.userId), 'reports');

        const pdfPath = await generateTranscriptionPDF({
            analysisId: String(analysis._id),
            originalName: analysis.originalName,
            transcription: analysis.transcription,
            translatedText: analysis.translatedText,
            translationLang: analysis.translationLang,
            summary: analysis.summary,
            extractedEntities: analysis.extractedEntities || null,   // ← NEW
            userName,
            userEmail,
            createdAt: analysis.createdAt,
            outputDir: pdfOutputDir,
        });

        await Analysis.findByIdAndUpdate(req.params.id, {
            pdfPath,
            pdfGeneratedAt: new Date(),
        });

        res.json({
            message: 'PDF report generated successfully.',
            hasPdf: true,
        });
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({ message: 'Failed to generate PDF report: ' + error.message });
    }
};

// ── Retry Failed Analysis ──────────────────────────────────────
exports.retryAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id);

        if (!analysis) return res.status(404).json({ message: 'Analysis not found' });

        if (String(analysis.userId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (analysis.status !== 'error') {
            return res.status(400).json({
                message: `Cannot retry analysis with status '${analysis.status}'. Only 'error' status can be retried.`,
            });
        }

        if (!fs.existsSync(analysis.filePath)) {
            return res.status(410).json({ message: 'Original file no longer exists. Please re-upload.' });
        }

        await Analysis.findByIdAndUpdate(req.params.id, {
            status: 'pending',
            errorMessage: '',
            extractedEntities: null,   // ← Reset on retry
        });

        const job = await addAnalysisJob(String(analysis._id), analysis.type, analysis.filePath);

        res.json({
            message: 'Analysis re-queued successfully.',
            queue: { jobId: job.id },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Queue Health Stats ─────────────────────────────────────────
exports.getQueueHealth = async (req, res) => {
    try {
        const stats = await getQueueStats();
        res.json({ queue: 'analysis', stats });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Get All Analyses (Admin) ───────────────────────────────────
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

// ── Get User's Analyses (Admin/SuperAdmin) ─────────────────────
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
exports.deleteAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id);

        if (!analysis) return res.status(404).json({ message: 'Analysis not found' });

        if (String(analysis.userId) !== String(req.user.id) && req.user.role === 'Client') {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (analysis.filePath && fs.existsSync(analysis.filePath)) {
            fs.unlinkSync(analysis.filePath);
        }

        if (analysis.pdfPath && fs.existsSync(analysis.pdfPath)) {
            fs.unlinkSync(analysis.pdfPath);
        }

        await Analysis.findByIdAndDelete(req.params.id);
        res.json({ message: 'Analysis deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Get Video Result ───────────────────────────────────────────
exports.getVideoResult = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id)
            .select('status videoAnalysisData userId');

        if (!analysis) return res.status(404).json({ message: 'Analysis not found' });

        if (String(analysis.userId) !== String(req.user.id) &&
            req.user.role === 'Client') {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({
            status: analysis.status,
            videoAnalysisData: analysis.videoAnalysisData || null,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};