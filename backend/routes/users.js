const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');


function adminOnly(req, res, next) {
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}

router.post('/create', authMiddleware, adminOnly, userController.createUser);

router.get('/', authMiddleware, adminOnly, userController.getAllUsers);

router.delete('/:id', authMiddleware, adminOnly, userController.deleteUser);

module.exports = router;
