const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// ── Role guards ────────────────────────────────────────────────
function adminOrAbove(req, res, next) {
    if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}

function superAdminOnly(req, res, next) {
    if (req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ message: 'SuperAdmin access required' });
    }
    next();
}

// ── My Profile (any authenticated user) ───────────────────────
router.get('/me', authMiddleware, userController.getMyProfile);
router.put('/me', authMiddleware, userController.updateMyProfile);
router.put('/me/password', authMiddleware, userController.changeMyPassword);

// ── User management (Admin creates Clients, SuperAdmin creates Admins) ──
router.post('/create', authMiddleware, adminOrAbove, userController.createUser);
router.get('/', authMiddleware, adminOrAbove, userController.getAllUsers);
router.get('/:id', authMiddleware, adminOrAbove, userController.getUserById);
router.put('/:id', authMiddleware, adminOrAbove, userController.updateUser);
router.delete('/:id', authMiddleware, adminOrAbove, userController.deleteUser);

module.exports = router;