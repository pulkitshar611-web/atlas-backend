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

// ============= PAYMENT PLATFORM MANAGEMENT =============

const getPlatforms = async (user) => {
    const { role, id } = user;

    let where = {};

    // Scope platforms to admin
    if (role === 'ADMIN') {
        where.adminId = id;
    } else if (role === 'SUPER_ADMIN') {
        // Super admin can see all platforms
    } else {
        throw new Error('Forbidden: No access to platforms');
    }

    const platforms = await prisma.paymentPlatform.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    });

    return platforms;
};

const createPlatform = async (user, data) => {
    const { role, id } = user;

    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden: Only admins can create platforms');
    }

    const platform = await prisma.paymentPlatform.create({
        data: {
            type: data.type,
            name: data.name,
            url: data.url,
            apiKey: data.apiKey, // In production, encrypt this
            status: 'Pending',
            adminId: role === 'ADMIN' ? id : null
        }
    });

    return platform;
};

const verifyPlatform = async (user, platformId) => {
    const { role, id } = user;

    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden: Only admins can verify platforms');
    }

    // Find platform
    const platform = await prisma.paymentPlatform.findUnique({
        where: { id: parseInt(platformId) }
    });

    if (!platform) {
        throw new Error('Platform not found');
    }

    // Check ownership for admins
    if (role === 'ADMIN' && platform.adminId !== id) {
        throw new Error('Forbidden: You can only verify your own platforms');
    }

    // Update platform status to Active (NO order creation)
    const updatedPlatform = await prisma.paymentPlatform.update({
        where: { id: parseInt(platformId) },
        data: { status: 'Active' }
    });

    return updatedPlatform;
};

const disconnectPlatform = async (user, platformId) => {
    const { role, id } = user;

    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden: Only admins can disconnect platforms');
    }

    // Find platform
    const platform = await prisma.paymentPlatform.findUnique({
        where: { id: parseInt(platformId) }
    });

    if (!platform) {
        throw new Error('Platform not found');
    }

    // Check ownership for admins
    if (role === 'ADMIN' && platform.adminId !== id) {
        throw new Error('Forbidden: You can only disconnect your own platforms');
    }

    // Delete platform
    await prisma.paymentPlatform.delete({
        where: { id: parseInt(platformId) }
    });

    return { message: 'Platform disconnected successfully' };
};

const getPlatformById = async (user, platformId) => {
    const { role, id } = user;

    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden: No access to platforms');
    }

    const platform = await prisma.paymentPlatform.findUnique({
        where: { id: parseInt(platformId) },
        include: {
            orders: {
                take: 10,
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!platform) {
        throw new Error('Platform not found');
    }

    // Check ownership for admins
    if (role === 'ADMIN' && platform.adminId !== id) {
        throw new Error('Forbidden: You can only view your own platforms');
    }

    return platform;
};

const createDummyOrders = async (platform, adminUserId) => {
    // Find a seller to associate orders with
    // For admin, find their first seller
    let seller;

    if (platform.adminId) {
        seller = await prisma.seller.findFirst({
            where: { adminId: platform.adminId }
        });
    }

    // If no seller found, find any seller
    if (!seller) {
        seller = await prisma.seller.findFirst();
    }

    if (!seller) {
        console.warn('No seller found to create dummy orders');
        return;
    }

    // Create 3 dummy orders
    const dummyOrders = [
        {
            customerName: `${platform.type} Customer 1`,
            customerPhone: '+971501234567',
            totalAmount: 299.99,
            products: [{ name: 'Product A', quantity: 2, price: 149.995 }]
        },
        {
            customerName: `${platform.type} Customer 2`,
            customerPhone: '+971507654321',
            totalAmount: 499.99,
            products: [{ name: 'Product B', quantity: 1, price: 499.99 }]
        },
        {
            customerName: `${platform.type} Customer 3`,
            customerPhone: '+971509876543',
            totalAmount: 799.99,
            products: [{ name: 'Product C', quantity: 3, price: 266.663 }]
        }
    ];

    for (const orderData of dummyOrders) {
        // Generate unique order number
        const orderNumber = `ORD-${platform.type.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        await prisma.order.create({
            data: {
                orderNumber,
                customerName: orderData.customerName,
                customerPhone: orderData.customerPhone,
                status: 'PENDING_REVIEW',
                totalAmount: orderData.totalAmount,
                shippingAddress: `${platform.name} - Auto-synced address`,
                internalNotes: `Auto-created from ${platform.type} platform integration`,
                sellerId: seller.id,
                platformId: platform.id,
                items: {
                    create: orderData.products.map(product => ({
                        product: product.name,
                        quantity: product.quantity,
                        price: product.price
                    }))
                }
            }
        });
    }
};

// ============= DEMO SYNC ORDERS =============

const demoSyncOrders = async (user, platformId) => {
    const { role, id } = user;

    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden: Only admins can sync demo orders');
    }

    // Find platform
    const platform = await prisma.paymentPlatform.findUnique({
        where: { id: parseInt(platformId) }
    });

    if (!platform) {
        throw new Error('Platform not found');
    }

    // Check ownership for admins
    if (role === 'ADMIN' && platform.adminId !== id) {
        throw new Error('Forbidden: You can only sync orders for your own platforms');
    }

    // Create dummy orders using existing helper
    await createDummyOrders(platform, id);

    return { message: '3 demo orders synced successfully', count: 3 };
};

module.exports = {
    getSummary,
    getFinancialOrders,
    getSellerFinanceData,
    getPlatforms,
    createPlatform,
    verifyPlatform,
    disconnectPlatform,
    getPlatformById,
    demoSyncOrders
};
