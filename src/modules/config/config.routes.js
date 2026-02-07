const express = require('express');
const router = express.Router();
const configController = require('./config.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth');

// Only Super Admin can manage system configuration
router.get('/', verifyToken, authorizeRoles(['SUPER_ADMIN']), configController.getConfig);
router.patch('/', verifyToken, authorizeRoles(['SUPER_ADMIN']), configController.updateConfig);
router.post('/batch', verifyToken, authorizeRoles(['SUPER_ADMIN']), configController.batchUpdateConfig);

module.exports = router;
