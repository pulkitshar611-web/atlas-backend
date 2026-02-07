const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAndReseed() {
    try {
        console.log('Cleaning up old CC orders...');
        const deleted = await prisma.order.deleteMany({
            where: {
                orderNumber: { in: ['ORD-CC-001', 'ORD-CC-002', 'ORD-CC-003', 'ORD-CC-004'] }
            }
        });
        console.log(`Deleted ${deleted.count} orders.`);

        // Seed again
        console.log('Seeding...');
        // 1. Get Agent
        const agent = await prisma.user.findFirst({ where: { role: { name: 'CALL_CENTER_AGENT' } } });
        const seller = await prisma.seller.findFirst();

        if (!agent || !seller) throw new Error('Agent or Seller missing');

        // 2 Create Orders
        await prisma.order.create({
            data: {
                orderNumber: 'ORD-CC-001',
                customerName: 'John Doe',
                status: 'PENDING_REVIEW',
                sellerId: seller.id,
                callCenterAgentId: agent.id,
                totalAmount: 150.0
            }
        });

        await prisma.order.create({
            data: {
                orderNumber: 'ORD-CC-002',
                customerName: 'Jane Smith',
                status: 'PENDING_REVIEW',
                sellerId: seller.id,
                callCenterAgentId: agent.id,
                totalAmount: 200.0,
                createdAt: new Date(Date.now() - 3600000)
            }
        });

        await prisma.order.create({
            data: {
                orderNumber: 'ORD-CC-003',
                customerName: 'Alice Johnson',
                status: 'CONFIRMED',
                sellerId: seller.id,
                callCenterAgentId: agent.id,
                totalAmount: 300.0,
                updatedAt: new Date()
            }
        });

         await prisma.order.create({
            data: {
                orderNumber: 'ORD-CC-004',
                customerName: 'Bob Brown',
                status: 'REJECTED',
                sellerId: seller.id,
                callCenterAgentId: agent.id,
                totalAmount: 50.0,
                updatedAt: new Date()
            }
        });
        console.log('Reseed complete.');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupAndReseed();
