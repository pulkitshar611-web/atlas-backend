const prisma = require('../../utils/prisma');

/**
 * Deduct stock for all items in an order when it's marked as PACKED
 * @param {number} orderId - The order ID
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<Array>} Array of stock movements created
 */
const deductStockForOrder = async (orderId, tx = null) => {
    const prismaClient = tx || prisma;

    // Fetch order with all items
    const order = await prismaClient.order.findUnique({
        where: { id: orderId },
        include: {
            items: true
        }
    });

    if (!order) {
        throw new Error('Order not found');
    }

    const stockMovements = [];
    const errors = [];

    // Process each order item
    for (const item of order.items) {
        // Skip items without productId (custom/manual items)
        if (!item.productId) {
            continue;
        }

        // Find inventory record for this product (first available warehouse)
        const inventory = await prismaClient.inventory.findFirst({
            where: {
                productId: item.productId,
                quantity: { gte: item.quantity } // Only get inventory with sufficient stock
            },
            include: {
                product: {
                    select: { name: true, sku: true }
                },
                warehouse: {
                    select: { name: true }
                }
            }
        });

        if (!inventory) {
            // Check if product exists in inventory at all
            const anyInventory = await prismaClient.inventory.findFirst({
                where: { productId: item.productId },
                include: {
                    product: { select: { name: true, sku: true } }
                }
            });

            if (!anyInventory) {
                errors.push(`Product "${item.product || item.productId}" has no inventory record in any warehouse`);
            } else {
                errors.push(`Not enough stock for Product "${anyInventory.product.name}" (SKU: ${anyInventory.product.sku}). Required: ${item.quantity}, Available: ${anyInventory.quantity}`);
            }
            continue;
        }

        // Deduct stock using atomic decrement
        const updatedInventory = await prismaClient.inventory.update({
            where: { id: inventory.id },
            data: {
                quantity: { decrement: item.quantity }
            }
        });

        // Create stock movement log
        const movement = await prismaClient.stockMovement.create({
            data: {
                inventoryId: inventory.id,
                quantity: -item.quantity,
                type: 'OUT',
                reason: `Order #${order.orderNumber} Packed`
            }
        });

        stockMovements.push(movement);
    }

    // If there were any errors, throw them
    if (errors.length > 0) {
        throw new Error(errors.join('; '));
    }

    return stockMovements;
};

/**
 * Restore stock for all items in an order when a PACKED order is cancelled
 * @param {number} orderId - The order ID
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<Array>} Array of stock movements created
 */
const restoreStockForOrder = async (orderId, tx = null) => {
    const prismaClient = tx || prisma;

    // Fetch order with all items
    const order = await prismaClient.order.findUnique({
        where: { id: orderId },
        include: {
            items: true
        }
    });

    if (!order) {
        throw new Error('Order not found');
    }

    const stockMovements = [];

    // Find all previous stock movements for this order (OUT movements)
    const previousMovements = await prismaClient.stockMovement.findMany({
        where: {
            reason: `Order #${order.orderNumber} Packed`,
            type: 'OUT'
        },
        include: {
            inventory: true
        }
    });

    // Restore stock for each previous deduction
    for (const movement of previousMovements) {
        // Increment stock back
        await prismaClient.inventory.update({
            where: { id: movement.inventoryId },
            data: {
                quantity: { increment: Math.abs(movement.quantity) }
            }
        });

        // Create restoration movement log
        const restorationMovement = await prismaClient.stockMovement.create({
            data: {
                inventoryId: movement.inventoryId,
                quantity: Math.abs(movement.quantity),
                type: 'IN',
                reason: `Order #${order.orderNumber} Cancelled - Stock Restored`
            }
        });

        stockMovements.push(restorationMovement);
    }

    return stockMovements;
};

/**
 * Validate if sufficient stock is available for an order
 * @param {number} orderId - The order ID
 * @returns {Promise<Object>} Validation result with available flag and errors
 */
const validateStockAvailability = async (orderId) => {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: true
        }
    });

    if (!order) {
        return { available: false, errors: ['Order not found'] };
    }

    const errors = [];

    for (const item of order.items) {
        if (!item.productId) continue;

        const inventory = await prisma.inventory.findFirst({
            where: {
                productId: item.productId,
                quantity: { gte: item.quantity }
            },
            include: {
                product: { select: { name: true, sku: true } }
            }
        });

        if (!inventory) {
            const anyInventory = await prisma.inventory.findFirst({
                where: { productId: item.productId },
                include: { product: { select: { name: true } } }
            });

            if (!anyInventory) {
                errors.push(`Product "${item.product}" has no inventory record`);
            } else {
                errors.push(`Insufficient stock for "${anyInventory.product.name}"`);
            }
        }
    }

    return {
        available: errors.length === 0,
        errors
    };
};

module.exports = {
    deductStockForOrder,
    restoreStockForOrder,
    validateStockAvailability
};
