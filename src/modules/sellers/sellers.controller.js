const sellersService = require('./sellers.service');

const listSellers = async (req, res) => {
    try {
        const sellers = await sellersService.listSellers(req.user);
        res.json(sellers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sellers', error: error.message });
    }
};

const onboardSeller = async (req, res) => {
    try {
        const result = await sellersService.onboardSeller(req.body, req.user);

        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: 'Error onboarding seller', error: error.message });
    }
};

/**
 * Get seller dashboard statistics
 */
const getDashboardStats = async (req, res) => {
    try {
        let sellerId = req.params.sellerId;

        if (!sellerId && req.user.role === 'SELLER') {
            sellerId = await sellersService.getSellerIdByUserId(req.user.id);
        }

        if (!sellerId) {
            return res.status(400).json({ message: 'Seller ID is required' });
        }

        const stats = await sellersService.getDashboardStats(sellerId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
    }
};

/**
 * Get sales performance data
 */
const getSalesPerformance = async (req, res) => {
    try {
        let sellerId = req.params.sellerId;
        const days = parseInt(req.query.days) || 30;

        if (!sellerId && req.user.role === 'SELLER') {
            sellerId = await sellersService.getSellerIdByUserId(req.user.id);
        }

        if (!sellerId) {
            return res.status(400).json({ message: 'Seller ID is required' });
        }

        const performance = await sellersService.getSalesPerformance(sellerId, days);
        res.json(performance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sales performance', error: error.message });
    }
};

/**
 * Get top products
 */
const getTopProducts = async (req, res) => {
    try {
        let sellerId = req.params.sellerId;
        const limit = parseInt(req.query.limit) || 5;

        if (!sellerId && req.user.role === 'SELLER') {
            sellerId = await sellersService.getSellerIdByUserId(req.user.id);
        }

        if (!sellerId) {
            return res.status(400).json({ message: 'Seller ID is required' });
        }

        const products = await sellersService.getTopProducts(sellerId, limit);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching top products', error: error.message });
    }
};

/**
 * Get recent orders
 */
const getRecentOrders = async (req, res) => {
    try {
        let sellerId = req.params.sellerId;
        const limit = parseInt(req.query.limit) || 10;

        if (!sellerId && req.user.role === 'SELLER') {
            sellerId = await sellersService.getSellerIdByUserId(req.user.id);
        }

        if (!sellerId) {
            return res.status(400).json({ message: 'Seller ID is required' });
        }

        const orders = await sellersService.getRecentOrders(sellerId, limit);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recent orders', error: error.message });
    }
};

/**
 * Get low stock alerts
 */
const getLowStockAlerts = async (req, res) => {
    try {
        let sellerId = req.params.sellerId;
        const threshold = parseInt(req.query.threshold) || 10;

        if (!sellerId && req.user.role === 'SELLER') {
            sellerId = await sellersService.getSellerIdByUserId(req.user.id);
        }

        if (!sellerId) {
            return res.status(400).json({ message: 'Seller ID is required' });
        }

        const alerts = await sellersService.getLowStockAlerts(sellerId, threshold);
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching low stock alerts', error: error.message });
    }
};

const getSeller = async (req, res) => {
    try {
        const seller = await sellersService.getSellerDetails(req.params.sellerId, req.user);
        res.json(seller);
    } catch (error) {
        res.status(404).json({ message: 'Seller not found', error: error.message });
    }
};

const deleteSeller = async (req, res) => {
    try {
        const result = await sellersService.deleteSeller(req.params.sellerId, req.user);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error deleting seller', error: error.message });
    }
};

module.exports = {
    listSellers,
    onboardSeller,
    getSeller,
    deleteSeller,
    getDashboardStats,
    getSalesPerformance,
    getTopProducts,
    getRecentOrders,
    getLowStockAlerts
};

