const express = require('express');
const router = express.Router();
const rolesController = require('./roles.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth');

// Only SUPER_ADMIN can manage roles
router.get('/', verifyToken, authorizeRoles(['SUPER_ADMIN']), rolesController.listRoles);
router.get('/permissions', verifyToken, authorizeRoles(['SUPER_ADMIN']), rolesController.getPermissions);
router.put('/:id/permissions', verifyToken, authorizeRoles(['SUPER_ADMIN']), rolesController.updatePermissions);

module.exports = router;
