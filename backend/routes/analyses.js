/**
 * analyses.js routes — UPDATED for async queue
 *
 * New endpoints added:
 *   GET  /api/analyses/:id/status         — Poll processing status
 *   POST /api/analyses/:id/retry          — Retry a failed analysis
 *   GET  /api/analyses/admin/queue-stats  — Queue health (Admin+)
 */

const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const authMiddleware = require('../middleware/authMiddleware');
const { adminOrAbove } = require('../middleware/roleMiddleware');
const { uploadAudio, uploadVideo, uploadGroupActivity } = require('../middleware/uploadMiddleware');

// ── Multer error handler helper ────────────────────────────────
const handleUpload = (uploadFn) => (req, res, next) => {
    uploadFn(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        next();
    });
};

// ── Admin / SuperAdmin routes ──────────────────────────────────
// NOTE: These MUST come before /:id routes to avoid "admin" being treated as an id
router.get('/admin/all', authMiddleware, adminOrAbove, analysisController.getAllAnalyses);
router.get('/admin/queue-stats', authMiddleware, adminOrAbove, analysisController.getQueueHealth);
router.get('/user/:userId', authMiddleware, adminOrAbove, analysisController.getUserAnalyses);

// ── Client upload routes ───────────────────────────────────────
router.post('/upload/audio', authMiddleware, handleUpload(uploadAudio), analysisController.uploadAudio);
router.post('/upload/video', authMiddleware, handleUpload(uploadVideo), analysisController.uploadVideo);
router.post('/upload/group', authMiddleware, handleUpload(uploadGroupActivity), analysisController.uploadGroupActivity);

// ── Client read / management routes ───────────────────────────
router.get('/', authMiddleware, analysisController.getMyAnalyses);
router.get('/:id', authMiddleware, analysisController.getAnalysisById);
router.get('/:id/status', authMiddleware, analysisController.getAnalysisStatus);
router.post('/:id/retry', authMiddleware, analysisController.retryAnalysis);
router.delete('/:id', authMiddleware, analysisController.deleteAnalysis);

module.exports = router;