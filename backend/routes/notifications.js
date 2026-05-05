const express = require('express');
const router = express.Router();
const { QueueEvents } = require('bullmq');
const { redisConnection } = require('../config/redis');
const Analysis = require('../models/Analysis');

// We listen to the same queue the worker is consuming
const queueEvents = new QueueEvents('analysis', { connection: redisConnection });

// Store SSE connected clients
let clients = [];

/**
 * GET /api/notifications/stream
 * Connects a client via Server-Sent Events (SSE) to receive real-time updates.
 */
router.get('/stream', (req, res) => {
    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Prevents proxy buffering
    res.flushHeaders();

    const clientId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const client = { id: clientId, res };
    clients.push(client);

    console.log(`[Notifications] Client connected to SSE stream: ${clientId}`);

    // Send initial ping to confirm connection
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE stream established' })}\n\n`);

    // Keep-alive ping every 30 seconds to prevent timeout
    const keepAlive = setInterval(() => {
        res.write(':ping\n\n'); // SSE comment (ignored by client)
    }, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
        console.log(`[Notifications] Client disconnected: ${clientId}`);
        clearInterval(keepAlive);
        clients = clients.filter(c => c.id !== clientId);
    });
});

/**
 * Broadcast an event to all connected SSE clients.
 */
function broadcast(data) {
    clients.forEach(client => {
        try {
            // SSE format: data: {json}\n\n
            client.res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
            console.error(`[Notifications] Failed to send to client ${client.id}:`, err.message);
        }
    });
}

// ── BullMQ Queue Events Listeners ─────────────────────────────────

// When a job finishes successfully
queueEvents.on('completed', async ({ jobId, returnvalue }) => {
    try {
        // Broadcast success event
        // The returnvalue contains analysisId and status from the worker
        broadcast({
            type: 'JOB_COMPLETED',
            jobId,
            analysisId: returnvalue.analysisId,
            message: 'Analysis completed successfully',
            status: 'done'
        });
    } catch (err) {
        console.error('[Notifications] Error handling completed event:', err.message);
    }
});

// When a job fails
queueEvents.on('failed', async ({ jobId, failedReason }) => {
    try {
        // We might not have the analysisId directly in the event, but we can broadcast
        // the error and the frontend can refresh or match by jobId.
        broadcast({
            type: 'JOB_FAILED',
            jobId,
            message: failedReason || 'Analysis failed',
            status: 'error'
        });
    } catch (err) {
        console.error('[Notifications] Error handling failed event:', err.message);
    }
});

// Optional: listen to progress
queueEvents.on('progress', async ({ jobId, data }) => {
    broadcast({
        type: 'JOB_PROGRESS',
        jobId,
        progress: data
    });
});

module.exports = router;
