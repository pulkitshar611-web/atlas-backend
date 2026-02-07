const packagingService = require('./packaging.service');

const assignOrder = async (req, res) => {
    const { orderId, agentId } = req.body;

    if (!orderId || !agentId) {
        return res.status(400).json({ message: 'OrderId and AgentId are required' });
    }

    try {
        const task = await packagingService.assignOrder(orderId, agentId, req.user);
        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const listTasks = async (req, res) => {
    try {
        const tasks = await packagingService.listTasks(req.user);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const completeTask = async (req, res) => {
    const { id } = req.params;

    try {
        const task = await packagingService.completeTask(id, req.user.id, req.user, req.body);

        res.json(task);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 :
            error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const stats = await packagingService.getDashboardStats(req.user);
        res.json(stats);
    } catch (error) {
        console.error("Error fetching packaging dashboard stats:", error);
        res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
    }
};

const listMaterials = async (req, res) => {
    try {
        const materials = await packagingService.listMaterials(req.user);
        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching materials', error: error.message });
    }
};

const createMaterial = async (req, res) => {
    try {
        const material = await packagingService.createMaterial(req.body, req.user);
        res.status(201).json(material);
    } catch (error) {
        res.status(400).json({ message: 'Error creating material', error: error.message });
    }
};

const updateMaterial = async (req, res) => {
    try {
        const material = await packagingService.updateMaterial(req.params.id, req.body, req.user);
        res.json(material);
    } catch (error) {
        res.status(400).json({ message: 'Error updating material', error: error.message });
    }
};

const deleteMaterial = async (req, res) => {
    try {
        await packagingService.deleteMaterial(req.params.id, req.user);
        res.json({ message: 'Material deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting material', error: error.message });
    }
};

const getReports = async (req, res) => {
    try {
        const { period } = req.query;
        const reports = await packagingService.getReports(req.user, period);
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reports', error: error.message });
    }
};

const getMaterialsStats = async (req, res) => {
    try {
        const stats = await packagingService.getMaterialsStats(req.user);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching materials stats', error: error.message });
    }
};

module.exports = {
    assignOrder,
    listTasks,
    completeTask,
    getDashboardStats,
    listMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    getReports,
    getMaterialsStats
};
