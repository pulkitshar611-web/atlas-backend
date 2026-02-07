const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    console.log('--- Materials Inventory Debug ---');
    
    const materials = await prisma.packagingMaterial.findMany({
        select: {
            id: true,
            name: true,
            adminId: true,
            type: true
        }
    });
    console.log('Materials Data:', materials);

    const currentUser = await prisma.user.findFirst({
        where: { email: 'pack@gmail.com' },
        select: { id: true, role: { select: { name: true } }, createdById: true }
    });
    console.log('Current Agent User:', currentUser);
}

debug()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
