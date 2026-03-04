const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
    // The frontend sends the token in the Authorization header like:
    // "Bearer eyJhbGci..."
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // extract token after "Bearer "

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        // Verify the token and decode its payload
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // now req.user.id and req.user.role are available
        next(); // continue to the next handler
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};