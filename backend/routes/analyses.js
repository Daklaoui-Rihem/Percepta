/**
 * analyses.js routes — Updated with PDF report endpoints
 *
 * Endpoints:
 *   GET  /api/analyses/:id/report          — Download PDF report
 *   POST /api/analyses/:id/report/generate — Force-regenerate PDF
 *   GET  /api/analyses/:id/status          — Poll status (now includes hasPdf)
 *   POST /api/analyses/:id/retry           — Retry failed analysis
 *   GET  /api/analyses/admin/queue-stats   — Queue health (Admin+)
 */

const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const authMiddleware = require('../middleware/authMiddleware');
const { adminOrAbove } = require('../middleware/roleMiddleware');
const { uploadAudio, uploadVideo, uploadGroupActivity } = require('../middleware/uploadMiddleware');

// ── Multer error handler ───────────────────────────────────────
const handleUpload = (uploadFn) => (req, res, next) => {
    uploadFn(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        next();
    });
};

// ── Admin / SuperAdmin routes ──────────────────────────────────
// NOTE: Must come BEFORE /:id routes
router.get('/admin/all', authMiddleware, adminOrAbove, analysisController.getAllAnalyses);
router.get('/admin/queue-stats', authMiddleware, adminOrAbove, analysisController.getQueueHealth);
router.get('/user/:userId', authMiddleware, adminOrAbove, analysisController.getUserAnalyses);

// ── Upload routes ──────────────────────────────────────────────
router.post('/upload/audio', authMiddleware, handleUpload(uploadAudio), analysisController.uploadAudio);
router.post('/upload/video', authMiddleware, handleUpload(uploadVideo), analysisController.uploadVideo);
router.post('/upload/group', authMiddleware, handleUpload(uploadGroupActivity), analysisController.uploadGroupActivity);

// ── Client list ────────────────────────────────────────────────
router.get('/', authMiddleware, analysisController.getMyAnalyses);

// ── Per-analysis routes ────────────────────────────────────────
router.get('/:id', authMiddleware, analysisController.getAnalysisById);
router.get('/:id/status', authMiddleware, analysisController.getAnalysisStatus);
router.post('/:id/retry', authMiddleware, analysisController.retryAnalysis);
router.delete('/:id', authMiddleware, analysisController.deleteAnalysis);

// PDF report endpoints
router.get('/:id/report', authMiddleware, analysisController.downloadReport);
router.post('/:id/report/generate', authMiddleware, analysisController.generateReport);

router.get('/:id/video-result', authMiddleware, analysisController.getVideoResult);
router.get('/:id/keyframe/:filename', authMiddleware, analysisController.serveKeyframe);

module.exports = router;