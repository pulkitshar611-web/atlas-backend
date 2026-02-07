require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/order'));
app.use('/api/customers', require('./routes/customer'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/products', require('./routes/product'));
app.use('/api/stats', require('./modules/stats/stats.routes'));
app.use('/api/audit-logs', require('./modules/audit-logs/auditLogs.routes'));
app.use('/api/users', require('./modules/users/users.routes'));
console.log("DEBUG: Registering Sourcing Routes");
app.use('/api/sourcing', require('./modules/sourcing/sourcing.routes'));
app.use('/api/call-center', require('./modules/call-center/callCenter.routes'));

// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'up', roleTruth: 'Enforced (8 Roles)' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Atlas Fulfillment Backend running on port ${PORT}`);
});
