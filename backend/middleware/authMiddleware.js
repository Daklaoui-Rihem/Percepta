const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
    let token = req.headers['authorization']?.split(' ')[1];
    
    // Fallback: allow token via query param (useful for Bull Board browser access)
    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role, tenantId }
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};