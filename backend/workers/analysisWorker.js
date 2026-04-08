/**
 * analysisWorker.js — BullMQ Worker
 *
 * Run separately: node backend/workers/analysisWorker.js
 *
 * Changes:
 *  - Loads user info (name, email) before processing so the PDF report
 *    can include proper attribution.
 *  - Saves pdfPath to the Analysis document after processing.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const { redisConnection } = require('../config/redis');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { processAudio } = require('../processors/audioProcessor');
const { processVideo } = require('../processors/videoProcessor');
const { processGroupActivity } = require('../processors/groupActivityProcessor');

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '3');

// ── Connect to MongoDB ─────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ [Worker] MongoDB connected'))
    .catch(err => {
        console.error('❌ [Worker] MongoDB connection failed:', err.message);
        process.exit(1);
    });

// ── Worker ─────────────────────────────────────────────────────
const worker = new Worker(
    'analysis',
    async (job) => {
        // ← NEW: destructure translateTo from job data
        const { analysisId, type, filePath, translateTo } = job.data;

        console.log(`⚙️  [Worker] Processing job ${job.id} | type=${type} | analysisId=${analysisId}${translateTo ? ` | translateTo=${translateTo}` : ''}`);

        const analysis = await Analysis.findById(analysisId);
        if (!analysis) throw new Error(`Analysis ${analysisId} not found in DB`);

        let userName = 'User';
        let userEmail = '';
        let userId = analysis.userId;

        try {
            const user = await User.findById(analysis.userId).select('name email');
            if (user) {
                userName = user.name;
                userEmail = user.email;
            }
        } catch (_) { }

        await Analysis.findByIdAndUpdate(analysisId, { status: 'processing' });
        await job.updateProgress(5);

        let result;

        try {
            switch (type) {
                case 'audio':
                    result = await processAudio({
                        analysisId,
                        filePath,
                        job,
                        userId: String(userId),
                        userName,
                        userEmail,
                        originalName: analysis.originalName,
                        translateTo: translateTo || '',   // ← NEW: pass through
                    });
                    break;

                case 'video':
                    result = await processVideo({ analysisId, filePath, job });
                    break;

                case 'groupActivity':
                    result = await processGroupActivity({ analysisId, filePath, job });
                    break;

                default:
                    throw new Error(`Unknown analysis type: ${type}`);
            }

            await Analysis.findByIdAndUpdate(analysisId, {
                status: 'done',
                transcription: result.transcription,
                summary: result.summary,
                translatedText: result.translatedText || '',    // ← NEW
                translationLang: result.translationLang || '',  // ← NEW
                pdfPath: result.pdfPath || '',
                pdfGeneratedAt: result.pdfPath ? new Date() : null,
                errorMessage: '',
            });

            await job.updateProgress(100);
            console.log(`✅ [Worker] Job ${job.id} completed for analysisId=${analysisId}`);

            return { success: true, analysisId, hasPdf: !!result.pdfPath };

        } catch (processingError) {
            await Analysis.findByIdAndUpdate(analysisId, {
                status: 'error',
                errorMessage: processingError.message || 'Processing failed',
            });
            throw processingError;
        }
    },
    {
        connection: redisConnection,
        concurrency: CONCURRENCY,
    }
);

// ── Events ─────────────────────────────────────────────────────
worker.on('completed', (job) => {
    console.log(`✅ [Worker] Job ${job.id} finished`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ [Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

worker.on('error', (err) => {
    console.error('❌ [Worker] Worker error:', err.message);
});

console.log(`🚀 [Worker] Started — listening on queue 'analysis' (concurrency: ${CONCURRENCY})`);

// ── Graceful shutdown ──────────────────────────────────────────
async function shutdown() {
    console.log('\n🛑 [Worker] Shutting down gracefully...');
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);