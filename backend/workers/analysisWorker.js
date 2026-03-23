/**
 * analysisWorker.js — The actual BullMQ Worker process
 *
 * Run this separately from the Express server:
 *   node backend/workers/analysisWorker.js
 *
 * Or add to package.json scripts:
 *   "worker": "node backend/workers/analysisWorker.js"
 *
 * This worker:
 *  1. Connects to Redis via BullMQ
 *  2. Pulls jobs from the 'analysis' queue
 *  3. Calls the appropriate processor (audio / video / groupActivity)
 *  4. Updates the Analysis document in MongoDB with the result
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const { redisConnection } = require('../config/redis');
const Analysis = require('../models/Analysis');
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

// ── Create the BullMQ Worker ───────────────────────────────────
const worker = new Worker(
    'analysis',
    async (job) => {
        const { analysisId, type, filePath } = job.data;

        console.log(`⚙️  [Worker] Processing job ${job.id} | type=${type} | analysisId=${analysisId}`);

        // Mark as 'processing' in DB
        await Analysis.findByIdAndUpdate(analysisId, { status: 'processing' });
        await job.updateProgress(5);

        let result;

        try {
            switch (type) {
                case 'audio':
                    result = await processAudio({ analysisId, filePath, job });
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

            // Mark as 'done' with results
            await Analysis.findByIdAndUpdate(analysisId, {
                status: 'done',
                transcription: result.transcription,
                summary: result.summary,
                errorMessage: '',
            });

            await job.updateProgress(100);
            console.log(`✅ [Worker] Job ${job.id} completed for analysisId=${analysisId}`);

            return { success: true, analysisId };

        } catch (processingError) {
            // Mark as 'error' in DB so the frontend knows
            await Analysis.findByIdAndUpdate(analysisId, {
                status: 'error',
                errorMessage: processingError.message || 'Processing failed',
            });
            // Re-throw so BullMQ can handle retries
            throw processingError;
        }
    },
    {
        connection: redisConnection,
        concurrency: CONCURRENCY,
    }
);

// ── Worker event listeners ─────────────────────────────────────
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