const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCallCenterData() {
    try {
        console.log('--- CALL CENTER AGENTS ---');
        const agents = await prisma.user.findMany({
            where: { role: { name: 'CALL_CENTER_AGENT' } },
            include: {
                _count: {
                    select: { assignedOrders: true }
                }
            }
        });
        console.log(JSON.stringify(agents.map(a => ({ id: a.id, email: a.email, name: a.name, assignedOrdersCount: a._count.assignedOrders })), null, 2));

        console.log('\n--- ALL ORDERS for Call Center ---');
        const orders = await prisma.order.findMany({
            where: {
                // Fetch orders that look like they belong to call center (or just recent ones)
                // or just all orders to be safe but limit to recent
            },
            take: 20,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                orderNumber: true,
                status: true,
                callCenterAgentId: true,
                updatedAt: true
            }
        });
        console.table(orders);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debugCallCenterData();
