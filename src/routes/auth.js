const express = require('express');
const router = express.Router();
const { login, register, getMe } = require('../modules/auth/auth.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', register); // Should be protected by SUPER_ADMIN in production
router.get('/me', verifyToken, getMe);

module.exports = router;
