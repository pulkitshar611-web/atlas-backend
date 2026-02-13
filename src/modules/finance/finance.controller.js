const financeService = require('./finance.service');

const getSummary = async (req, res) => {
    try {
        const summary = await financeService.getSummary(req.user);
        res.json(summary);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 : 500;
        res.status(status).json({ message: error.message });
    }
};

const getOrders = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await financeService.getFinancialOrders(req.user, page, limit);
        res.json(result);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 : 500;
        res.status(status).json({ message: error.message });
    }
};

const getSellerFinance = async (req, res) => {
    try {
        const data = await financeService.getSellerFinanceData(req.user.id);
        res.json(data);
    } catch (error) {
        console.error("Seller Finance Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ============= PAYMENT PLATFORM CONTROLLERS =============

const getPlatforms = async (req, res) => {
    try {
        const platforms = await financeService.getPlatforms(req.user);
        res.json(platforms);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 : 500;
        res.status(status).json({ message: error.message });
    }
};

const createPlatform = async (req, res) => {
    try {
        const platform = await financeService.createPlatform(req.user, req.body);
        res.status(201).json(platform);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 : 400;
        res.status(status).json({ message: error.message });
    }
};

const verifyPlatform = async (req, res) => {
    try {
        const platform = await financeService.verifyPlatform(req.user, req.params.id);
        res.json(platform);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 : error.message.includes('not found') ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

const disconnectPlatform = async (req, res) => {
    try {
        const result = await financeService.disconnectPlatform(req.user, req.params.id);
        res.json(result);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 : error.message.includes('not found') ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

const getPlatformById = async (req, res) => {
    try {
        const platform = await financeService.getPlatformById(req.user, req.params.id);
        res.json(platform);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 : error.message.includes('not found') ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

const demoSyncOrders = async (req, res) => {
    try {
        const result = await financeService.demoSyncOrders(req.user, req.params.id);
        res.status(200).json(result);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 : error.message.includes('not found') ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

module.exports = {
    getSummary,
    getOrders,
    getSellerFinance,
    getPlatforms,
    createPlatform,
    verifyPlatform,
    disconnectPlatform,
    getPlatformById,
    demoSyncOrders
};
