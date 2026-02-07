const express = require('express');
const router = express.Router();
const financeController = require('./finance.controller.js');
const superAdminFinanceController = require('./super-admin-finance.controller.js');
const requireAuth = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/role.middleware');

router.get('/summary', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'SELLER']), financeController.getSummary);
router.get('/orders', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'SELLER']), financeController.getOrders);
router.get('/seller', requireAuth, requireRole(['SELLER']), financeController.getSellerFinance);

// NEW: Super Admin dedicated routes
router.get('/superadmin/stats', requireAuth, requireRole(['SUPER_ADMIN']), superAdminFinanceController.getStats);
router.get('/superadmin/transactions', requireAuth, requireRole(['SUPER_ADMIN']), superAdminFinanceController.getTransactions);
router.get('/superadmin/payments', requireAuth, requireRole(['SUPER_ADMIN']), superAdminFinanceController.getPayments);
router.get('/superadmin/platforms', requireAuth, requireRole(['SUPER_ADMIN']), superAdminFinanceController.getPlatforms);

module.exports = router;
