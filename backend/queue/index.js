/**
 * analysis queue — the single queue used by the entire application.
 *
 * The Express API calls `addAnalysisJob()` after a file upload.
 * The worker (analysisWorker.js) consumes the jobs.
 *
 * Job retry strategy:
 *   - 3 attempts total
 *   - Exponential back-off: 5s → 25s → 125s
 */

const { Queue } = require('bullmq');
const { redisConnection } = require('../config/redis');

// Singleton queue — only one instance per process
const analysisQueue = new Queue('analysis', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000, // 5 seconds base delay
        },
        removeOnComplete: {
            age: 24 * 3600,  // Keep completed jobs for 24 hours
            count: 500,       // Keep last 500 completed jobs
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days for debugging
        },
    },
});

/**
 * Add an analysis job to the queue.
 *
 * @param {string} analysisId  - MongoDB _id of the Analysis document
 * @param {string} type        - 'audio' | 'video' | 'groupActivity'
 * @param {string} filePath    - Absolute path to the uploaded file on disk
 * @returns {Promise<Job>}     - The created BullMQ job
 */
async function addAnalysisJob(analysisId, type, filePath) {
    const job = await analysisQueue.add(
        `${type}-analysis`,    // Job name (appears in Bull Board UI)
        { analysisId, type, filePath },
        {
            priority: type === 'audio' ? 1 : 2, // Audio jobs get slightly higher priority
        }
    );

    console.log(`📥 [Queue] Job ${job.id} added | type=${type} | analysisId=${analysisId}`);
    return job;
}

async function addAnalysisJobWithOptions(analysisId, type, filePath, extras = {}) {
    const job = await analysisQueue.add(
        `${type}-analysis`,
        {
            analysisId,
            type,
            filePath,
            ...extras,    // ← spreads translateTo etc. into job data
        },
        {
            priority: type === 'audio' ? 1 : 2,
        }
    );

    console.log(`📥 [Queue] Job ${job.id} added | type=${type} | analysisId=${analysisId}${extras.translateTo ? ` | translateTo=${extras.translateTo}` : ''}`);
    return job;
}

/**
 * Get queue stats (used by the admin health endpoint).
 */
async function getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        analysisQueue.getWaitingCount(),
        analysisQueue.getActiveCount(),
        analysisQueue.getCompletedCount(),
        analysisQueue.getFailedCount(),
        analysisQueue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
}

module.exports = { analysisQueue, addAnalysisJob, addAnalysisJobWithOptions, getQueueStats };