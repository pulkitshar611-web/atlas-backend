const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrders() {
    try {
        console.log('=== Checking PENDING_REVIEW Orders ===\n');

        // 1. Count all orders
        const totalOrders = await prisma.order.count();
        console.log(`Total orders in database: ${totalOrders}`);

        // 2. Count PENDING_REVIEW orders
        const pendingReviewOrders = await prisma.order.findMany({
            where: { status: 'PENDING_REVIEW' },
            include: {
                seller: {
                    select: {
                        id: true,
                        shopName: true,
                        adminId: true
                    }
                },
                callCenterAgent: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        console.log(`\nPENDING_REVIEW orders: ${pendingReviewOrders.length}\n`);

        if (pendingReviewOrders.length > 0) {
            console.log('PENDING_REVIEW Orders Details:');
            pendingReviewOrders.forEach((order, idx) => {
                console.log(`\n${idx + 1}. Order #${order.orderNumber}`);
                console.log(`   - ID: ${order.id}`);
                console.log(`   - Customer: ${order.customerName}`);
                console.log(`   - Status: ${order.status}`);
                console.log(`   - Seller: ${order.seller?.shopName || 'N/A'} (ID: ${order.sellerId})`);
                console.log(`   - Admin ID: ${order.seller?.adminId || 'N/A'}`);
                console.log(`   - Assigned Agent: ${order.callCenterAgent?.name || 'UNASSIGNED'} (ID: ${order.callCenterAgentId || 'NULL'})`);
                console.log(`   - Created: ${order.createdAt}`);
            });
        }

        // 3. Check all order statuses
        const statusGroups = await prisma.order.groupBy({
            by: ['status'],
            _count: { id: true }
        });

        console.log('\n=== All Order Statuses ===');
        statusGroups.forEach(group => {
            console.log(`${group.status}: ${group._count.id} orders`);
        });

        // 4. Check Call Center Agents
        const agents = await prisma.user.findMany({
            where: {
                role: { name: 'CALL_CENTER_AGENT' }
            },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true
            }
        });

        console.log('\n=== Call Center Agents ===');
        agents.forEach(agent => {
            console.log(`- ${agent.name} (ID: ${agent.id}, Email: ${agent.email}, Active: ${agent.isActive})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkOrders();
