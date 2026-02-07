const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugStats() {
    try {
        const agentId = 4; // We saw ID 4 in previous debug
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        console.log('Agent ID:', agentId);
        console.log('Start of Day:', startOfDay);

        // 1. Assigned Orders (Active)
        const assignedCount = await prisma.order.count({
            where: {
                callCenterAgentId: agentId,
                status: { in: ['PENDING_REVIEW', 'IN_PROGRESS'] }
            }
        });
        console.log('Assigned Count (PENDING_REVIEW, IN_PROGRESS):', assignedCount);

        // Debug: List them
        const assignedOrders = await prisma.order.findMany({
            where: {
                callCenterAgentId: agentId,
                status: { in: ['PENDING_REVIEW', 'IN_PROGRESS'] }
            },
            select: { id: true, status: true }
        });
        console.log('Assigned Orders:', assignedOrders);


        // 2. Confirmed Orders
        const confirmedCount = await prisma.order.count({
            where: {
                callCenterAgentId: agentId,
                status: { in: ['CONFIRMED', 'COMPLETED', 'DELIVERED'] },
                updatedAt: { gte: startOfDay }
            }
        });
        console.log('Confirmed Count (Today):', confirmedCount);
        
        // Debug: List them
        const confirmedOrders = await prisma.order.findMany({
            where: {
                callCenterAgentId: agentId,
                status: { in: ['CONFIRMED', 'COMPLETED', 'DELIVERED'] },
                updatedAt: { gte: startOfDay }
            },
            select: { id: true, status: true, updatedAt: true }
        });
        console.log('Confirmed Orders:', confirmedOrders);


        // 4. Cancelled Orders
        const cancelledCount = await prisma.order.count({
            where: {
                callCenterAgentId: agentId,
                status: { in: ['REJECTED', 'CANCELLED'] },
                updatedAt: { gte: startOfDay }
            }
        });
        console.log('Cancelled Count (Today):', cancelledCount);
         // Debug: List them
         const cancelledOrders = await prisma.order.findMany({
            where: {
                callCenterAgentId: agentId,
                status: { in: ['REJECTED', 'CANCELLED'] },
                updatedAt: { gte: startOfDay }
            },
            select: { id: true, status: true, updatedAt: true }
        });
        console.log('Cancelled Orders:', cancelledOrders);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debugStats();
