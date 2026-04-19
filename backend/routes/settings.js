const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/roleMiddleware');

// SMTP settings — SuperAdmin only
router.get('/smtp', authMiddleware, superAdminOnly, settingsController.getSmtp);
router.put('/smtp', authMiddleware, superAdminOnly, settingsController.saveSmtp);
router.post('/smtp/test', authMiddleware, superAdminOnly, settingsController.testSmtp);

// Transcription engine — SuperAdmin only
router.get('/transcription', authMiddleware, superAdminOnly, settingsController.getTranscription);
router.put('/transcription', authMiddleware, superAdminOnly, settingsController.saveTranscription);

module.exports = router;