const prisma = require('../../utils/prisma');

const getDashboardStats = async () => {
    // 1. Total Revenue: SUM of completed payments (COMPLETED or DELIVERED)
    const totalRevenueAgg = await prisma.order.aggregate({
        where: { status: { in: ['COMPLETED', 'DELIVERED'] } },
        _sum: { totalAmount: true }
    });
    const totalRevenue = totalRevenueAgg._sum.totalAmount || 0;

    // 2. Today's Sales: SUM of today's completed payments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySalesAgg = await prisma.order.aggregate({
        where: {
            status: { in: ['COMPLETED', 'DELIVERED'] },
            createdAt: { gte: today }
        },
        _sum: { totalAmount: true }
    });
    const todaySales = todaySalesAgg._sum.totalAmount || 0;

    // 3. Pending Payments: COUNT where status = PENDING (or CREATED in our schema)
    const pendingPaymentsCount = await prisma.order.count({
        where: { status: { in: ['CREATED', 'PENDING', 'PROCESSING'] } }
    });

    // 4. Monthly Growth (Total Revenue comparison)
    const startOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const startOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const endOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0);

    const currentMonthAgg = await prisma.order.aggregate({
        where: {
            status: { in: ['COMPLETED', 'DELIVERED'] },
            createdAt: { gte: startOfCurrentMonth }
        },
        _sum: { totalAmount: true }
    });

    const lastMonthAgg = await prisma.order.aggregate({
        where: {
            status: { in: ['COMPLETED', 'DELIVERED'] },
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
        },
        _sum: { totalAmount: true }
    });

    const currentMonthRevenue = currentMonthAgg._sum.totalAmount || 0;
    const lastMonthRevenue = lastMonthAgg._sum.totalAmount || 0;

    let growthPercentage = 0;
    if (lastMonthRevenue > 0) {
        growthPercentage = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (currentMonthRevenue > 0) {
        growthPercentage = 100; // 100% growth if started from 0
    }

    return {
        totalRevenue,
        todaySales,
        pendingPayments: pendingPaymentsCount,
        monthlyGrowth: Math.round(growthPercentage * 10) / 10 // Round to 1 decimal
    };
};

const getRecentTransactions = async (page = 1, limit = 10) => {
    // Fetch latest orders to simulate "Transactions"
    const skip = (page - 1) * limit;

    const orders = await prisma.order.findMany({
        take: limit,
        skip: skip,
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            seller: {
                select: {
                    shopName: true
                }
            }
        }
    });

    const totalOrders = await prisma.order.count();

    // Transform to "Transaction" shape
    const transactions = orders.map(order => ({
        id: `TRX-${order.id}`,
        orderId: `ORD-${order.orderNumber}`,
        sellerName: order.seller?.shopName || 'Unknown Seller',
        amount: order.totalAmount,
        type: 'Incoming', // All orders are incoming money essentially
        status: order.status === 'COMPLETED' || order.status === 'DELIVERED' ? 'Completed' : 'Pending',
        date: order.createdAt
    }));

    return {
        data: transactions,
        pagination: {
            total: totalOrders,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(totalOrders / limit)
        }
    };
};

const getPayments = async (filters = {}) => {
    const { page = 1, limit = 10, status, search, startDate, endDate } = filters;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (status && status !== 'All Statuses') {
        where.status = status.toUpperCase(); // Assuming UI 'Completed' -> 'COMPLETED'
    }

    if (search) {
        where.OR = [
            { id: isNaN(parseInt(search)) ? undefined : parseInt(search) },
            { orderNumber: { contains: search } },
            { customerName: { contains: search } }
        ].filter(v => v !== undefined);
    }

    if (startDate && endDate) {
        where.createdAt = {
            gte: new Date(startDate),
            lte: new Date(endDate)
        };
    }

    const orders = await prisma.order.findMany({
        take: parseInt(limit),
        skip: skip,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            seller: { select: { shopName: true } },
            customer: { select: { name: true, phone: true } }
        }
    });

    const total = await prisma.order.count({ where });

    const payments = orders.map(order => ({
        id: `PAY-${order.id}`,
        orderId: `#${order.orderNumber}`,
        customer: order.customerName || order.customer?.name || 'Guest',
        seller: order.seller?.shopName || 'Unknown',
        amount: order.totalAmount,
        method: 'Credit Card', // Defaulting since method isn't in Order schema
        status: order.status === 'COMPLETED' || order.status === 'DELIVERED' ? 'Completed' :
            order.status === 'CANCELLED' ? 'Failed' : 'Pending',
        date: order.createdAt.toISOString().split('T')[0]
    }));

    return {
        data: payments,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        },
        stats: {
            totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
            completedCount: await prisma.order.count({ where: { ...where, status: { in: ['COMPLETED', 'DELIVERED'] } } }),
            pendingCount: await prisma.order.count({ where: { ...where, status: { notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'] } } })
        }
    };
};

const getPlatformStats = async () => {
    // Currently no platforms in schema, so returning 0
    return {
        totalPlatforms: 0,
        activeConnections: 0,
        pendingVerification: 0
    };
};

module.exports = {
    getDashboardStats,
    getRecentTransactions,
    getPayments,
    getPlatformStats
};
