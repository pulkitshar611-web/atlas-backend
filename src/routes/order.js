const express = require('express');
const router = express.Router();
const { getOrders, getOrderById, createOrder, updateOrderStatus, getPackagingOrders } = require('../modules/orders/orders.controller');
const { getDeliveryOrders } = require('../modules/delivery/delivery.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.get('/packaging', verifyToken, authorizeRoles(['PACKAGING_AGENT', 'STOCK_KEEPER', 'ADMIN', 'SUPER_ADMIN']), getPackagingOrders);
router.get('/delivery', verifyToken, authorizeRoles(['DELIVERY_AGENT', 'ADMIN']), getDeliveryOrders);
router.get('/', verifyToken, getOrders);
router.post('/', verifyToken, createOrder);
router.patch('/:id/status', verifyToken, updateOrderStatus);
router.get('/:id', verifyToken, getOrderById);

module.exports = router;
