const User = require('../models/User');

/**
 * Automatically deletes accounts that haven't logged in within 24 hours of creation.
 */
const startCleanupJob = () => {
    // Run every hour
    setInterval(async () => {
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            // Delete users created > 24h ago who NEVER logged in
            const result = await User.deleteMany({
                hasFirstLogin: false,
                createdAt: { $lt: twentyFourHoursAgo },
                role: { $ne: 'SuperAdmin' } // Safety: never delete superadmin
            });

            if (result.deletedCount > 0) {
                console.log(`🧹 Cleanup: Deleted ${result.deletedCount} unactivated accounts.`);
            }
        } catch (error) {
            console.error('❌ Cleanup Job Error:', error);
        }
    }, 60 * 60 * 1000); // 1 hour
};

module.exports = startCleanupJob;
