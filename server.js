require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
const authRoutes = require('./src/modules/auth/auth.routes');
const userRoutes = require('./src/modules/users/users.routes');
const orderRoutes = require('./src/routes/order');
const inventoryRoutes = require('./src/modules/inventory/inventory.routes');
const packagingRoutes = require('./src/modules/packaging/packaging.routes');
const deliveryRoutes = require('./src/modules/delivery/delivery.routes');
const callCenterRoutes = require('./src/modules/call-center/callCenter.routes');
const auditLogsRoutes = require('./src/modules/audit-logs/auditLogs.routes');
const financeRoutes = require('./src/modules/finance/finance.routes');
const productsRoutes = require('./src/modules/products/products.routes');
const rolesRoutes = require('./src/modules/roles/roles.routes');
const sellersRoutes = require('./src/modules/sellers/sellers.routes');
const configRoutes = require('./src/modules/config/config.routes');
const statsRoutes = require('./src/modules/stats/stats.routes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/packaging', packagingRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/call-center', callCenterRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/sellers', sellersRoutes);
app.use('/api/config', configRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/sourcing', require('./src/modules/sourcing/sourcing.routes'));
app.use('/api/reports', require('./src/modules/reports/reports.routes'));



// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Atlas Fulfillment Backend' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
