/**
 * Shared Redis connection config for BullMQ.
 * Both the API (producer) and the worker (consumer) import this.
 *
 * IMPORTANT: BullMQ requires ioredis — do NOT use the standard `redis` package.
 *
 * Environment variables:
 *   REDIS_HOST   (default: 127.0.0.1)
 *   REDIS_PORT   (default: 6379)
 *   REDIS_PASS   (optional)
 */

const redisConnection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASS || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
};

module.exports = { redisConnection };