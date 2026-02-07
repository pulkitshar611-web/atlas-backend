const prisma = require('../../utils/prisma');
const { validateAssignment, validateCompletion } = require('./delivery.helper');
const { logAction } = require('../../utils/auditLogger');

const assignOrder = async (orderId, agentId, user) => {
    await validateAssignment(orderId, agentId);

    const task = await prisma.$transaction(async (tx) => {
        // 1. Create Delivery Task
        const task = await tx.deliveryTask.create({
            data: {
                orderId: parseInt(orderId),
                agentId: parseInt(agentId)
            }
        });

        // 2. Update Order status to OUT_FOR_DELIVERY
        await tx.order.update({
            where: { id: parseInt(orderId) },
            data: { status: 'OUT_FOR_DELIVERY' }
        });

        return task;
    });

    await logAction({
        actionType: 'DELIVERY_ASSIGNED',
        entityType: 'ORDER',
        entityId: parseInt(orderId),
        user,
        metadata: { agentId }
    });

    return task;
};

const listTasks = async (user) => {
    const { role, userId } = user;

    let where = {};
    if (role === 'DELIVERY_AGENT') {
        where = { agentId: userId };
    }

    return await prisma.deliveryTask.findMany({
        where,
        include: {
            order: {
                include: {
                    customer: true,
                    items: true,
                    seller: { include: { user: { select: { name: true } } } }
                }
            },
            agent: { select: { name: true, email: true } }
        },
        orderBy: { assignedAt: 'desc' }
    });
};

const startDelivery = async (taskId, agentId) => {
    const task = await prisma.deliveryTask.findUnique({
        where: { id: parseInt(taskId) },
        include: { order: true }
    });

    if (!task) throw new Error('Delivery task not found');
    if (task.agentId !== parseInt(agentId)) throw new Error('Forbidden: Not your task');

    return await prisma.deliveryTask.update({
        where: { id: parseInt(taskId) },
        data: { startedAt: new Date() }
    });
};

const completeDelivery = async (taskId, agentId, proof, user) => {
    const task = await validateCompletion(taskId, agentId);
    const { receiverName, notes } = proof;

    if (!receiverName) throw new Error('Receiver name is required for proof of delivery');

    const updatedTask = await prisma.$transaction(async (tx) => {
        // 1. Mark Delivery Task as completed
        const updatedTask = await tx.deliveryTask.update({
            where: { id: parseInt(taskId) },
            data: {
                completedAt: new Date(),
                receiverName,
                notes
            }
        });

        // 2. Update Order status to DELIVERED
        await tx.order.update({
            where: { id: task.orderId },
            data: { status: 'DELIVERED' }
        });

        return updatedTask;
    });

    await logAction({
        actionType: 'DELIVERY_COMPLETED',
        entityType: 'ORDER',
        entityId: task.orderId,
        user,
        metadata: { taskId: updatedTask.id, receiverName }
    });

    return updatedTask;
};


const getDeliveryOrders = async (user) => {
    const { role, id: userId } = user;

    // 1. Get agent's admin
    const agent = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdById: true }
    });

    const adminId = agent?.createdById;

    // 2. Fetch orders
    // - PACKED (Unassigned) -> Available to pick up (scoped to Admin's tenants if adminId exists, else all unassigned)
    // - OUT_FOR_DELIVERY / DELIVERED / DELIVERY_FAILED -> Assigned to THIS agent
    const orders = await prisma.order.findMany({
        where: {
            OR: [
                {
                    status: 'PACKED',
                    ...(adminId ? { seller: { adminId: adminId } } : {})
                },
                {
                    status: { in: ['OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED'] },
                    deliveryTask: { agentId: userId }
                }
            ]
        },
        include: {
            customer: true,
            deliveryTask: true,
            items: true,
            seller: { include: { user: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'desc' }
    });

    return orders;
};

// Admin: Get ALL orders (all statuses) for delivery management
const getAllOrders = async (user) => {
    const { role, id: userId } = user;

    if (role !== 'ADMIN') {
        throw new Error('Only admins can access all orders');
    }

    // Get all orders from sellers created by this admin
    const orders = await prisma.order.findMany({
        where: {
            seller: { adminId: userId }
        },
        include: {
            customer: true,
            items: true,
            seller: {
                select: {
                    shopName: true,
                    user: { select: { name: true } }
                }
            },
            deliveryTask: {
                include: {
                    agent: { select: { name: true, email: true } }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return orders;
};

// Admin: Get orders with OUT_FOR_DELIVERY status (Pending Delivery Confirmations)
const getPendingConfirmations = async (user) => {
    const { role, id: userId } = user;

    if (role !== 'ADMIN') {
        throw new Error('Only admins can access pending confirmations');
    }

    const orders = await prisma.order.findMany({
        where: {
            status: 'OUT_FOR_DELIVERY',
            seller: { adminId: userId }
        },
        include: {
            customer: true,
            items: true,
            seller: {
                select: {
                    shopName: true,
                    user: { select: { name: true } }
                }
            },
            deliveryTask: {
                include: {
                    agent: { select: { name: true, email: true } }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return orders;
};

// Admin: Get orders with DELIVERY_FAILED status (Returned Orders)
const getReturnedOrders = async (user) => {
    const { role, id: userId } = user;

    if (role !== 'ADMIN') {
        throw new Error('Only admins can access returned orders');
    }

    const orders = await prisma.order.findMany({
        where: {
            status: 'DELIVERY_FAILED',
            seller: { adminId: userId }
        },
        include: {
            customer: true,
            items: true,
            seller: {
                select: {
                    shopName: true,
                    user: { select: { name: true } }
                }
            },
            deliveryTask: {
                include: {
                    agent: { select: { name: true, email: true } }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return orders;
};

const getStats = async (user) => {
    const { id: userId, role } = user;

    if (role === 'ADMIN') {
        // Admin Stats logic
        const orders = await prisma.order.findMany({
            where: {
                seller: { adminId: userId }
            },
            select: { status: true }
        });

        const total = orders.length;
        const completed = orders.filter(o => o.status === 'DELIVERED').length;
        const cancelled = orders.filter(o => o.status === 'CANCELLED').length;
        const pending = orders.filter(o => ['PACKED', 'OUT_FOR_DELIVERY'].includes(o.status)).length;
        const pendingConfirmations = orders.filter(o => o.status === 'PENDING_REVIEW').length;

        return {
            total,
            completed,
            cancelled,
            pending,
            pendingConfirmations
        };
    }

    // Agent's performance stats from DeliveryTasks
    const tasks = await prisma.deliveryTask.findMany({
        where: { agentId: userId },
        include: { order: { select: { status: true } } }
    });

    // Also need count of PACKED orders available to pick up (scoped to admin)
    const agent = await prisma.user.findUnique({ where: { id: userId }, select: { createdById: true } });
    let readyCount = 0;

    readyCount = await prisma.order.count({
        where: {
            status: 'PACKED',
            ...(agent?.createdById ? { seller: { adminId: agent.createdById } } : {})
        }
    });

    const inDelivery = tasks.filter(t => t.order.status === 'OUT_FOR_DELIVERY').length;
    const deliveredCount = tasks.filter(t => t.order.status === 'DELIVERED').length;
    const failedCount = tasks.filter(t => t.order.status === 'DELIVERY_FAILED').length;

    // Daily History Logic
    const dailyStats = tasks.reduce((acc, task) => {
        if (!task.completedAt) return acc;
        const date = new Date(task.completedAt).toISOString().split('T')[0];
        if (!acc[date]) {
            acc[date] = { date, delivered: 0, failed: 0, total: 0, totalTime: 0 };
        }
        if (task.order.status === 'DELIVERED') acc[date].delivered++;
        if (task.order.status === 'DELIVERY_FAILED') acc[date].failed++;

        if (task.startedAt && task.completedAt) {
            const duration = (new Date(task.completedAt) - new Date(task.startedAt)) / (1000 * 60); // minutes
            acc[date].totalTime += duration;
        }

        acc[date].total++;
        return acc;
    }, {});

    const dailyHistory = Object.values(dailyStats)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(day => ({
            ...day,
            avgTime: day.total > 0 && day.totalTime > 0 ? Math.round(day.totalTime / day.total) : '--'
        }));

    const globalAvgTime = dailyHistory.length > 0
        ? Math.round(dailyHistory.reduce((s, h) => s + (typeof h.avgTime === 'number' ? h.avgTime : 0), 0) / dailyHistory.filter(h => typeof h.avgTime === 'number').length || 0)
        : '--';

    return {
        readyForDelivery: readyCount,
        inDelivery,
        delivered: deliveredCount,
        failed: failedCount,
        totalAssigned: tasks.length,
        total: readyCount + inDelivery + deliveredCount + failedCount,
        dailyHistory,
        avgDuration: globalAvgTime
    };
};

module.exports = {
    assignOrder,
    listTasks,
    startDelivery,
    completeDelivery,
    getDeliveryOrders,
    getAllOrders,
    getPendingConfirmations,
    getReturnedOrders,
    getStats
};
