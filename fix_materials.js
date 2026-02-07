const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log('--- Fixing Materials adminId ---');
    
    // Find an Admin to associate with
    const admin = await prisma.user.findFirst({
        where: { role: { name: 'ADMIN' } }
    });

    if (!admin) {
        console.error('No Admin found to associate materials with');
        return;
    }

    const result = await prisma.packagingMaterial.updateMany({
        where: { OR: [{ adminId: null }, { adminId: 2 }] },
        data: { adminId: 10 }
    });

    console.log(`Updated ${result.count} materials with adminId: 10`);
}

fix()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
