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

// ── GET /api/dashboard/severity-stats ───────────────────────────
// Aggregate severity and incident type stats for the analytics page
router.get('/severity-stats', authMiddleware, adminOrAbove, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'Admin';

        const matchStage = { status: 'done' };
        if (isAdmin) {
            const mongoose = require('mongoose');
            const adminId = new mongoose.Types.ObjectId(req.user.id);
            matchStage.$or = [
                { tenantId: adminId },
                { userId: adminId }
            ];
        }

        // Severity breakdown (audio uses extractedEntities.severity, video uses videoAnalysisData incidents)
        const severityAgg = await Analysis.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $ifNull: ['$extractedEntities.severity', 'unknown'] },
                    count: { $sum: 1 }
                }
            }
        ]);

        const severityBreakdown = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
        severityAgg.forEach(s => {
            if (severityBreakdown.hasOwnProperty(s._id)) {
                severityBreakdown[s._id] = s.count;
            } else {
                severityBreakdown.unknown += s.count;
            }
        });

        // Incident type breakdown
        const incidentAgg = await Analysis.aggregate([
            { $match: { ...matchStage, 'extractedEntities.incident_type': { $ne: null } } },
            {
                $group: {
                    _id: '$extractedEntities.incident_type',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]);
        const incidentTypes = incidentAgg.map(i => ({ type: i._id, count: i.count }));

        // Severity by analysis type
        const byTypeAgg = await Analysis.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        type: '$type',
                        severity: { $ifNull: ['$extractedEntities.severity', 'unknown'] }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        const severityByType = {};
        byTypeAgg.forEach(item => {
            const t = item._id.type;
            if (!severityByType[t]) severityByType[t] = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
            const sev = item._id.severity;
            if (severityByType[t].hasOwnProperty(sev)) {
                severityByType[t][sev] = item.count;
            } else {
                severityByType[t].unknown += item.count;
            }
        });

        // Recent severe analyses
        const recentSevere = await Analysis.find({
            ...matchStage,
            'extractedEntities.severity': { $in: ['critical', 'high'] }
        })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Severity over time (last 30 days, grouped by day)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const timelineAgg = await Analysis.aggregate([
            { $match: { ...matchStage, createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        severity: { $ifNull: ['$extractedEntities.severity', 'unknown'] }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        const timelineMap = {};
        timelineAgg.forEach(item => {
            const d = item._id.date;
            if (!timelineMap[d]) timelineMap[d] = { date: d, critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
            const sev = item._id.severity;
            if (timelineMap[d].hasOwnProperty(sev)) {
                timelineMap[d][sev] = item.count;
            }
        });
        const timeline = Object.values(timelineMap);

        res.json({
            severityBreakdown,
            incidentTypes,
            severityByType,
            recentSevere,
            timeline,
        });
    } catch (error) {
        console.error('Error fetching severity stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
