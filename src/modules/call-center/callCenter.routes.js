const express = require('express');
const router = express.Router();
const callCenterController = require('./callCenter.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth');

// Customer Routes
router.get('/customers', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_AGENT', 'CALL_CENTER_MANAGER'), callCenterController.getCustomers);
router.get('/customers/:id', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_AGENT', 'CALL_CENTER_MANAGER'), callCenterController.getCustomerById);

// Order Routes
router.get('/orders', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_AGENT', 'CALL_CENTER_MANAGER'), callCenterController.getOrders);
router.patch('/orders/:id/status', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_AGENT'), callCenterController.updateStatus);
router.post('/orders/:id/confirm', verifyToken, authorizeRoles('CALL_CENTER_AGENT', 'CALL_CENTER_MANAGER'), callCenterController.confirmOrder);

// Notes Routes
router.post('/orders/:id/notes', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_AGENT'), callCenterController.addNote);
router.get('/orders/:id/notes', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_AGENT', 'CALL_CENTER_MANAGER'), callCenterController.getNotes);
router.get('/agent-stats', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_AGENT'), callCenterController.getAgentStats);

// Manager Routes
router.get('/manager-dashboard', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_MANAGER'), callCenterController.getDashboardStats);
router.get('/agents', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_MANAGER'), callCenterController.getAgents);
router.post('/agents', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_MANAGER'), callCenterController.createAgent);
router.patch('/agents/:id', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_MANAGER'), callCenterController.updateAgent);
router.post('/auto-assign', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_MANAGER'), callCenterController.autoAssign);
router.post('/fix-unassigned', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_MANAGER'), callCenterController.fixUnassigned);
router.post('/create-test-orders', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_MANAGER'), callCenterController.createTestOrders);
router.get('/manager-orders', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_MANAGER'), callCenterController.getManagerOrders);
router.get('/manager-order-stats', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_MANAGER'), callCenterController.getManagerOrderStats);
router.patch('/manager-orders/:id', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_MANAGER'), callCenterController.updateManagerOrder);
router.get('/performance-reports', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_MANAGER'), callCenterController.getPerformanceReports);
router.get('/order-statistics', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_MANAGER'), callCenterController.getOrderStatistics);


module.exports = router;
