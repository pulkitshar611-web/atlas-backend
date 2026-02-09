const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const warehouses = await prisma.warehouse.findMany();
    console.log('Total Warehouses:', warehouses.length);

    const distribution = warehouses.reduce((acc, w) => {
        const id = w.adminId || 'null';
        acc[id] = (acc[id] || 0) + 1;
        return acc;
    }, {});

    console.log('Distribution by adminId:', distribution);

    const users = await prisma.user.findMany({
        select: { id: true, email: true, role: { select: { name: true } } }
    });
    console.log('Users:', users.map(u => `${u.id}: ${u.email} (${u.role?.name})`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
