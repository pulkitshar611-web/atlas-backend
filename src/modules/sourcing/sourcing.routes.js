const express = require('express');
const router = express.Router();
console.log("DEBUG: Sourcing Routes Loaded");
const sourcingController = require('./sourcing.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth');

// Seller Routes
router.post('/seller', verifyToken, authorizeRoles(['SELLER']), sourcingController.createRequest);
router.get('/seller', verifyToken, authorizeRoles(['SELLER']), sourcingController.getSellerRequests);

// Admin Routes
router.get('/admin', verifyToken, authorizeRoles(['SUPER_ADMIN', 'ADMIN']), sourcingController.getAllRequests);
router.patch('/admin/:id/status', verifyToken, authorizeRoles(['SUPER_ADMIN', 'ADMIN']), sourcingController.updateStatus);

module.exports = router;
