const express = require('express');
const router = express.Router();
const { createProduct, getAllProducts, getActiveProducts, getProductById, updateProduct, deleteProduct } = require('../modules/products/products.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Seller/Admin: View active products for order creation
router.get('/active', verifyToken, getActiveProducts);

// Admin only: Create and view all products
router.post('/', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN'), createProduct);
router.get('/', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'STOCK_KEEPER'), getAllProducts);
router.get('/:id', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'STOCK_KEEPER'), getProductById);
router.put('/:id', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN'), updateProduct);
router.delete('/:id', verifyToken, authorizeRoles('ADMIN', 'SUPER_ADMIN'), deleteProduct);

module.exports = router;
