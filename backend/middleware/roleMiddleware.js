function adminOrAbove(req, res, next) {
    if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}

function superAdminOnly(req, res, next) {
    if (req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ message: 'SuperAdmin access required' });
    }
    next();
}

module.exports = {
    adminOrAbove,
    superAdminOnly
};
