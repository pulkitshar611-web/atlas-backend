const express = require('express');
const router = express.Router();
const inventoryController = require('./inventory.controller');
const requireAuth = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/role.middleware');

// Warehouse Routes
router.post('/warehouses', requireAuth, requireRole(['ADMIN', 'STOCK_KEEPER']), inventoryController.createWarehouse);
router.get('/warehouses', requireAuth, requireRole(['ADMIN', 'STOCK_KEEPER']), inventoryController.listWarehouses);

// Inventory Routes
router.get('/dashboard', requireAuth, requireRole(['ADMIN', 'STOCK_KEEPER']), inventoryController.getDashboardStats);
router.get('/seller', requireAuth, requireRole(['SELLER']), inventoryController.getSellerInventory);
router.get('/', requireAuth, requireRole(['ADMIN', 'STOCK_KEEPER', 'SELLER']), inventoryController.getInventory);
router.post('/in', requireAuth, requireRole(['ADMIN', 'STOCK_KEEPER']), inventoryController.stockIn);
router.post('/out', requireAuth, requireRole(['ADMIN', 'STOCK_KEEPER']), inventoryController.stockOut);
router.get('/history', requireAuth, requireRole(['ADMIN', 'STOCK_KEEPER']), inventoryController.getMovementHistory);

module.exports = router;
