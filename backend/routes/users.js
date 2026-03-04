const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware to block non-admins
function adminOnly(req, res, next) {
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}

// POST /api/users/create  — Admin creates a new user account
router.post('/create', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'Client',
        });

        await user.save();

        res.status(201).json({
            message: 'User created successfully',
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/users  — Admin fetches all users
router.get('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const users = await User.find().select('-password'); // never send passwords
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/users/:id  — Admin deletes a user
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;