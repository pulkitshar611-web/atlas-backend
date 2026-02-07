const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrders() {
    const orders = await prisma.order.findMany({
        where: {
            orderNumber: { in: ['ORD-CC-001', 'ORD-CC-002', 'ORD-CC-003', 'ORD-CC-004'] }
        },
        include: { callCenterAgent: true }
    });
    console.log(JSON.stringify(orders, null, 2));
}

checkOrders();
