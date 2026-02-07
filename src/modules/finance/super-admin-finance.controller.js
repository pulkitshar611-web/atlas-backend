const financeService = require('./super-admin-finance.service');

const getStats = async (req, res) => {
    try {
        const stats = await financeService.getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching super admin finance stats:', error);
        res.status(500).json({ message: 'Failed to fetch finance statistics' });
    }
};

const getTransactions = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const limit = req.query.limit || 10;
        const transactions = await financeService.getRecentTransactions(page, limit);
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching super admin transactions:', error);
        res.status(500).json({ message: 'Failed to fetch transactions' });
    }
};

const getPayments = async (req, res) => {
    try {
        const filters = req.query;
        const payments = await financeService.getPayments(filters);
        res.json(payments);
    } catch (error) {
        console.error('Error fetching super admin payments:', error);
        res.status(500).json({ message: 'Failed to fetch payments' });
    }
};

const getPlatforms = async (req, res) => {
    try {
        const stats = await financeService.getPlatformStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching super admin platforms:', error);
        res.status(500).json({ message: 'Failed to fetch platform statistics' });
    }
};

module.exports = {
    getStats,
    getTransactions,
    getPayments,
    getPlatforms
};
