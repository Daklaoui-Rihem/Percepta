const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const authMiddleware = require('../middleware/authMiddleware');
const { adminOrAbove } = require('../middleware/roleMiddleware');
const { uploadAudio, uploadVideo } = require('../middleware/uploadMiddleware');


// ── Multer error handler helper ────────────────────────────────
const handleUpload = (uploadFn) => (req, res, next) => {
    uploadFn(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

// ── Client routes ──────────────────────────────────────────────
router.post('/upload/audio', authMiddleware, handleUpload(uploadAudio), analysisController.uploadAudio);
router.post('/upload/video', authMiddleware, handleUpload(uploadVideo), analysisController.uploadVideo);
router.get('/', authMiddleware, analysisController.getMyAnalyses);
router.get('/:id', authMiddleware, analysisController.getAnalysisById);
router.delete('/:id', authMiddleware, analysisController.deleteAnalysis);

// ── Admin / SuperAdmin routes ──────────────────────────────────
router.get('/admin/all', authMiddleware, adminOrAbove, analysisController.getAllAnalyses);
router.get('/user/:userId', authMiddleware, adminOrAbove, analysisController.getUserAnalyses);

module.exports = router;