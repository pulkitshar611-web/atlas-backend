const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth');

// Protected routes - Super Admin only for full reports (or Admin if allowed)
router.get('/summary', verifyToken, authorizeRoles(['SUPER_ADMIN', 'ADMIN']), reportsController.getSummary);
router.get('/revenue-analysis', verifyToken, authorizeRoles(['SUPER_ADMIN', 'ADMIN']), reportsController.getRevenueAnalysis);

module.exports = router;
