const prisma = require('../../utils/prisma');
const { canDeductStock } = require('./inventory.helper');
const { logAction } = require('../../utils/auditLogger');

// --- Warehouse Operations ---

const createWarehouse = async (warehouseData, user) => {
    const { name, location, description, status } = warehouseData;
    return await prisma.warehouse.create({
        data: {
            name,
            location,
            description,
            status: status || 'Active',
            adminId: user.id
        }
    });
};

const listWarehouses = async (user) => {
    const { role, id: userId, createdById } = user;
    let where = {};

    if (role === 'ADMIN') {
        where = { adminId: userId };
    } else if (role === 'STOCK_KEEPER') {
        if (createdById) {
            where = { adminId: createdById };
        }
    }
    // Super Admin sees all (where = {})

    const warehouses = await prisma.warehouse.findMany({
        where,
        include: {
            inventory: {
                select: {
                    quantity: true,
                    productId: true
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    return warehouses.map(w => {
        const totalUnits = w.inventory.reduce((sum, item) => sum + item.quantity, 0);
        const uniqueProductsCount = new Set(w.inventory.map(item => item.productId)).size;
        const capacity = 25000; // Placeholder until capacity is in schema

        return {
            id: w.id,
            name: w.name,
            location: w.location,
            description: w.description,
            status: w.status,
            products: uniqueProductsCount,
            current: totalUnits,
            capacity: capacity,
            utilization: totalUnits / capacity,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt
        };
    });
};

// --- Inventory Operations ---

const getInventory = async (user, filters = {}) => {
    const { role, id: userId, sellerId, createdById } = user;
    const { search, category } = filters;

    let where = {};
    if (role === 'SELLER') {
        if (!sellerId) return [];
        where = { product: { sellerId } };
    } else if (role === 'ADMIN') {
        where = { product: { seller: { adminId: userId } } };
    } else if (role === 'STOCK_KEEPER') {
        // Stock Keeper sees inventory from their admin's sellers
        if (createdById) {
            where = { product: { seller: { adminId: createdById } } };
        }
    }

    if (search) {
        where.OR = [
            { product: { name: { contains: search } } },
            { product: { sku: { contains: search } } }
        ];
    }

    if (category && category !== 'All') {
        where.product = { ...where.product, category };
    }


    return await prisma.inventory.findMany({
        where,
        include: {
            product: {
                select: { name: true, sku: true, price: true, seller: { select: { shopName: true } } }
            },
            warehouse: { select: { name: true } }
        },
        orderBy: { product: { name: 'asc' } }
    });
};

const stockIn = async (data, user) => {
    const { productId, warehouseId, quantity, reason } = data;

    // Upsert Inventory record
    const inventory = await prisma.inventory.upsert({
        where: {
            productId_warehouseId: { productId: parseInt(productId), warehouseId: parseInt(warehouseId) }
        },
        update: {
            quantity: { increment: parseInt(quantity) }
        },
        create: {
            productId: parseInt(productId),
            warehouseId: parseInt(warehouseId),
            quantity: parseInt(quantity)
        }
    });

    // Log movement
    await prisma.stockMovement.create({
        data: {
            inventoryId: inventory.id,
            quantity: parseInt(quantity),
            type: 'IN',
            reason
        }
    });

    await logAction({
        actionType: 'STOCK_IN',
        entityType: 'INVENTORY',
        entityId: inventory.id,
        user,
        metadata: { quantity, reason, productId, warehouseId }
    });

    return inventory;
};

const stockOut = async (data, user) => {
    const { productId, warehouseId, quantity, reason } = data;

    const inventory = await prisma.inventory.findUnique({
        where: {
            productId_warehouseId: { productId: parseInt(productId), warehouseId: parseInt(warehouseId) }
        }
    });

    if (!inventory || !canDeductStock(inventory.quantity, parseInt(quantity))) {
        throw new Error('Insufficient stock levels for this operation');
    }

    const updatedInventory = await prisma.inventory.update({
        where: { id: inventory.id },
        data: {
            quantity: { decrement: parseInt(quantity) }
        }
    });

    // Log movement
    await prisma.stockMovement.create({
        data: {
            inventoryId: inventory.id,
            quantity: -parseInt(quantity),
            type: 'OUT',
            reason
        }
    });

    await logAction({
        actionType: 'STOCK_OUT',
        entityType: 'INVENTORY',
        entityId: updatedInventory.id,
        user,
        metadata: { quantity: -parseInt(quantity), reason, productId, warehouseId }
    });

    return updatedInventory;
};

const getMovementHistory = async (currentUser, filters = {}) => {
    const { role, id: userId, createdById } = currentUser;
    const { search, type } = filters;
    let where = {};

    // 1. Scoping Logic
    if (role === 'ADMIN') {
        where.inventory = { product: { seller: { adminId: userId } } };
    } else if (role === 'STOCK_KEEPER') {
        if (createdById) {
            where.inventory = { product: { seller: { adminId: createdById } } };
        }
        // If no createdById (global), Stock Keeper sees all allowed movements
    }

    // 2. Type Filter
    if (type && type !== 'All') {
        where.type = type === 'Stock In' ? 'IN' : 'OUT';
    }

    // 3. Search Filter
    if (search) {
        where.OR = [
            { id: isNaN(parseInt(search)) ? undefined : parseInt(search) },
            {
                inventory: {
                    OR: [
                        { product: { name: { contains: search } } },
                        { product: { sku: { contains: search } } }
                    ]
                }
            }
        ];
    }

    return await prisma.stockMovement.findMany({
        where,
        include: {
            inventory: {
                include: {
                    product: { select: { name: true, sku: true } },
                    warehouse: { select: { name: true } }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

const getDashboardStats = async (user, period = 'All Time') => {
    const { role, id: userId, createdById } = user;
    const where = {};
    const now = new Date();

    if (period === 'Today') {
        where.createdAt = { gte: new Date(now.setHours(0, 0, 0, 0)) };
    } else if (period === 'This Week') {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        where.createdAt = { gte: new Date(startOfWeek.setHours(0, 0, 0, 0)) };
    } else if (period === 'This Month') {
        where.createdAt = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    }

    // Determine admin ID for filtering
    let adminId = null;
    if (role === 'ADMIN') {
        adminId = userId;
    } else if (role === 'STOCK_KEEPER' && createdById) {
        adminId = createdById;
    }

    // Build product filter for admin scope
    const productFilter = adminId ? { seller: { adminId } } : {};

    const totalProducts = await prisma.product.count({
        where: productFilter
    });

    const totalInventory = await prisma.inventory.aggregate({
        _sum: { quantity: true },
        where: { product: productFilter }
    });
    const totalPieces = totalInventory._sum.quantity || 0;

    const warehousesCount = await prisma.warehouse.count({
        where: adminId ? { adminId } : {}
    });

    const outOfStockCount = await prisma.inventory.count({
        where: {
            quantity: 0,
            product: productFilter
        }
    });

    const lowStockCount = await prisma.inventory.count({
        where: {
            quantity: { gt: 0, lte: 10 },
            product: productFilter
        }
    });

    const ordersAwaitingPickFilter = adminId
        ? { status: 'PACKING', seller: { adminId } }
        : { status: 'PACKING' };

    const ordersAwaitingPick = await prisma.order.count({
        where: ordersAwaitingPickFilter
    });

    // For "Stock Status" chart - breakdown by quantity categories
    const inventoryData = await prisma.inventory.findMany({
        where: { product: productFilter },
        select: { quantity: true }
    });

    const stockStatus = {
        totalItems: totalPieces,
        available: inventoryData.filter(i => i.quantity > 0).length,
        outOfStock: inventoryData.filter(i => i.quantity === 0).length,
        lowStock: lowStockCount
    };

    // Quantities by Warehouse - filtered by admin
    const warehouseStats = await prisma.inventory.groupBy({
        by: ['warehouseId'],
        _sum: { quantity: true },
        where: { product: productFilter }
    });

    // Fetch warehouse names for grouping
    const warehouses = await prisma.warehouse.findMany({
        where: adminId ? { adminId } : {}
    });
    const chartData = warehouses.map(w => ({
        name: w.name,
        quantity: warehouseStats.find(s => s.warehouseId === w.id)?._sum.quantity || 0
    }));

    return {
        stats: {
            totalProducts,
            totalPieces,
            warehouses: warehousesCount,
            nearExpiry: 0, // No field in schema yet
            outOfStock: outOfStockCount,
            lowStock: lowStockCount,
            ordersAwaitingPick
        },
        stockStatus,
        warehouseStats: chartData
    };
};

const getSellerInventoryStats = async (user) => {
    const { sellerId } = user;
    if (!sellerId) return { inventory: [], stats: {} };

    // 1. Fetch filtered inventory
    // Sellers see products they own. 
    // Products might be in Inventory table (if assigned to warehouse) or just Product table (if just created).
    // The UI implies these are "Inventory" items (warehouse assigned).
    // But the "Add Product" note says "can add even if no warehouse".
    // Let's fetch Products and left-join Inventory to show stock.
    // If a product has no inventory record, it has 0 stock.

    const products = await prisma.product.findMany({
        where: { sellerId },
        include: {
            inventory: {
                include: { warehouse: true }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });

    // 2. Map to UI structure & Calculate Stats
    let totalItems = 0;
    let lowStock = 0;
    let outOfStock = 0;
    const warehouseSet = new Set();

    const formattedInventory = products.map(p => {
        // Aggregating stock across all warehouses for this product
        const totalStock = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);

        // Warehouses list
        const warehouses = p.inventory.map(i => i.warehouse.name).join(', ') || 'Unassigned';
        p.inventory.forEach(i => warehouseSet.add(i.warehouseId));

        // Stats calculation
        totalItems++;
        if (totalStock === 0) outOfStock++;
        else if (totalStock <= 10) lowStock++; // Assuming 10 is low stock threshold

        // Status determination
        let stockStatus = 'In Stock';
        if (totalStock === 0) stockStatus = 'Out of Stock';
        else if (totalStock <= 10) stockStatus = 'Low Stock';

        return {
            id: p.id,
            name: p.name,
            sku: p.sku || 'N/A',
            model: p.model || 'N/A', // Assuming model field exists or using filler
            category: p.category || 'Uncategorized',
            price: `AED ${p.price}`,
            stock: totalStock,
            stockStatus,
            status: p.status || 'Active', // status field on Product
            warehouse: warehouses,
            lastUpdated: new Date(p.updatedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        };
    });

    return {
        inventory: formattedInventory,
        stats: {
            totalItems,
            lowStock,
            outOfStock,
            warehouses: warehouseSet.size || (totalItems > 0 ? 1 : 0) // Default to 1 if items exist but no warehouse assigned? Or 0. UI shows 1 in mock.
        }
    };
};

module.exports = {
    createWarehouse,
    listWarehouses,
    getInventory,
    stockIn,
    stockOut,
    getMovementHistory,
    getDashboardStats,
    getSellerInventoryStats
};
