const express = require('express');
const router = express.Router();
const deliveryController = require('./delivery.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth');

router.post('/assign', verifyToken, authorizeRoles('ADMIN'), deliveryController.assignOrder);
router.get('/stats', verifyToken, authorizeRoles('DELIVERY_AGENT', 'ADMIN'), deliveryController.getDeliveryStats);
router.get('/tasks', verifyToken, authorizeRoles('ADMIN', 'DELIVERY_AGENT'), deliveryController.listTasks);
router.get('/orders', verifyToken, authorizeRoles('DELIVERY_AGENT', 'ADMIN'), deliveryController.getDeliveryOrders);
router.get('/orders/all', verifyToken, authorizeRoles('ADMIN'), deliveryController.getAllOrders);
router.get('/orders/pending-confirmations', verifyToken, authorizeRoles('ADMIN'), deliveryController.getPendingConfirmations);
router.get('/orders/returned', verifyToken, authorizeRoles('ADMIN'), deliveryController.getReturnedOrders);
router.patch('/tasks/:id/start', verifyToken, authorizeRoles('DELIVERY_AGENT'), deliveryController.startDelivery);
router.patch('/tasks/:id/complete', verifyToken, authorizeRoles('DELIVERY_AGENT'), deliveryController.completeDelivery);

module.exports = router;
