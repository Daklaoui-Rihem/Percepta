const Analysis = require('../models/Analysis');
const path = require('path');

const ALLOWED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/x-m4a'];

// ── Upload Audio ───────────────────────────────────────────────
// POST /api/analyses/upload/audio
exports.uploadAudio = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const analysis = await Analysis.create({
            userId: req.user.id,
            tenantId: req.user.tenantId || null,
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            type: 'audio',
            status: 'pending',
            filePath: req.file.path,
        });

        res.status(201).json({
            message: 'Audio uploaded successfully',
            analysis: {
                id: analysis._id,
                originalName: analysis.originalName,
                size: analysis.size,
                status: analysis.status,
                createdAt: analysis.createdAt,
            }
        });
    } catch (error) {
        console.error('Audio upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
};

// ── Upload Video ───────────────────────────────────────────────
// POST /api/analyses/upload/video
exports.uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const analysis = await Analysis.create({
            userId: req.user.id,
            tenantId: req.user.tenantId || null,
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            type: 'video',
            status: 'pending',
            filePath: req.file.path,
        });

        res.status(201).json({
            message: 'Video uploaded successfully',
            analysis: {
                id: analysis._id,
                originalName: analysis.originalName,
                size: analysis.size,
                status: analysis.status,
                createdAt: analysis.createdAt,
            }
        });
    } catch (error) {
        console.error('Video upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
};

// ── Upload Group Activity ──────────────────────────────────────
// POST /api/analyses/upload/group
exports.uploadGroupActivity = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const analysis = await Analysis.create({
            userId: req.user.id,
            tenantId: req.user.tenantId || null,
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            type: 'groupActivity',
            status: 'pending',
            filePath: req.file.path,
        });

        res.status(201).json({
            message: 'Group activity uploaded successfully',
            analysis: {
                id: analysis._id,
                originalName: analysis.originalName,
                size: analysis.size,
                status: analysis.status,
                createdAt: analysis.createdAt,
            }
        });
    } catch (error) {
        console.error('Group activity upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
};

// ── Get My Analyses (history) ──────────────────────────────────
// GET /api/analyses
exports.getMyAnalyses = async (req, res) => {
    try {
        const analyses = await Analysis.find({ userId: req.user.id })
            .select('-filePath') // don't expose server path
            .sort({ createdAt: -1 }); // newest first

        res.json(analyses);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Get Single Analysis ────────────────────────────────────────
// GET /api/analyses/:id
exports.getAnalysisById = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id);

        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found' });
        }

        // Only owner can see it
        if (String(analysis.userId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(analysis);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Get All Analyses (Admin sees their clients') ───────────────
// GET /api/analyses/all
exports.getAllAnalyses = async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === 'Admin') {
            filter = { tenantId: req.user.id };
        }
        // SuperAdmin sees everything (no filter)

        const analyses = await Analysis.find(filter)
            .select('-filePath')
            .populate('userId', 'name email') // show user name + email
            .sort({ createdAt: -1 });

        res.json(analyses);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Get User's Analyses (Admin/SuperAdmin) ──────────────────────
// GET /api/analyses/user/:userId
exports.getUserAnalyses = async (req, res) => {
    try {
        const { userId } = req.params;
        let filter = { userId };

        if (req.user.role === 'Admin') {
            filter.tenantId = req.user.id;
        }

        const analyses = await Analysis.find(filter)
            .select('-filePath')
            .sort({ createdAt: -1 });

        res.json(analyses);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ── Delete Analysis ────────────────────────────────────────────
// DELETE /api/analyses/:id
exports.deleteAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id);

        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found' });
        }

        if (String(analysis.userId) !== String(req.user.id) && req.user.role === 'Client') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Delete the actual file from disk
        const fs = require('fs');
        if (fs.existsSync(analysis.filePath)) {
            fs.unlinkSync(analysis.filePath);
        }

        await Analysis.findByIdAndDelete(req.params.id);
        res.json({ message: 'Analysis deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};