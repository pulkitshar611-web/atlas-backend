const reportsService = require('./reports.service');

const getSummary = async (req, res) => {
    try {
        const filters = req.query;
        const data = await reportsService.getSummaryMetrics(filters);
        res.json(data);
    } catch (error) {
        console.error('Error fetching report summary:', error);
        res.status(500).json({ message: 'Failed to fetch report summary' });
    }
};

const getRevenueAnalysis = async (req, res) => {
    try {
        const filters = req.query;
        const data = await reportsService.getRevenueAnalysis(filters);
        res.json(data);
    } catch (error) {
        console.error('Error fetching revenue analysis:', error);
        res.status(500).json({ message: 'Failed to fetch revenue analysis' });
    }
};

module.exports = {
    getSummary,
    getRevenueAnalysis
};
