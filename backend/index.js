require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const { seedSuperAdmin } = require('./controllers/authController');
const startCleanupJob = require('./utils/cleanupJob');

const analysesRoutes = require('./routes/analyses');

const path = require('path');

const app = express();

// ── Middleware — MUST BE FIRST ─────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/analyses', analysesRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes); // ← moved here, after middleware

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── DB + Server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ifbw')
  .then(async () => {
    console.log('✅ MongoDB connected');
    await seedSuperAdmin();
    startCleanupJob(); // ← Start 24h unactivated accounts cleanup
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });