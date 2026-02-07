const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const sellers = await prisma.seller.findMany({
        take: 5,
        include: { user: { select: { id: true, name: true } } }
    });
    console.log('Sellers:', JSON.stringify(sellers, null, 2));

    const deliveryAgents = await prisma.user.findMany({
        where: { role: { name: 'DELIVERY_AGENT' } },
        select: { id: true, name: true, createdById: true }
    });
    console.log('Delivery Agents:', JSON.stringify(deliveryAgents, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
