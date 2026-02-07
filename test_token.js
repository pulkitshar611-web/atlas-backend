const jwt = require('jsonwebtoken');
require('dotenv').config();

const payload = {
    id: 2, // Admin User ID from my previous check
    role: 'ADMIN',
    email: 'admin@atlas.com'
};

const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

console.log('Use this token:');
console.log(`Bearer ${token}`);

console.log('\nRun this command to test POST /api/sellers:');
console.log(`Invoke-RestMethod -Uri http://localhost:5000/api/sellers -Method Post -Headers @{Authorization="Bearer ${token}"} -Body '{"name":"Test Seller","email":"test@seller.com","password":"password"}' -ContentType "application/json"`);
