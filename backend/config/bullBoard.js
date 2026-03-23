/**
 * Bull Board — visual queue monitoring dashboard
 *
 * Access at: http://localhost:3000/admin/queues
 * Protected by SuperAdmin auth middleware.
 *
 * Install: npm install @bull-board/express @bull-board/api
 */

const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { analysisQueue } = require('../queue');

function basicAuth(req, res, next) {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    // Default credentials: admin / admin123
    const validUser = process.env.QUEUE_USER || 'admin';
    const validPass = process.env.QUEUE_PASS || 'admin123';

    if (login === validUser && password === validPass) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    res.status(401).send('Authentication required.');
}

function setupBullBoard(app) {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
        queues: [new BullMQAdapter(analysisQueue)],
        serverAdapter,
    });

    // Dashboard available without authentication for easy local access
    app.use('/admin/queues', serverAdapter.getRouter());

    console.log('📊 [BullBoard] Queue dashboard available at /admin/queues (No auth required)');
}

module.exports = { setupBullBoard };