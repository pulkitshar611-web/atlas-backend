const sourcingService = require('./sourcing.service');

const createRequest = async (req, res) => {
    try {
        const result = await sourcingService.createRequest(req.body, req.user.id);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getSellerRequests = async (req, res) => {
    try {
        const result = await sourcingService.getSellerRequests(req.user.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllRequests = async (req, res) => {
    try {
        const result = await sourcingService.getAllRequests();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await sourcingService.updateStatus(id, status, req.user);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    createRequest,
    getSellerRequests,
    getAllRequests,
    updateStatus
};
