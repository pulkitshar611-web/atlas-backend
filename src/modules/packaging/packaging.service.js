const prisma = require('../../utils/prisma');
const { validateAssignment, validateCompletion } = require('./packaging.helper');
const { logAction } = require('../../utils/auditLogger');

const assignOrder = async (orderId, agentId, user) => {
    await validateAssignment(orderId, agentId);

    // Use a transaction to ensure atomic update and creation
    const task = await prisma.$transaction(async (tx) => {
        // 1. Create the Packaging Task
        const task = await tx.packagingTask.create({
            data: {
                orderId: parseInt(orderId),
                agentId: parseInt(agentId)
            }
        });

        // 2. Update Order status to PACKING
        await tx.order.update({
            where: { id: parseInt(orderId) },
            data: { status: 'IN_PACKAGING' }
        });

        return task;
    });

    await logAction({
        actionType: 'PACKAGING_ASSIGNED',
        entityType: 'ORDER',
        entityId: parseInt(orderId),
        user,
        metadata: { agentId }
    });

    return task;
};

const listTasks = async (user) => {
    const { role, id: userId } = user;

    let where = {};
    if (role === 'PACKAGING_AGENT') {
        where = { agentId: userId };
    } else if (role === 'ADMIN') {
        where = {
            order: {
                seller: { adminId: userId }
            }
        };
    }

    return await prisma.packagingTask.findMany({
        where,
        include: {
            order: {
                include: {
                    customer: true,
                    items: true
                }
            },
            agent: { select: { name: true, email: true } }
        },
        orderBy: { assignedAt: 'desc' }
    });
};

const completeTask = async (taskId, agentId, user, data = {}) => {
    const task = await validateCompletion(taskId, agentId);

    const updatedTask = await prisma.$transaction(async (tx) => {
        // 1. Mark task as completed
        const updatedTask = await tx.packagingTask.update({
            where: { id: parseInt(taskId) },
            data: {
                completedAt: new Date(),
                weight: data.weight ? parseFloat(data.weight) : undefined,
                qualityCheck: data.qualityCheck || undefined,
                notes: data.notes || undefined
            }
        });

        // 2. Update Order status to PACKED
        await tx.order.update({
            where: { id: task.orderId },
            data: { status: 'PACKED' }
        });

        return updatedTask;
    });

    await logAction({
        actionType: 'PACKAGING_COMPLETED',
        entityType: 'ORDER',
        entityId: task.orderId,
        user,
        metadata: {
            taskId: updatedTask.id,
            weight: updatedTask.weight,
            qualityCheck: updatedTask.qualityCheck
        }
    });

    return updatedTask;
};

const getReports = async (user, period = 'today') => {
    const { role, id: userId } = user;

    // Scoping
    let taskScope = {};
    if (role === 'PACKAGING_AGENT') {
        taskScope = { agentId: userId };
    } else if (role === 'ADMIN') {
        taskScope = {
            order: {
                seller: { adminId: userId }
            }
        };
    }

    // Date filtering
    const now = new Date();
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (period === '7d') {
        startDate.setDate(now.getDate() - 7);
    } else if (period === '30d') {
        startDate.setDate(now.getDate() - 30);
    }

    const tasks = await prisma.packagingTask.findMany({
        where: {
            completedAt: { gte: startDate },
            ...taskScope
        },
        orderBy: { completedAt: 'asc' }
    });

    const totalPackages = tasks.length;
    const qualityChecks = tasks.filter(t => t.qualityCheck).length;
    const passed = tasks.filter(t => t.qualityCheck === 'PASSED').length;
    const conditional = tasks.filter(t => t.qualityCheck === 'CONDITIONAL').length;
    const failed = tasks.filter(t => t.qualityCheck === 'FAILED').length;

    const passRate = qualityChecks > 0 ? ((passed / qualityChecks) * 100).toFixed(1) : 0;

    // Avg Duration calculation
    let totalDuration = 0;
    let durationCount = 0;
    tasks.forEach(t => {
        if (t.completedAt && t.assignedAt) {
            const diff = (t.completedAt - t.assignedAt) / (1000 * 60); // minutes
            totalDuration += diff;
            durationCount++;
        }
    });
    const avgDuration = durationCount > 0 ? (totalDuration / durationCount).toFixed(1) : 0;

    // Weight Stats
    const weights = tasks.filter(t => t.weight !== null).map(t => t.weight);
    const avgWeight = weights.length > 0 ? (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(2) : 0;
    const minWeight = weights.length > 0 ? Math.min(...weights).toFixed(2) : 0;
    const maxWeight = weights.length > 0 ? Math.max(...weights).toFixed(2) : 0;

    // Daily Activity
    const dailyMap = {};
    tasks.forEach(t => {
        const dateStr = t.completedAt.toISOString().split('T')[0];
        if (!dailyMap[dateStr]) {
            dailyMap[dateStr] = { date: dateStr, packages: 0, checks: 0, totalDuration: 0, durationCount: 0 };
        }
        dailyMap[dateStr].packages++;
        if (t.qualityCheck) dailyMap[dateStr].checks++;
        if (t.completedAt && t.assignedAt) {
            const diff = (t.completedAt - t.assignedAt) / (1000 * 60);
            dailyMap[dateStr].totalDuration += diff;
            dailyMap[dateStr].durationCount++;
        }
    });

    const dailyActivity = Object.values(dailyMap).map(d => ({
        date: d.date,
        packages: d.packages,
        checks: d.checks,
        avgTime: d.durationCount > 0 ? (d.totalDuration / d.durationCount).toFixed(1) : 0
    }));

    return {
        stats: {
            totalPackages,
            avgDuration,
            qualityChecks,
            passRate
        },
        qualityResults: {
            passed,
            conditional,
            failed
        },
        weightStats: {
            avgWeight,
            minWeight,
            maxWeight
        },
        dailyActivity
    };
};

const getDashboardStats = async (user) => {
    const { role, id: userId } = user;

    let orderScope = {};
    let taskScope = {};

    if (role === 'PACKAGING_AGENT') {
        const agent = await prisma.user.findUnique({
            where: { id: userId },
            select: { createdById: true }
        });

        if (agent?.createdById) {
            orderScope = {
                seller: { adminId: agent.createdById }
            };
            taskScope = { agentId: userId };
        }
    } else if (role === 'ADMIN') {
        orderScope = {
            seller: { adminId: userId }
        };
        taskScope = {
            order: {
                seller: { adminId: userId }
            }
        };
    }

    // 1. Pending Packaging
    const pendingCount = await prisma.order.count({
        where: {
            status: 'CONFIRMED',
            ...orderScope
        }
    });

    // 2. In Progress
    const inProgressCount = await prisma.order.count({
        where: {
            status: 'IN_PACKAGING',
            ...orderScope
        }
    });

    // 3. Completed Today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const completedTodayCount = await prisma.packagingTask.count({
        where: {
            completedAt: { gte: startOfDay },
            ...taskScope
        }
    });

    // 4. Total Records
    const totalRecords = await prisma.packagingTask.count({
        where: {
            ...taskScope
        }
    });

    // 5. Recent Packaging Tasks (Show only completed/packed tasks)
    const recentPackaging = await prisma.packagingTask.findMany({
        where: {
            completedAt: { not: null },
            ...taskScope
        },
        take: 5,
        orderBy: { completedAt: 'desc' },
        include: {
            order: {
                select: {
                    orderNumber: true,
                    customerName: true
                }
            },
            agent: {
                select: { name: true }
            }
        }
    });

    // 6. Confirmed Orders (Ready for packaging)
    const confirmedOrders = await prisma.order.findMany({
        where: {
            status: 'CONFIRMED',
            ...orderScope
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            orderNumber: true,
            customerName: true,
            status: true,
            createdAt: true
        }
    });

    return {
        stats: {
            pending: pendingCount,
            inProgress: inProgressCount,
            completedToday: completedTodayCount,
            total: totalRecords
        },
        recentPackaging: recentPackaging.map(task => ({
            id: task.id,
            orderNumber: task.order?.orderNumber,
            customerName: task.order?.customerName,
            agentName: task.agent?.name,
            completedAt: task.completedAt || task.updatedAt
        })),
        confirmedOrders
    };
};

const getMaterialsStats = async (user) => {
    const { role, id: userId } = user;
    let where = {};

    if (role === 'PACKAGING_AGENT') {
        const agent = await prisma.user.findUnique({
            where: { id: userId },
            select: { createdById: true }
        });
        where = { adminId: agent?.createdById || null };
    } else if (role === 'ADMIN') {
        where = { adminId: userId };
    }

    // 1. Initial counts
    const totalMaterials = await prisma.packagingMaterial.count({ where });

    // 2. Fetch all materials to calculate kompleks stats (Prisma doesn't support col-to-col comparison easily)
    const materials = await prisma.packagingMaterial.findMany({ where });

    const lowStockItems = materials.filter(m => m.stock <= (m.minLevel || 0));
    const outOfStockItems = materials.filter(m => m.stock === 0);
    const totalValue = materials.reduce((acc, m) => acc + (m.stock * m.cost), 0);

    return {
        totalMaterials,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        totalValue,
        lowStockItems: lowStockItems.slice(0, 5),
        outOfStockItems: outOfStockItems.slice(0, 5)
    };
};

const listMaterials = async (user) => {
    const { role, id: userId } = user;

    let where = {};
    if (role === 'PACKAGING_AGENT') {
        const agent = await prisma.user.findUnique({
            where: { id: userId },
            select: { createdById: true }
        });
        where = { adminId: agent?.createdById || null };
    } else if (role === 'ADMIN') {
        where = { adminId: userId };
    }

    return await prisma.packagingMaterial.findMany({
        where,
        orderBy: { name: 'asc' }
    });
};

const createMaterial = async (data, user) => {
    const { role, id: userId } = user;

    let adminId = userId;
    if (role === 'PACKAGING_AGENT') {
        const agent = await prisma.user.findUnique({
            where: { id: userId },
            select: { createdById: true }
        });
        adminId = agent?.createdById;
    }

    return await prisma.packagingMaterial.create({
        data: {
            name: data.name,
            type: data.type,
            stock: parseInt(data.stock) || 0,
            minLevel: parseInt(data.minLevel) || 0,
            cost: parseFloat(data.cost) || 0,
            adminId
        }
    });
};

const updateMaterial = async (id, data, user) => {
    // Basic ownership check could be added here
    return await prisma.packagingMaterial.update({
        where: { id: parseInt(id) },
        data: {
            ...data,
            cost: data.cost ? parseFloat(data.cost) : undefined,
            stock: data.stock !== undefined ? parseInt(data.stock) : undefined,
            minLevel: data.minLevel !== undefined ? parseInt(data.minLevel) : undefined
        }
    });
};

const deleteMaterial = async (id, user) => {
    // Basic ownership check could be added here
    return await prisma.packagingMaterial.delete({
        where: { id: parseInt(id) }
    });
};

module.exports = {
    assignOrder,
    listTasks,
    completeTask,
    getDashboardStats,
    getMaterialsStats,
    listMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    getReports
};
