const inventoryService = require('./inventory.service');
const prisma = require('../../utils/prisma');

// --- Warehouse Controllers ---

const createWarehouse = async (req, res) => {
    try {
        const warehouse = await inventoryService.createWarehouse(req.body, req.user);
        res.status(201).json(warehouse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const listWarehouses = async (req, res) => {
    try {
        const warehouses = await inventoryService.listWarehouses(req.user);
        res.json(warehouses);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// --- Inventory Controllers ---

const getInventory = async (req, res) => {
    try {
        const inventory = await inventoryService.getInventory(req.user, req.query);
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const stockIn = async (req, res) => {
    try {
        const inventory = await inventoryService.stockIn(req.body, req.user);
        res.json(inventory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const stockOut = async (req, res) => {
    try {
        const inventory = await inventoryService.stockOut(req.body, req.user);
        res.json(inventory);
    } catch (error) {
        const status = error.message.includes('Insufficient') ? 400 : 500;
        res.status(status).json({ message: error.message });
    }
};

const getMovementHistory = async (req, res) => {
    try {
        const { search, type } = req.query;
        const history = await inventoryService.getMovementHistory(req.user, { search, type });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateStock = async (req, res) => {
    const { productId, warehouseId, quantity } = req.body;
    const { role } = req.user;

    if (role !== 'STOCK_KEEPER' && role !== 'ADMIN') {
        return res.status(403).json({ message: 'Only Stock Keepers can update inventory' });
    }

    try {
        const updated = await prisma.inventory.upsert({
            where: {
                productId_warehouseId: { productId, warehouseId }
            },
            update: { quantity },
            create: { productId, warehouseId, quantity }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Stock update failed' });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const { period } = req.query;
        const stats = await inventoryService.getDashboardStats(req.user, period);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching inventory dashboard stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getSellerInventory = async (req, res) => {
    try {
        let user = req.user;
        if (user.role === 'SELLER' && !user.sellerId) {
            const seller = await prisma.seller.findUnique({ where: { userId: user.id } });
            if (seller) user.sellerId = seller.id;
        }

        const data = await inventoryService.getSellerInventoryStats(user);
        res.json(data);
    } catch (error) {
        console.error('Error fetching seller inventory:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    createWarehouse,
    listWarehouses,
    getInventory,
    updateStock,
    stockIn,
    stockOut,
    getMovementHistory,
    getDashboardStats,
    getSellerInventory
};
