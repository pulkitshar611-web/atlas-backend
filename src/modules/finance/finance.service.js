const prisma = require('../../utils/prisma');

const getSummary = async (user) => {
    const { role, userId } = user;

    // Define scope based on role
    let where = { status: 'DELIVERED' };

    if (role === 'SELLER') {
        // Sellers only see their own delivered orders
        const seller = await prisma.seller.findUnique({ where: { userId } });
        if (!seller) throw new Error('Seller profile not found');
        where.sellerId = seller.id;
    } else if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
        // Admins see all delivered orders
        // No additional filter needed
    } else {
        throw new Error('Forbidden: No access to financial data');
    }

    // Aggregate stats
    const orders = await prisma.order.findMany({
        where,
        include: { items: true }
    });

    const totalRevenue = orders.reduce((sum, order) => {
        const orderTotal = order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
        return sum + orderTotal;
    }, 0);

    const totalOrders = orders.length;

    return {
        totalRevenue,
        totalOrders
    };
};

const getFinancialOrders = async (user, page = 1, limit = 50) => {
    const { role, userId } = user;
    const skip = (page - 1) * limit;

    // Define scope based on role
    let where = { status: 'DELIVERED' };

    if (role === 'SELLER') {
        const seller = await prisma.seller.findUnique({ where: { userId } });
        if (!seller) throw new Error('Seller profile not found');
        where.sellerId = seller.id;
    } else if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
        // Admins see all
    } else {
        throw new Error('Forbidden: No access to financial data');
    }

    const [total, orders] = await prisma.$transaction([
        prisma.order.count({ where }),
        prisma.order.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy: { updatedAt: 'desc' }, // Delivered date usually corresponds to last update
            include: {
                items: true,
                seller: { include: { user: { select: { name: true } } } }
            }
        })
    ]);

    const formattingOrders = orders.map(order => {
        const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return {
            orderNumber: order.orderNumber,
            status: order.status,
            totalAmount,
            deliveredAt: order.updatedAt,
            sellerName: order.seller.user.name
        };
    });

    return {
        data: formattingOrders,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

const getSellerFinanceData = async (userId) => {
    const seller = await prisma.seller.findUnique({
        where: { userId },
        include: { user: true }
    });

    if (!seller) throw new Error('Seller profile not found');

    const orders = await prisma.order.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' }
    });

    // Calculate Stats
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let pendingPayments = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Map Orders to Transactions
    const transactions = orders.map(order => {
        const amount = order.totalAmount || 0;
        const date = new Date(order.createdAt);
        const isThisMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;

        // Revenue Calculation (Confirmed orders count as revenue for now, until we have paymentStatus)
        const isRevenue = ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(order.status);

        if (isRevenue) {
            totalRevenue += amount;
            if (isThisMonth) monthlyRevenue += amount;
        }

        // Pending Payments (Not yet delivered)
        if (order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'RETURNED') {
            pendingPayments += amount;
        }

        // Determine Transaction Status
        let status = 'Pending';
        if (order.status === 'DELIVERED') status = 'Completed';
        if (order.status === 'CANCELLED') status = 'Failed';

        // Transaction Type
        let type = 'Incoming'; // Default for orders

        return {
            id: `TXN-${order.orderNumber}`,
            desc: `Order #${order.orderNumber} Payment`,
            type: type,
            amount: `AED ${amount.toFixed(2)}`,
            status: status,
            date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            originalDate: date // for sorting if needed later
        };
    });

    // Calculate Commission (Mock 10%)
    const commission = totalRevenue * 0.10;

    return {
        stats: {
            totalRevenue: `AED ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            monthlyRevenue: `AED ${monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            pendingPayments: `AED ${pendingPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            commission: `AED ${commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        },
        transactions
    };
};

module.exports = {
    getSummary,
    getFinancialOrders,
    getSellerFinanceData
};
