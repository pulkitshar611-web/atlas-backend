const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding delivery test data...');

    // 1. Find a Delivery Agent with a creator (Admin)
    const agent = await prisma.user.findFirst({
        where: { 
            role: { name: 'DELIVERY_AGENT' },
            createdById: { not: null }
        }
    });

    if (!agent) {
        console.error('No Delivery Agent with a valid Admin found.');
        return;
    }

    console.log(`Using Agent: ${agent.name} (ID: ${agent.id}), Admin ID: ${agent.createdById}`);

    // 2. Find a seller managed by this Admin
    let seller = await prisma.seller.findFirst({
        where: { adminId: agent.createdById }
    });

    if (!seller) {
        console.log('No seller found for this admin, using the first available seller.');
        seller = await prisma.seller.findFirst();
    }

    if (!seller) {
        console.error('No seller found in the system.');
        return;
    }

    console.log(`Using Seller: ${seller.shopName || seller.id} (ID: ${seller.id})`);

    // 3. Create PACKED orders
    for (let i = 1; i <= 3; i++) {
        const orderNumber = `DEL-S-${Date.now().toString().slice(-4)}-${i}`;
        const order = await prisma.order.create({
            data: {
                orderNumber,
                status: 'PACKED',
                totalAmount: 100.00,
                shippingAddress: 'Test Address',
                customerPhone: '9000000000',
                customerName: 'Test Customer',
                sellerId: 1 // Known valid seller ID
            }
        });
        console.log(`Created PACKED order: ${orderNumber} (ID: ${order.id})`);
    }

    console.log('Done! Dashboard should now show 3 Pending orders.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
