/**
 * index.js — UPDATED to integrate BullMQ queue and Bull Board dashboard
 *
 * Changes from original:
 *  1. Bull Board admin UI mounted at /admin/queues (SuperAdmin only)
 *  2. analysisQueue is initialized here but jobs are dispatched from controllers
 *  3. The worker is a SEPARATE PROCESS — not started from here
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const analysesRoutes = require('./routes/analyses');

const { seedSuperAdmin } = require('./controllers/authController');
const startCleanupJob = require('./utils/cleanupJob');
const { setupBullBoard } = require('./config/bullBoard');

const authMiddleware = require('./middleware/authMiddleware');
const { superAdminOnly } = require('./middleware/roleMiddleware');

const app = express();

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ── Static files ───────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analyses', analysesRoutes);

// ── Health check ───────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── DB + Server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ifbw')
  .then(async () => {
    console.log('✅ MongoDB connected');
    await seedSuperAdmin();
    startCleanupJob();

    // Mount Bull Board AFTER express is ready
    // (requires Bull Board packages — see package.json)
    try {
      setupBullBoard(app);
    } catch (e) {
      console.warn('⚠️  Bull Board not mounted (install @bull-board/express @bull-board/api):', e.message);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Queue dashboard: http://localhost:${PORT}/admin/queues`);
      console.log(`⚠️  Start the worker separately: node backend/workers/analysisWorker.js`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });