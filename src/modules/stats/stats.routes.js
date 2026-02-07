const express = require('express');
const router = express.Router();
const statsController = require('./stats.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth');

router.get('/admin', verifyToken, authorizeRoles(['SUPER_ADMIN', 'ADMIN']), statsController.getAdminStats);
router.get('/seller', verifyToken, authorizeRoles(['SELLER']), statsController.getSellerStats);

module.exports = router;
