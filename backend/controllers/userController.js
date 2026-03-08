const bcrypt = require('bcryptjs');
const User = require('../models/User');

// ─────────────────────────────────────────────
// CREATE USER
// SuperAdmin creates Admins (no tenantId)
// Admin creates Clients (tenantId = admin's id)
// ─────────────────────────────────────────────
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, department, phone, adminLevel } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }

        // Role rules:
        // SuperAdmin can only create Admins
        // Admin can only create Clients
        if (req.user.role === 'SuperAdmin' && role !== 'Admin') {
            return res.status(403).json({ message: 'SuperAdmin can only create Admin accounts' });
        }
        if (req.user.role === 'Admin' && role !== 'Client') {
            return res.status(403).json({ message: 'Admin can only create Client accounts' });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // tenantId: if Admin creates a Client, client belongs to this admin
        const tenantId = req.user.role === 'Admin' ? req.user.id : null;

        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role || (req.user.role === 'SuperAdmin' ? 'Admin' : 'Client'),
            tenantId,
            department: department || '',
            phone: phone || '',
            adminLevel: adminLevel || 'Administrator',
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                isActive: user.isActive,
                createdAt: user.createdAt,
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─────────────────────────────────────────────
// GET ALL USERS (scoped by role)
// SuperAdmin sees only Admins
// Admin sees only their own Clients (tenantId = admin id)
// ─────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === 'SuperAdmin') {
            filter = { role: 'Admin' };
        } else if (req.user.role === 'Admin') {
            filter = { role: 'Client', tenantId: req.user.id };
        } else {
            return res.status(403).json({ message: 'Access denied' });
        }

        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─────────────────────────────────────────────
// GET SINGLE USER
// ─────────────────────────────────────────────
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Scope check
        if (req.user.role === 'Admin' && String(user.tenantId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ─────────────────────────────────────────────
// UPDATE USER (admin updates their client, superadmin updates admin)
// ─────────────────────────────────────────────
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Scope check
        if (req.user.role === 'Admin' && String(user.tenantId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { name, email, role, isActive, department, phone, adminLevel } = req.body;

        if (name) user.name = name;
        if (email) user.email = email.toLowerCase();
        if (department !== undefined) user.department = department;
        if (phone !== undefined) user.phone = phone;
        if (adminLevel !== undefined) user.adminLevel = adminLevel;
        if (isActive !== undefined) user.isActive = isActive;
        // Don't allow role escalation
        // if (role) user.role = role;

        await user.save();

        res.json({
            message: 'User updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                tenantId: user.tenantId,
                department: user.department,
                phone: user.phone,
                adminLevel: user.adminLevel,
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─────────────────────────────────────────────
// DELETE USER
// ─────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Scope check
        if (req.user.role === 'Admin' && String(user.tenantId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ─────────────────────────────────────────────
// GET MY PROFILE (any authenticated user)
// ─────────────────────────────────────────────
exports.getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ─────────────────────────────────────────────
// UPDATE MY PROFILE
// ─────────────────────────────────────────────
exports.updateMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { name, email, department, phone, adminLevel, photoUrl } = req.body;

        if (name) user.name = name;
        if (email) user.email = email.toLowerCase();
        if (department !== undefined) user.department = department;
        if (phone !== undefined) user.phone = phone;
        if (adminLevel !== undefined) user.adminLevel = adminLevel;
        if (photoUrl !== undefined) user.photoUrl = photoUrl;

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                phone: user.phone,
                adminLevel: user.adminLevel,
                photoUrl: user.photoUrl,
                tenantId: user.tenantId,
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─────────────────────────────────────────────
// CHANGE MY PASSWORD
// ─────────────────────────────────────────────
exports.changeMyPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const user = await User.findById(req.user.id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};