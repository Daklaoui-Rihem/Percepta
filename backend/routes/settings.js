const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/roleMiddleware');

// Only SuperAdmin can view/edit SMTP settings
router.get('/smtp', authMiddleware, superAdminOnly, settingsController.getSmtp);
router.put('/smtp', authMiddleware, superAdminOnly, settingsController.saveSmtp);
router.post('/smtp/test', authMiddleware, superAdminOnly, settingsController.testSmtp);

module.exports = router;