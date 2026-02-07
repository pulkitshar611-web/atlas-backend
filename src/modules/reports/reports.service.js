const prisma = require('../../utils/prisma');

// Helper to calculate fees (mock logic: 10% of revenue)
const calculateFees = (revenue) => revenue * 0.10;

/**
 * Get high-level summary metrics (cards)
 */
const getSummaryMetrics = async (filters = {}) => {
    const { startDate, endDate, sellerId } = filters;

    const where = {
        status: { not: 'CANCELLED' }, // Exclude cancelled orders
    };

    if (startDate && endDate) {
        where.createdAt = {
            gte: new Date(startDate),
            lte: new Date(endDate),
        };
    }

    if (sellerId && sellerId !== 'All Sellers') {
        where.sellerId = parseInt(sellerId);
    }

    const aggregations = await prisma.order.aggregate({
        where,
        _count: { id: true },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
    });

    const totalRevenue = aggregations._sum.totalAmount || 0;
    const totalOrders = aggregations._count.id || 0;
    const avgOrderValue = aggregations._avg.totalAmount || 0;
    const totalFees = calculateFees(totalRevenue);

    return {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        totalFees
    };
};

/**
 * Get revenue analysis grouped by date
 */
const getRevenueAnalysis = async (filters = {}) => {
    const { startDate, endDate, sellerId, groupBy = 'Daily' } = filters;

    const where = {
        status: { not: 'CANCELLED' },
    };

    if (startDate && endDate) {
        where.createdAt = {
            gte: new Date(startDate),
            lte: new Date(endDate),
        };
    }

    if (sellerId && sellerId !== 'All Sellers') {
        where.sellerId = parseInt(sellerId);
    }

    const orders = await prisma.order.findMany({
        where,
        select: {
            id: true,
            totalAmount: true,
            createdAt: true,
            seller: {
                select: { shopName: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Javascript grouping since Prisma groupBy date is limited
    const groupedData = orders.reduce((acc, order) => {
        const date = new Date(order.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD

        if (!acc[date]) {
            acc[date] = {
                date,
                orders: 0,
                revenue: 0,
                fees: 0,
                total: 0,
                avgOrder: 0,
                topSellerMap: {}
            };
        }

        acc[date].orders += 1;
        acc[date].revenue += (order.totalAmount || 0);

        // Track seller revenue for "Top Seller"
        const sellerName = order.seller?.shopName || 'Unknown';
        acc[date].topSellerMap[sellerName] = (acc[date].topSellerMap[sellerName] || 0) + (order.totalAmount || 0);

        return acc;
    }, {});

    // Final formatting
    return Object.values(groupedData).map(item => {
        const fees = calculateFees(item.revenue);

        // Find top seller for the day
        let topSeller = '-';
        let maxRev = 0;
        Object.entries(item.topSellerMap).forEach(([seller, rev]) => {
            if (rev > maxRev) {
                maxRev = rev;
                topSeller = seller;
            }
        });

        return {
            date: item.date,
            orders: item.orders,
            revenue: item.revenue,
            fees: fees,
            total: item.revenue - fees, // Net total
            avgOrder: Math.round(item.revenue / item.orders),
            topSeller
        };
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort desc
};

module.exports = {
    getSummaryMetrics,
    getRevenueAnalysis
};
