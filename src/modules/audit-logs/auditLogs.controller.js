const auditLogsService = require('./auditLogs.service');

const listLogs = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await auditLogsService.listLogs(page, limit);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getLogById = async (req, res) => {
    try {
        const log = await auditLogsService.getLogById(req.params.id);
        if (!log) {
            return res.status(404).json({ message: 'Audit log not found' });
        }
        res.json(log);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    listLogs,
    getLogById
};
