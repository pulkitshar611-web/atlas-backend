const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createRequest = async (data, userId) => {
    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new Error('Seller profile not found');

    const {
        productName,
        productUrl,
        productImage,
        quantity,
        numberOfCartons,
        sourceCountry,
        destinationCountry,
        fundingSource,
        priority,
        budget,
        additionalNotes
    } = data;

    return await prisma.sourcingRequest.create({
        data: {
            productName,
            productUrl,
            productImage,
            quantity: parseInt(quantity),
            numberOfCartons: numberOfCartons ? parseInt(numberOfCartons) : null,
            sourceCountry,
            destinationCountry,
            fundingSource,
            priority,
            budget: budget ? parseFloat(budget) : null,
            additionalNotes,
            sellerId: seller.id
        }
    });
};

const getSellerRequests = async (userId) => {
    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new Error('Seller profile not found');

    return await prisma.sourcingRequest.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' }
    });
};

const getAllRequests = async () => {
    return await prisma.sourcingRequest.findMany({
        include: {
            seller: {
                include: { user: { select: { name: true, email: true, phone: true } } }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

const updateStatus = async (id, status, user) => {
    // Only admins can update status
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
        throw new Error('Unauthorized');
    }

    return await prisma.sourcingRequest.update({
        where: { id: parseInt(id) },
        data: { status }
    });
};

module.exports = {
    createRequest,
    getSellerRequests,
    getAllRequests,
    updateStatus
};
