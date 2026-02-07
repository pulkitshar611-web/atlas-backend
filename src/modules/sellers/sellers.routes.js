const express = require('express');
const router = express.Router();
const sellersController = require('./sellers.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth');

// Super Admin can view all, Admin can manage their own
router.get('/', verifyToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), sellersController.listSellers);
router.post('/', verifyToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), sellersController.onboardSeller);
router.get('/:sellerId', verifyToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), sellersController.getSeller);
router.delete('/:sellerId', verifyToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), sellersController.deleteSeller);

// Seller's own dashboard (without sellerId param) - MUST BE FIRST to avoid collision
router.get('/dashboard/stats', verifyToken, authorizeRoles('SELLER'), sellersController.getDashboardStats);
router.get('/dashboard/sales-performance', verifyToken, authorizeRoles('SELLER'), sellersController.getSalesPerformance);
router.get('/dashboard/top-products', verifyToken, authorizeRoles('SELLER'), sellersController.getTopProducts);
router.get('/dashboard/recent-orders', verifyToken, authorizeRoles('SELLER'), sellersController.getRecentOrders);
router.get('/dashboard/low-stock-alerts', verifyToken, authorizeRoles('SELLER'), sellersController.getLowStockAlerts);

// Dashboard endpoints - accessible by sellers and admins
router.get('/:sellerId/dashboard/stats', verifyToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SELLER'), sellersController.getDashboardStats);
router.get('/:sellerId/dashboard/sales-performance', verifyToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SELLER'), sellersController.getSalesPerformance);
router.get('/:sellerId/dashboard/top-products', verifyToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SELLER'), sellersController.getTopProducts);
router.get('/:sellerId/dashboard/recent-orders', verifyToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SELLER'), sellersController.getRecentOrders);
router.get('/:sellerId/dashboard/low-stock-alerts', verifyToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SELLER'), sellersController.getLowStockAlerts);

module.exports = router;

