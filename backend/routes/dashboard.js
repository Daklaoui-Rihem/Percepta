const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const authMiddleware = require('../middleware/authMiddleware');
const { adminOrAbove } = require('../middleware/roleMiddleware');
const User = require('../models/User');
const Analysis = require('../models/Analysis');

// ── GET /api/dashboard/stats ─────────────────────────────────────
// Retrieve admin dashboard statistics
router.get('/stats', authMiddleware, adminOrAbove, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'Admin';
        const isSuperAdmin = req.user.role === 'SuperAdmin';
        
        let userFilter = {};
        let analysisFilter = {};
        let totalTenants = 0;
        
        if (isAdmin) {
            userFilter.tenantId = req.user.id;
            analysisFilter = {
                $or: [
                    { tenantId: req.user.id },
                    { userId: req.user.id }
                ]
            };
        }

        if (isSuperAdmin) {
            totalTenants = await User.countDocuments({ role: 'Admin' });
        }

        const [totalUsers, activeAnalysesCount, totalAnalysesCount] = await Promise.all([
            User.countDocuments(userFilter),
            Analysis.countDocuments({ ...analysisFilter, status: { $in: ['pending', 'processing'] } }),
            Analysis.countDocuments(analysisFilter)
        ]);

        // Error rate
        const errorAnalysesCount = await Analysis.countDocuments({ ...analysisFilter, status: 'error' });
        const errorRate = totalAnalysesCount > 0 ? ((errorAnalysesCount / totalAnalysesCount) * 100).toFixed(2) : 0;

        // Reports generated (hasPdf)
        const reportsCount = await Analysis.countDocuments({ ...analysisFilter, hasPdf: true });

        // Recent activities (last 5 analyses)
        const recentActivities = await Analysis.find(analysisFilter)
            .populate('userId', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // Active Tenants (SuperAdmin only)
        let activeTenants = [];
        if (isSuperAdmin) {
            const admins = await User.find({ role: 'Admin' }).lean();
            // For each admin, count their users and analyses
            activeTenants = await Promise.all(admins.map(async (admin) => {
                const [userCount, analysisCount] = await Promise.all([
                    User.countDocuments({ tenantId: admin._id }),
                    Analysis.countDocuments({ 
                        $or: [
                            { tenantId: admin._id },
                            { userId: admin._id }
                        ]
                    })
                ]);
                return {
                    id: admin._id,
                    name: admin.name,
                    plan: 'Enterprise', // Placeholder or add to model
                    users: userCount,
                    resource: analysisCount // Using analysis count as a proxy for resource usage
                };
            }));
        }

        res.json({
            totalTenants,
            totalUsers,
            activeAnalysesCount,
            totalAnalysesCount,
            errorRate,
            reportsCount,
            recentActivities,
            activeTenants
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ── GET /api/dashboard/history ───────────────────────────────────
// Retrieve detailed history with filters
router.get('/history', authMiddleware, adminOrAbove, async (req, res) => {
    try {
        const { dateFrom, dateTo, type, status } = req.query;
        
        const filter = {};
        
        // Tenant filter for Admins
        if (req.user.role === 'Admin') {
            filter.$or = [
                { tenantId: req.user.id },
                { userId: req.user.id }
            ];
        }
        
        // Custom filters
        if (type) filter.type = type;
        if (status) filter.status = status;
        
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }

        const history = await Analysis.find(filter)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        res.json(history);
    } catch (error) {
        console.error('Error fetching dashboard history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
