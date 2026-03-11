const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passwordResetController = require('../controllers/passwordResetController');

router.post('/login', authController.login);
router.post('/forgot-password', passwordResetController.forgotPassword);
router.post('/verify-reset-code', passwordResetController.verifyResetCode);
router.post('/reset-password', passwordResetController.resetPassword);

module.exports = router;