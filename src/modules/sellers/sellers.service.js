const prisma = require('../../utils/prisma');

const listSellers = async (user) => {
    const { role, id: userId } = user;
    let where = {};

    if (role === 'ADMIN') {
        where.adminId = userId;
    }

    const sellers = await prisma.seller.findMany({
        where,
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                    isActive: true,
                    createdAt: true
                }
            },
            _count: {
                select: {
                    products: true,
                    orders: true
                }
            }
        }
    });

    return sellers.map(seller => ({
        id: seller.id,
        name: seller.shopName || seller.user.name,
        email: seller.user.email,
        phone: '+971 50 123 4567', // Placeholder as not in schema
        products: seller._count.products,
        revenue: '0.00 AED', // To be calculated or fetched from finance
        status: seller.user.isActive ? 'Active' : 'Inactive',
        joinDate: seller.createdAt.toLocaleDateString(),
    }));
};

const onboardSeller = async (data, requester) => {
    const {
        name,
        email,
        password,
        shopName,
        phone,
        storeLink,
        bankName,
        accountHolder,
        accountNumber,
        ibanConfirmation,
        idFrontImage,
        idBackImage
    } = data;
    const { role: requesterRole, id: requesterId } = requester;

    const actualRole = await prisma.role.findFirst({
        where: { name: 'SELLER' }
    });

    if (!actualRole) throw new Error('Seller role not found in system');

    const result = await prisma.$transaction(async (tx) => {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await tx.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                phone,
                roleId: actualRole.id,
                storeLink,
                bankName,
                accountHolder,
                accountNumber,
                ibanConfirmation,
                idFrontImage,
                idBackImage,
                isActive: true,
                createdById: requesterId // Link user creator
            }
        });

        const seller = await tx.seller.create({
            data: {
                shopName: shopName || name,
                userId: user.id,
                adminId: requesterRole === 'ADMIN' ? requesterId : null
            }
        });

        return { user, seller };
    });

    return result;
};



/**
 * Get seller dashboard statistics
 */
const getDashboardStats = async (sellerId) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfLastWeek = new Date(now);
    startOfLastWeek.setDate(now.getDate() - 14);

    // Get current month revenue
    const currentMonthOrders = await prisma.order.findMany({
        where: {
            sellerId: parseInt(sellerId),
            createdAt: { gte: startOfMonth }
        },
        select: { totalAmount: true }
    });

    const currentRevenue = currentMonthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Get last month revenue
    const lastMonthOrders = await prisma.order.findMany({
        where: {
            sellerId: parseInt(sellerId),
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
        },
        select: { totalAmount: true }
    });

    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Calculate revenue percentage change
    const revenueChange = lastMonthRevenue > 0
        ? ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    // Get current week products count
    const currentWeekProducts = await prisma.product.count({
        where: {
            sellerId: parseInt(sellerId),
            createdAt: { gte: startOfWeek }
        }
    });

    // Get last week products count
    const lastWeekProducts = await prisma.product.count({
        where: {
            sellerId: parseInt(sellerId),
            createdAt: { gte: startOfLastWeek, lt: startOfWeek }
        }
    });

    // Total products
    const totalProducts = await prisma.product.count({
        where: { sellerId: parseInt(sellerId) }
    });

    // Calculate products percentage change
    const productsChange = lastWeekProducts > 0
        ? ((currentWeekProducts - lastWeekProducts) / lastWeekProducts) * 100
        : 0;

    // Get current week orders count
    const currentWeekOrders = await prisma.order.count({
        where: {
            sellerId: parseInt(sellerId),
            createdAt: { gte: startOfWeek }
        }
    });

    // Get last week orders count
    const lastWeekOrders = await prisma.order.count({
        where: {
            sellerId: parseInt(sellerId),
            createdAt: { gte: startOfLastWeek, lt: startOfWeek }
        }
    });

    // Total orders
    const totalOrders = await prisma.order.count({
        where: { sellerId: parseInt(sellerId) }
    });

    // Calculate orders percentage change
    const ordersChange = lastWeekOrders > 0
        ? ((currentWeekOrders - lastWeekOrders) / lastWeekOrders) * 100
        : 0;

    // Get out of stock items
    const outOfStockItems = await prisma.product.count({
        where: {
            sellerId: parseInt(sellerId),
            stock: 0
        }
    });

    return {
        revenue: {
            value: currentRevenue,
            change: revenueChange,
            period: 'from last month'
        },
        products: {
            value: totalProducts,
            change: productsChange,
            period: 'from last week'
        },
        orders: {
            value: totalOrders,
            change: ordersChange,
            period: 'from last week'
        },
        outOfStock: {
            value: outOfStockItems,
            status: outOfStockItems > 0 ? 'Requires attention' : 'All good'
        }
    };
};

/**
 * Get sales performance data for chart
 */
const getSalesPerformance = async (sellerId, days = 30) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await prisma.order.findMany({
        where: {
            sellerId: parseInt(sellerId),
            createdAt: { gte: startDate }
        },
        select: {
            createdAt: true,
            totalAmount: true
        },
        orderBy: { createdAt: 'asc' }
    });

    // Group by date
    const salesByDate = {};
    orders.forEach(order => {
        const date = order.createdAt.toISOString().split('T')[0];
        if (!salesByDate[date]) {
            salesByDate[date] = 0;
        }
        salesByDate[date] += order.totalAmount || 0;
    });

    // Convert to array format for chart
    const chartData = Object.entries(salesByDate).map(([date, amount]) => ({
        date,
        sales: amount
    }));

    return chartData;
};

/**
 * Get top products by sales
 */
const getTopProducts = async (sellerId, limit = 5) => {
    const products = await prisma.product.findMany({
        where: { sellerId: parseInt(sellerId) },
        include: {
            inventory: {
                select: {
                    quantity: true
                }
            }
        }
    });

    // Calculate sales for each product from order items
    const productSales = await Promise.all(
        products.map(async (product) => {
            const orderItems = await prisma.orderItem.findMany({
                where: {
                    productId: product.id,
                    order: {
                        sellerId: parseInt(sellerId)
                    }
                },
                include: {
                    order: true
                }
            });

            const totalSales = orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

            return {
                id: product.id,
                name: product.name,
                sales: totalSales,
                quantity: totalQuantity,
                stock: product.stock,
                image: product.image
            };
        })
    );

    // Sort by sales and return top products
    return productSales
        .sort((a, b) => b.sales - a.sales)
        .slice(0, limit);
};

/**
 * Get recent orders
 */
const getRecentOrders = async (sellerId, limit = 10) => {
    const orders = await prisma.order.findMany({
        where: { sellerId: parseInt(sellerId) },
        include: {
            items: {
                select: {
                    product: true,
                    quantity: true,
                    price: true
                }
            },
            customer: {
                select: {
                    name: true,
                    phone: true
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
    });

    return orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName || order.customer?.name || 'N/A',
        customerPhone: order.customerPhone || order.customer?.phone || 'N/A',
        status: order.status,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
        createdAt: order.createdAt
    }));
};

/**
 * Get low stock alerts
 */
const getLowStockAlerts = async (sellerId, threshold = 10) => {
    const lowStockProducts = await prisma.product.findMany({
        where: {
            sellerId: parseInt(sellerId),
            stock: {
                lte: threshold,
                gt: 0
            }
        },
        select: {
            id: true,
            name: true,
            sku: true,
            stock: true,
            image: true
        },
        orderBy: { stock: 'asc' }
    });

    return lowStockProducts.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stock,
        threshold,
        image: product.image,
        severity: product.stock <= 5 ? 'critical' : 'warning'
    }));
};

const getSellerIdByUserId = async (userId) => {
    const seller = await prisma.seller.findUnique({
        where: { userId }
    });
    return seller ? seller.id : null;
};

const getSellerDetails = async (sellerId, requester) => {
    const seller = await prisma.seller.findUnique({
        where: { id: parseInt(sellerId) },
        include: {
            user: true,
            _count: {
                select: { products: true, orders: true }
            }
        }
    });

    if (!seller) throw new Error('Seller not found');

    // Admin boundary
    if (requester.role === 'ADMIN' && seller.adminId !== requester.id) {
        throw new Error('Forbidden: You do not manage this seller');
    }

    return seller;
};

const deleteSeller = async (sellerId, requester) => {
    const seller = await prisma.seller.findUnique({
        where: { id: parseInt(sellerId) },
        include: { user: true }
    });

    if (!seller) throw new Error('Seller not found');

    // Admin boundary
    if (requester.role === 'ADMIN' && seller.adminId !== requester.id) {
        throw new Error('Forbidden: You do not have permission to delete this seller');
    }

    // Deleting the user will cascade if set up, or we do it manually.
    // Based on my users.service.js implementation, I'll just use prisma here directly for simplicity.
    await prisma.$transaction([
        prisma.product.deleteMany({ where: { sellerId: seller.id } }),
        prisma.order.deleteMany({ where: { sellerId: seller.id } }),
        prisma.seller.delete({ where: { id: seller.id } }),
        prisma.user.delete({ where: { id: seller.userId } })
    ]);

    return { message: 'Seller deleted successfully' };
};

module.exports = {
    listSellers,
    onboardSeller,
    getDashboardStats,
    getSalesPerformance,
    getTopProducts,
    getRecentOrders,
    getLowStockAlerts,
    getSellerIdByUserId,
    getSellerDetails,
    deleteSeller
};

