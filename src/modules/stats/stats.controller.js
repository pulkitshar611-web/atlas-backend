const statsService = require('./stats.service');
const prisma = require('../../utils/prisma');

const getAdminStats = async (req, res) => {
    try {
        const stats = await statsService.getAdminStats(req.user);
        res.json(stats);
    } catch (error) {
        console.error("Error in getAdminStats:", error);
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

const getSellerStats = async (req, res) => {
    try {
        // Need to ensure sellerId is in req.user, usually added by verifyToken if role is SELLER
        // Assuming verifyToken populates it. If not, we might need to fetch it.
        // Based on previous checks, req.user has { id, role, sellerId } (if custom middleware does it)
        // OR we fetch Seller profile first.

        // Let's assume req.user has sellerId if role is SELLER (from middleware/auth.js logic?)
        // If auth middleware only decodes token, token MUST have sellerId.
        // Safest: Query Seller record if missing.

        let user = req.user;
        if (user.role === 'SELLER' && !user.sellerId) {
            const seller = await prisma.seller.findUnique({ where: { userId: user.id } });
            if (seller) user.sellerId = seller.id;
        }

        const stats = await statsService.getSellerStats(user);
        res.json(stats);
    } catch (error) {
        console.error("Error in getSellerStats:", error);
        res.status(500).json({ message: 'Error fetching seller stats', error: error.message });
    }
};

module.exports = {
    getAdminStats,
    getSellerStats
};
