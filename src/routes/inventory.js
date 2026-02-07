const express = require('express');
const router = express.Router();
const {
    getInventory,
    updateStock,
    createWarehouse,
    listWarehouses,
    stockIn,
    stockOut,
    getMovementHistory
} = require('../modules/inventory/inventory.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Warehouse Routes
router.post('/warehouses', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'STOCK_KEEPER'), createWarehouse);
router.get('/warehouses', verifyToken, listWarehouses);

// Inventory Routes
router.get('/', verifyToken, getInventory);
router.post('/update', verifyToken, authorizeRoles('STOCK_KEEPER', 'ADMIN'), updateStock); // Keep for legacy compatibility if needed, or replace with stockIn/stockOut

// Stock Movement Routes (New)
router.post('/stock-in', verifyToken, authorizeRoles('STOCK_KEEPER', 'ADMIN', 'SELLER'), stockIn);
router.post('/stock-out', verifyToken, authorizeRoles('STOCK_KEEPER', 'ADMIN', 'SELLER'), stockOut);
router.get('/movements', verifyToken, authorizeRoles('STOCK_KEEPER', 'ADMIN'), getMovementHistory);
router.get('/history', verifyToken, authorizeRoles('STOCK_KEEPER', 'ADMIN'), getMovementHistory);

module.exports = router;
