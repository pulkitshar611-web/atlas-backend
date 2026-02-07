const prisma = require('../../utils/prisma');
const { ORDER_STATUS, isValidTransition, canRoleUpdateToStatus } = require('./orderStatus.helper');
const { logAction } = require('../../utils/auditLogger');

const createOrder = async (orderData, user) => {
    const {
        customerPhone,
        customerName,
        customerEmail, // Kept for logic, though removed from frontend payload
        shippingAddress,
        customerAddress,
        items,
        orderItems,
        sellerId: requestedSellerId,
        status: requestedStatus,
        orderDate,
        customerNotes,
        internalNotes
    } = orderData;

    // 1. Robust Item Validation
    const itemsToProcess = items || orderItems;
    if (!itemsToProcess || !Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
        throw new Error('Order must contain at least one item (items array is required)');
    }

    // 2. Field Mapping
    const finalAddress = shippingAddress || customerAddress;
    if (!customerPhone || !customerName) {
        throw new Error('Customer name and phone are required');
    }

    // Identify Seller
    let sellerId;
    if (user.role === 'SELLER') {
        sellerId = user.sellerId;
    } else if (['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        if (!requestedSellerId) {
            throw new Error('Seller ID is required for Admin/Super Admin to create an order');
        }
        sellerId = requestedSellerId;
    }

    if (!sellerId) {
        throw new Error('Seller ID could not be determined');
    }

    // 3. Prisma Transaction for Atomic Creation
    return await prisma.$transaction(async (tx) => {
        // A. Find or Create Customer
        const customer = await tx.customer.upsert({
            where: { phone: customerPhone },
            update: {
                name: customerName,
                email: customerEmail || null,
                address: finalAddress || null
            },
            create: {
                name: customerName,
                phone: customerPhone,
                email: customerEmail || null,
                address: finalAddress || null
            }
        });

        // B. Fetch Product Names for OrderItems (since schema uses String for product)
        const itemsWithNames = await Promise.all(itemsToProcess.map(async (item) => {
            if (!item.productId || !item.quantity) {
                throw new Error('Each item must have a productId and quantity');
            }
            const product = await tx.product.findUnique({
                where: { id: parseInt(item.productId) }
            });
            return {
                product: product ? product.name : `Product #${item.productId}`,
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price || (product ? product.price : 0))
            };
        }));

        // C. Generate Order Number
        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // D. Create Order
        const order = await tx.order.create({
            data: {
                orderNumber,
                status: requestedStatus || ORDER_STATUS.CREATED,
                sellerId: parseInt(sellerId),
                customerId: customer.id,
                // Redundant fields as per schema (snapshot shows these exist on Order table)
                customerName: customerName,
                customerPhone: customerPhone,
                shippingAddress: finalAddress,
                orderDate: orderDate || new Date().toISOString(),
                customerNotes: customerNotes || null,
                internalNotes: internalNotes || null,
                totalAmount: itemsWithNames.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                items: {
                    create: itemsWithNames
                }
            },
            include: {
                customer: true,
                items: true,
                seller: { include: { user: { select: { name: true } } } }
            }
        });

        // E. Log Action
        await logAction({
            actionType: 'ORDER_CREATED',
            entityType: 'ORDER',
            entityId: order.id,
            user,
            metadata: { orderNumber, customerName }
        });

        return order;
    });
};

const getOrders = async (user) => {
    const { role, userId, sellerId } = user;

    let where = {};

    if (role === 'SELLER') {
        if (!sellerId) return [];
        where = { sellerId };
    } else if (['ADMIN', 'SUPER_ADMIN', 'CALL_CENTER_AGENT', 'CALL_CENTER_MANAGER', 'STOCK_KEEPER', 'PACKAGING_AGENT', 'DELIVERY_AGENT'].includes(role)) {
        // Agents currently view all/assigned. For this module, we show read-only list.
        // Later modules will refine this with assignments.
        where = {};
    }

    return await prisma.order.findMany({
        where,
        include: {
            customer: true,
            seller: { include: { user: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'desc' }
    });
};

const getOrderById = async (orderId, user) => {
    const order = await prisma.order.findUnique({
        where: { id: parseInt(orderId) },
        include: {
            customer: true,
            items: true,
            seller: { include: { user: { select: { name: true } } } }
        }
    });

    if (!order) throw new Error('Order not found');

    // Ownership check for Sellers
    if (user.role === 'SELLER' && order.sellerId !== user.sellerId) {
        throw new Error('Forbidden: You do not have access to this order');
    }

    return order;
};

const updateOrderStatus = async (orderId, nextStatus, user) => {
    const order = await prisma.order.findUnique({
        where: { id: parseInt(orderId) }
    });

    if (!order) throw new Error('Order not found');

    // 1. Role Permission Check
    if (!canRoleUpdateToStatus(user.role, nextStatus)) {
        throw new Error(`Forbidden: Role ${user.role} cannot update status to ${nextStatus}`);
    }

    // 2. Lifecycle Transition Validation
    if (!isValidTransition(order.status, nextStatus)) {
        throw new Error(`Invalid transition: Cannot move order from ${order.status} to ${nextStatus}`);
    }

    // 3. Update Status
    const updatedOrder = await prisma.order.update({
        where: { id: parseInt(orderId) },
        data: { status: nextStatus },
        include: { customer: true }
    });

    await logAction({
        actionType: 'ORDER_STATUS_UPDATE',
        entityType: 'ORDER',
        entityId: updatedOrder.id,
        user,
        metadata: { previousStatus: order.status, nextStatus }
    });

    return updatedOrder;
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus
};
