const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { adminOrAbove, superAdminOnly } = require('../middleware/roleMiddleware');


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