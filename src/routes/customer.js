const express = require('express');
const router = express.Router();
const { getCustomers, getCustomerById } = require('../modules/customers/customers.controller');
const { verifyToken } = require('../middleware/auth');

// Note: CC Agent has read-only access to these.
router.get('/', verifyToken, getCustomers);
router.get('/:id', verifyToken, getCustomerById);

module.exports = router;
