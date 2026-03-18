const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { adminOrAbove, superAdminOnly } = require('../middleware/roleMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');


// ── My Profile (any authenticated user) ───────────────────────
router.get('/me', authMiddleware, userController.getMyProfile);
router.put('/me', authMiddleware, userController.updateMyProfile);
router.post('/me/avatar', authMiddleware, (req, res, next) => {
    uploadAvatar(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        next();
    });
}, userController.uploadAvatar);
router.put('/me/password', authMiddleware, userController.changeMyPassword);

// ── User management (Admin creates Clients, SuperAdmin creates Admins) ──
router.get('/check-email', authMiddleware, adminOrAbove, userController.checkEmail);
router.post('/create', authMiddleware, adminOrAbove, userController.createUser);
router.get('/', authMiddleware, adminOrAbove, userController.getAllUsers);
router.post('/bulk-delete', authMiddleware, adminOrAbove, userController.bulkDeleteUsers);
router.post('/bulk-update', authMiddleware, adminOrAbove, userController.bulkUpdateUsers);
router.get('/:id', authMiddleware, adminOrAbove, userController.getUserById);
router.put('/:id', authMiddleware, adminOrAbove, userController.updateUser);
router.delete('/:id', authMiddleware, adminOrAbove, userController.deleteUser);

module.exports = router;