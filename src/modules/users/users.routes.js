const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth');


// Only Super Admin and Admin can access the users module
const allowedManagers = ['SUPER_ADMIN', 'ADMIN'];

router.post('/', verifyToken, authorizeRoles(allowedManagers), usersController.createUser);
router.get('/', verifyToken, authorizeRoles(allowedManagers), usersController.listUsers);
router.get('/:id', verifyToken, authorizeRoles(allowedManagers), usersController.getUser);
router.patch('/:id', verifyToken, authorizeRoles(allowedManagers), usersController.updateUser);
router.patch('/:id/status', verifyToken, authorizeRoles(allowedManagers), usersController.updateStatus);
router.delete('/:id', verifyToken, authorizeRoles(allowedManagers), usersController.deleteUser);


module.exports = router;
