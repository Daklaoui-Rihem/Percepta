const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        email = email.trim().toLowerCase();
        password = password.trim();

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log(`❌ Login failed: User not found (${email})`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log(`🔍 Login attempt for: ${user.email} (Role: ${user.role}, Active: ${user.isActive})`);

        if (!user.isActive) {
            console.log(`❌ Login failed: Account suspended (${email})`);
            return res.status(403).json({ message: 'Account is suspended' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`❌ Login failed: Password mismatch for ${email}`);
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
                hasFirstLogin: user.hasFirstLogin,
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
        let existing = await User.findOne({ role: 'SuperAdmin' });
        const hashed = await bcrypt.hash('SuperAdmin@123', 10);

        if (!existing) {
            await User.create({
                name: 'Super Admin',
                email: 'superadmin@ifbw.com',
                password: hashed,
                role: 'SuperAdmin',
                hasFirstLogin: true,
            });
            console.log('✅ SuperAdmin seeded: superadmin@ifbw.com / SuperAdmin@123');
        } else {
            // Force synchronize to the preferred original credentials
            existing.email = 'superadmin@ifbw.com';
            existing.password = hashed;
            existing.hasFirstLogin = true;
            await existing.save();
            console.log('✅ SuperAdmin restored to: superadmin@ifbw.com / SuperAdmin@123');
        }
    } catch (err) {
        console.error('Seed error:', err);
    }
};