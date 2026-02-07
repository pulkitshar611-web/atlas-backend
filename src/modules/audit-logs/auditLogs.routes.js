const express = require('express');
const router = express.Router();
const auditLogsController = require('./auditLogs.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth');

// Only Super Admin can view audit logs
router.get('/', verifyToken, authorizeRoles('SUPER_ADMIN'), auditLogsController.listLogs);
router.get('/:id', verifyToken, authorizeRoles('SUPER_ADMIN'), auditLogsController.getLogById);

module.exports = router;
