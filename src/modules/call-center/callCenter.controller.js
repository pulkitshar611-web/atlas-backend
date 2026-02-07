const callCenterService = require('./callCenter.service');

const getCustomers = async (req, res) => {
    try {
        const customers = await callCenterService.getCustomers(req.user);
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getCustomerById = async (req, res) => {
    try {
        const customer = await callCenterService.getCustomerById(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getOrders = async (req, res) => {
    try {
        const filters = req.query;
        const orders = await callCenterService.getOrders(filters, req.user);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const order = await callCenterService.updateOrderStatus(req.params.id, status, req.user);
        res.json(order);
    } catch (error) {
        const statusCode = error.message.includes('Forbidden') ? 403 : 400;
        res.status(statusCode).json({ message: error.message });
    }
};

const confirmOrder = async (req, res) => {
    try {
        const order = await callCenterService.confirmOrder(req.params.id, req.user);
        res.json({
            message: 'Order confirmed successfully',
            order
        });
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ message: error.message });
    }
};

const addNote = async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Note content is required' });

    try {
        const note = await callCenterService.addCallNote(req.params.id, req.user.id, content);
        res.status(201).json(note);

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getNotes = async (req, res) => {
    try {
        const notes = await callCenterService.getCallNotes(req.params.id);
        res.json(notes);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getAgents = async (req, res) => {
    try {
        const agents = await callCenterService.getAgents(req.user);
        res.json(agents);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getPerformance = async (req, res) => {
    try {
        const metrics = await callCenterService.getPerformanceMetrics();
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const stats = await callCenterService.getDashboardStats(req.user);
        res.json(stats);
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
    }
};

const autoAssign = async (req, res) => {
    try {
        const result = await callCenterService.autoAssignOrders(req.user);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error assigning orders', error: error.message });
    }
};

const fixUnassigned = async (req, res) => {
    try {
        const result = await callCenterService.fixUnassignedOrders(req.user);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fixing unassigned orders', error: error.message });
    }
};

const createTestOrders = async (req, res) => {
    try {
        const result = await callCenterService.createTestOrders();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error creating test orders', error: error.message });
    }
};

const getManagerOrders = async (req, res) => {
    try {
        const { page, limit, search, status, agentId } = req.query;
        const orders = await callCenterService.getManagerOrders({ page, limit, search, status, agentId }, req.user);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching manager orders', error: error.message });
    }
};

const getManagerOrderStats = async (req, res) => {
    try {
        const stats = await callCenterService.getManagerOrderStats(req.user);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching manager order stats', error: error.message });
    }
};

const updateManagerOrder = async (req, res) => {
    try {
        const updatedOrder = await callCenterService.updateManagerOrder(req.params.id, req.body, req.user);
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: 'Error updating order', error: error.message });
    }
};

const updateAgent = async (req, res) => {
    try {
        const updatedAgent = await callCenterService.updateAgent(req.params.id, req.body);
        res.json(updatedAgent);
    } catch (error) {
        res.status(500).json({ message: 'Error updating agent', error: error.message });
    }
};

const getPerformanceReports = async (req, res) => {
    try {
        const reports = await callCenterService.getPerformanceReports(req.user);
        res.json(reports);
    } catch (error) {
        console.error('Error in getPerformanceReports controller:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getOrderStatistics = async (req, res) => {
    try {
        const stats = await callCenterService.getOrderStatistics(req.user);
        res.json(stats);
    } catch (error) {
        console.error('Error in getOrderStatistics controller:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const createAgent = async (req, res) => {
    try {
        const newAgent = await callCenterService.createAgent(req.body, req.user);
        res.status(201).json(newAgent);
    } catch (error) {
        console.error('Error creating agent:', error);
        res.status(500).json({ message: 'Error creating agent', error: error.message });
    }
};

const getAgentStats = async (req, res) => {
    try {
        const stats = await callCenterService.getAgentStats(req.user.id);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching agent stats:', error);
        res.status(500).json({ message: 'Error fetching agent stats', error: error.message });
    }
};

module.exports = {
    getCustomers,
    getCustomerById,
    getOrders,
    updateStatus,
    confirmOrder,
    addNote,
    getNotes,
    getAgents,
    getPerformance,
    getDashboardStats,
    autoAssign,
    fixUnassigned,
    createTestOrders,
    getManagerOrders,
    getManagerOrderStats,
    updateManagerOrder,
    updateAgent,
    getPerformanceReports,
    getPerformanceReports,
    getOrderStatistics,
    createAgent,
    getAgentStats
};
