const configService = require('./config.service');

const getConfig = async (req, res) => {
    try {
        const config = await configService.getConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching configuration', error: error.message });
    }
};

const updateConfig = async (req, res) => {
    const { key, value } = req.body;
    try {
        const result = await configService.updateConfig(key, value);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: 'Error updating configuration', error: error.message });
    }
};

const batchUpdateConfig = async (req, res) => {
    try {
        const result = await configService.batchUpdateConfig(req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: 'Error updating configurations', error: error.message });
    }
};

module.exports = {
    getConfig,
    updateConfig,
    batchUpdateConfig
};
