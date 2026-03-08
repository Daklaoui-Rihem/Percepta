const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is suspended' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, tenantId: user.tenantId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                photoUrl: user.photoUrl,
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Seed a SuperAdmin if none exists (call once on startup)
exports.seedSuperAdmin = async () => {
    try {
        const existing = await User.findOne({ role: 'SuperAdmin' });
        if (!existing) {
            const hashed = await bcrypt.hash('superadmin123', 10);
            await User.create({
                name: 'Super Admin',
                email: 'superadmin@ifbw.com',
                password: hashed,
                role: 'SuperAdmin',
            });
            console.log('✅ SuperAdmin seeded: superadmin@ifbw.com / superadmin123');
        }
    } catch (err) {
        console.error('Seed error:', err);
    }
};