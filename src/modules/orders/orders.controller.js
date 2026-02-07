const prisma = require('../../utils/prisma'); // Adjusted path

const getOrders = async (req, res) => {
    const { role, id: userId, sellerId: userSellerId } = req.user;
    const { status } = req.query;

    try {
        let where = {};

        if (status) {
            where.status = status;
        }

        if (role === 'SELLER') {
            let sellerId = userSellerId;
            if (!sellerId) {
                const seller = await prisma.seller.findUnique({ where: { userId: userId } });
                sellerId = seller?.id;
            }
            if (!sellerId) return res.json([]);
            where.sellerId = sellerId;
        } else if (role === 'CALL_CENTER_AGENT' || role === 'CALL_CENTER_MANAGER') {
            where.status = 'PENDING_REVIEW';
        } else if (role === 'PACKAGING_AGENT') {
            // See only CONFIRMED orders that need packaging
            where.status = 'CONFIRMED';
        } else if (role === 'DELIVERY_AGENT') {
            // See only PACKED orders that need delivery
            where.status = 'PACKED';
        } else if (role === 'STOCK_KEEPER') {
            // Stock keepers see everything for inventory purposes
            where = {};
        } else if (role === 'ADMIN') {
            // Admin sees ONLY orders where order.seller.adminId === logged-in admin id
            where.seller = {
                adminId: userId
            };
        } else if (role === 'SUPER_ADMIN') {
            // Full access, no additional filtering
        } else {

            return res.status(403).json({ message: 'Unauthorized access' });
        }


        const orders = await prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                orderNumber: true,
                customerName: true,
                customerPhone: true,
                orderDate: true,
                status: true,
                totalAmount: true,
                createdAt: true
            }
        });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
};

const getOrderById = async (req, res) => {
    const { id } = req.params;
    const { role, id: userId, sellerId: userSellerId } = req.user;

    const numericId = parseInt(id);
    if (isNaN(numericId)) {
        return res.status(400).json({ message: 'Invalid order ID format' });
    }

    try {
        const order = await prisma.order.findUnique({
            where: { id: numericId },
            include: { items: true }
        });

        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Access Control
        if (role === 'SELLER') {
            let sellerId = userSellerId;
            if (!sellerId) {
                const seller = await prisma.seller.findUnique({ where: { userId: userId } });
                sellerId = seller?.id;
            }
            if (order.sellerId !== sellerId) {
                return res.status(403).json({ message: 'Unauthorized access to this order' });
            }
        } else if (role === 'ADMIN') {
            // Fetch seller details to check adminId
            const seller = await prisma.seller.findUnique({
                where: { id: order.sellerId }
            });
            if (seller?.adminId !== userId) {
                return res.status(403).json({ message: 'Unauthorized access: This order belongs to another tenant' });
            }
        }
        // Call center roles and super admins can see any order (within their scope if defined)


        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching order details', error: error.message });
    }
};

const createOrder = async (req, res) => {
    const {
        customerName,
        customerPhone,
        orderDate,
        status,
        items,
        totalAmount,
        shippingAddress,
        customerNotes,
        internalNotes
    } = req.body;
    const { role, id: userId, sellerId: userSellerId } = req.user;

    // 1. Validation
    if (!customerName || !customerPhone) {
        return res.status(400).json({ message: 'customerName and customerPhone are required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'items must be a non-empty array' });
    }

    try {
        // 2. Resolve Seller ID
        let sellerId = userSellerId;
        if (!sellerId && role === 'SELLER') {
            const seller = await prisma.seller.findUnique({ where: { userId: userId } });
            sellerId = seller?.id;
        }

        // If Admin is creating and no sellerId provided in user profile (which is true for Admin),
        // we must check the payload for the selected sellerId.
        if (!sellerId && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
            if (req.body.sellerId) {
                sellerId = req.body.sellerId;
            } else {
                return res.status(400).json({ message: 'Seller ID is required for Admin to create order' });
            }
        }

        if (!sellerId) {
            return res.status(400).json({ message: 'Seller ID could not be determined' });
        }

        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newOrder = await prisma.order.create({
            data: {
                orderNumber,
                customerName,
                customerPhone,
                orderDate,
                status: status || 'PENDING_REVIEW',
                totalAmount: totalAmount ? parseFloat(totalAmount) : 0,
                shippingAddress,
                customerNotes,
                internalNotes,
                seller: {
                    connect: { id: parseInt(sellerId) }
                },
                items: {
                    create: items.map(item => ({
                        productId: item.productId ? parseInt(item.productId) : null,
                        variant: item.variant || null,
                        quantity: parseInt(item.quantity) || 1,
                        price: parseFloat(item.price) || 0,
                        product: item.productName || `Product #${item.productId}`
                    }))
                }
            },
            include: {
                items: true
            }
        });

        res.status(201).json({
            message: 'Order created successfully',
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber
        });

    } catch (error) {
        console.error('Order Creation Error:', error);
        res.status(500).json({ message: 'Internal server error during order creation', error: error.message });
    }
};


const updateOrderStatus = async (req, res) => {
    const { id: orderId } = req.params;
    const { status: nextStatus } = req.body;
    const { role } = req.user;

    // 1. Strict status validation
    const allowedStatuses = ['CONFIRMED', 'CANCELLED', 'PACKED', 'IN_PACKAGING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED'];
    if (!allowedStatuses.includes(nextStatus)) {
        return res.status(400).json({ message: 'Invalid status requested.' });
    }

    try {
        const order = await prisma.order.findUnique({ where: { id: parseInt(orderId) } });

        if (!order) return res.status(404).json({ message: 'Order not found' });

        const activeStatus = order.status;

        // 2. Role & Transition Logic
        if (role === 'CALL_CENTER_AGENT' || role === 'CALL_CENTER_MANAGER') {
            if (activeStatus !== 'PENDING_REVIEW') {
                return res.status(400).json({ message: 'Call Center can only process PENDING_REVIEW orders.' });
            }
            if (!['CONFIRMED', 'CANCELLED'].includes(nextStatus)) {
                return res.status(400).json({ message: 'Call Center can only CONFIRM or CANCEL.' });
            }
        } else if (role === 'PACKAGING_AGENT' || role === 'STOCK_KEEPER') {
            if (activeStatus === 'CONFIRMED') {
                if (nextStatus !== 'IN_PACKAGING') {
                    return res.status(400).json({ message: 'Can only move CONFIRMED orders to IN_PACKAGING.' });
                }
            } else if (activeStatus === 'IN_PACKAGING') {
                // If packaging agent, must be assigned
                if (role === 'PACKAGING_AGENT') {
                    const task = await prisma.packagingTask.findUnique({ where: { orderId: parseInt(orderId) } });
                    if (!task || task.agentId !== req.user.id) {
                        return res.status(403).json({ message: 'You are not assigned to this packaging task.' });
                    }
                }

                if (nextStatus !== 'PACKED') {
                    return res.status(400).json({ message: 'Can only move IN_PACKAGING orders to PACKED.' });
                }
            } else {
                return res.status(400).json({ message: 'Invalid status for this role.' });
            }
        } else if (role === 'DELIVERY_AGENT') {
            if (activeStatus === 'PACKED') {
                if (nextStatus !== 'OUT_FOR_DELIVERY') {
                    return res.status(400).json({ message: 'Can only move PACKED orders to OUT_FOR_DELIVERY.' });
                }
            } else if (activeStatus === 'OUT_FOR_DELIVERY') {
                // Must be assigned to this agent
                const task = await prisma.deliveryTask.findUnique({ where: { orderId: parseInt(orderId) } });
                if (!task || task.agentId !== req.user.id) {
                    return res.status(403).json({ message: 'You are not assigned to this delivery task.' });
                }

                if (!['DELIVERED', 'DELIVERY_FAILED'].includes(nextStatus)) {
                    return res.status(400).json({ message: 'Can only move OUT_FOR_DELIVERY to DELIVERED or DELIVERY_FAILED.' });
                }
            } else {
                return res.status(400).json({ message: 'Invalid status for Delivery Agent.' });
            }
        } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            // Admins can transition to any logically valid next status
            // For now, let's just bypass the specific role checks
        } else {
            return res.status(403).json({ message: 'Unauthorized. Role not allowed for this status update.' });
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const ord = await tx.order.update({
                where: { id: parseInt(orderId) },
                data: { status: nextStatus }
            });

            // Handle Task Creation/Completion
            if (nextStatus === 'IN_PACKAGING') {
                await tx.packagingTask.create({
                    data: {
                        orderId: ord.id,
                        agentId: req.user.id
                    }
                });
            } else if (nextStatus === 'PACKED') {
                await tx.packagingTask.update({
                    where: { orderId: ord.id },
                    data: {
                        completedAt: new Date(),
                        weight: req.body.weight ? parseFloat(req.body.weight) : undefined,
                        qualityCheck: req.body.qualityCheck || undefined,
                        notes: req.body.notes || undefined
                    }
                });
            } else if (nextStatus === 'OUT_FOR_DELIVERY') {
                await tx.deliveryTask.create({
                    data: {
                        orderId: ord.id,
                        agentId: req.user.id
                    }
                });
            } else if (nextStatus === 'DELIVERED') {
                await tx.deliveryTask.update({
                    where: { orderId: ord.id },
                    data: {
                        completedAt: new Date(),
                        receiverName: req.body.receiverName || 'Unknown',
                        notes: req.body.notes || null
                    }
                });
            } else if (nextStatus === 'DELIVERY_FAILED') {
                await tx.deliveryTask.update({
                    where: { orderId: ord.id },
                    data: {
                        completedAt: new Date(), // Mark finished even if failed
                        notes: req.body.notes || 'Delivery Failed'
                    }
                });
            }

            return ord;
        });

        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

const getPackagingOrders = async (req, res) => {
    const { role, id: userId } = req.user;

    const allowedRoles = ['PACKAGING_AGENT', 'STOCK_KEEPER', 'ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: 'Unauthorized. Only Packaging Agents, Stock Keepers and Admins can access this endpoint.' });
    }

    try {
        let where = {};

        if (role === 'ADMIN' || role === 'STOCK_KEEPER') {
            let adminId = userId;
            let isGlobal = false;

            if (role === 'STOCK_KEEPER') {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { createdById: true }
                });

                if (user?.createdById) {
                    adminId = user.createdById;
                } else {
                    // If no creator, treat as global/central stock keeper
                    isGlobal = true;
                }
            }

            // Base where clause
            // Admin only needs to see orders ready for packaging (CONFIRMED)
            // or those still in packaging. Packed orders should move to delivery.
            where = {
                status: { in: ['CONFIRMED', 'IN_PACKAGING'] }
            };

            // Apply admin scoping if NOT global
            if (!isGlobal) {
                where.seller = {
                    adminId: adminId
                };
            }
        } else if (role === 'SUPER_ADMIN') {
            // Super Admin sees everything
            where = {
                status: { in: ['CONFIRMED', 'IN_PACKAGING'] }
            };
        } else if (role === 'PACKAGING_AGENT') {
            // Fetch the agent to get their admin (createdById)
            const agent = await prisma.user.findUnique({
                where: { id: userId },
                select: { createdById: true }
            });

            if (!agent || !agent.createdById) {
                return res.json({ orders: [] });
            }

            const adminId = agent.createdById;

            where = {
                OR: [
                    {
                        // 1. New orders ready for packaging (scoped to this Admin's tenants)
                        status: 'CONFIRMED',
                        seller: {
                            adminId: adminId
                        }
                    },
                    {
                        // 2. Orders already being packed OR completed by THIS agent
                        status: { in: ['IN_PACKAGING', 'PACKED'] },
                        packagingTask: {
                            agentId: userId
                        }
                    }
                ]
            };
        }

        const orders = await prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' }, // Show newest first
            include: {
                items: true,
                packagingTask: {
                    include: {
                        agent: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        res.json({ orders });
    } catch (error) {
        console.error("Packaging Fetch Error:", error);
        res.status(500).json({ message: 'Error fetching packaging orders', error: error.message });
    }
};

module.exports = { getOrders, getOrderById, createOrder, updateOrderStatus, getPackagingOrders };
