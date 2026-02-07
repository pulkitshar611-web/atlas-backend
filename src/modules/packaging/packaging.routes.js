const express = require('express');
const router = express.Router();
const packagingController = require('./packaging.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth');


router.post('/assign', verifyToken, authorizeRoles('ADMIN'), packagingController.assignOrder);
router.get('/tasks', verifyToken, authorizeRoles('ADMIN', 'PACKAGING_AGENT'), packagingController.listTasks);
router.get('/dashboard', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'PACKAGING_AGENT'), packagingController.getDashboardStats);
router.patch('/tasks/:id/complete', verifyToken, authorizeRoles('PACKAGING_AGENT'), packagingController.completeTask);
router.get('/reports', verifyToken, authorizeRoles('ADMIN', 'PACKAGING_AGENT'), packagingController.getReports);

// Materials Routes
router.get('/materials/stats', verifyToken, authorizeRoles('ADMIN', 'PACKAGING_AGENT'), packagingController.getMaterialsStats);
router.get('/materials', verifyToken, authorizeRoles('ADMIN', 'PACKAGING_AGENT'), packagingController.listMaterials);
router.post('/materials', verifyToken, authorizeRoles('ADMIN', 'PACKAGING_AGENT'), packagingController.createMaterial);
router.patch('/materials/:id', verifyToken, authorizeRoles('ADMIN', 'PACKAGING_AGENT'), packagingController.updateMaterial);
router.delete('/materials/:id', verifyToken, authorizeRoles('ADMIN', 'PACKAGING_AGENT'), packagingController.deleteMaterial);

module.exports = router;
