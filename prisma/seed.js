const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('123456', 10);

    const usersToSeed = [
        { role: 'SUPER_ADMIN', email: 'superadmin@atlas.com', name: 'Super Admin' },
        { role: 'ADMIN', email: 'admin@atlas.com', name: 'Admin User' },
        { role: 'SELLER', email: 'seller@atlas.com', name: 'Seller User' },
        { role: 'CALL_CENTER_AGENT', email: 'agent@atlas.com', name: 'Call Center Agent' },
        { role: 'CALL_CENTER_MANAGER', email: 'manager@atlas.com', name: 'Call Center Manager' },
        { role: 'STOCK_KEEPER', email: 'stock@atlas.com', name: 'Stock Keeper' },
        { role: 'PACKAGING_AGENT', email: 'packaging@atlas.com', name: 'Packaging Agent' },
        { role: 'DELIVERY_AGENT', email: 'delivery@atlas.com', name: 'Delivery Agent' }
    ];

    console.log('--- Start Seeding ---');

    // 1. Ensure Roles Exist
    const roles = [
        'SUPER_ADMIN', 'ADMIN', 'SELLER', 'CALL_CENTER_AGENT',
        'CALL_CENTER_MANAGER', 'STOCK_KEEPER', 'PACKAGING_AGENT', 'DELIVERY_AGENT'
    ];

    for (const roleName of roles) {
        await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: { name: roleName }
        });
    }
    console.log('Roles verified.');

    // 1.5 Seed Permissions
    const permissions = [
        { code: 'DASHBOARD_VIEW', module: 'DASHBOARD', action: 'VIEW' },
        { code: 'ORDERS_VIEW', module: 'ORDERS', action: 'VIEW' },
        { code: 'PRODUCTS_VIEW', module: 'PRODUCTS', action: 'VIEW' },
        { code: 'INVENTORY_VIEW', module: 'INVENTORY', action: 'VIEW' }
    ];

    const seededPermissions = [];
    for (const p of permissions) {
        const perm = await prisma.permission.upsert({
            where: { code: p.code },
            update: {},
            create: p
        });
        seededPermissions.push(perm);
    }
    console.log('Permissions verified.');

    // Link all permissions to SUPER_ADMIN and ADMIN
    const adminRoles = await prisma.role.findMany({
        where: { name: { in: ['SUPER_ADMIN', 'ADMIN'] } }
    });

    for (const role of adminRoles) {
        for (const perm of seededPermissions) {
            await prisma.permissionToRole.upsert({
                where: {
                    permissionId_roleId: {
                        permissionId: perm.id,
                        roleId: role.id
                    }
                },
                update: {},
                create: {
                    permissionId: perm.id,
                    roleId: role.id
                }
            });
        }
    }
    console.log('Permissions linked to Admin roles.');

    // 2. Seed Users
    for (const userData of usersToSeed) {
        const role = await prisma.role.findUnique({ where: { name: userData.role } });

        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {
                roleId: role.id, // Ensure role matches
                isActive: true
            },
            create: {
                email: userData.email,
                name: userData.name,
                password: password,
                roleId: role.id,
                isActive: true
            }
        });
        console.log(`User synced: ${userData.email}`);

        // 3. Link Seller Entity if needed
        if (userData.role === 'SELLER') {
            await prisma.seller.upsert({
                where: { userId: user.id },
                update: {},
                create: {
                    userId: user.id,
                    shopName: 'Atlas Official Store'
                }
            });
            console.log(`Seller entity linked for: ${userData.email}`);
        }
    }

    // 4. Basic Seed Data (Optional but good for dashboards)
    const customer = await prisma.customer.upsert({
        where: { phone: '+971 50 123 4567' },
        update: {},
        create: {
            name: 'Ahmed Hassan',
            phone: '+971 50 123 4567',
            email: 'ahmed.h@example.com',
            address: 'Downtown Dubai, UAE'
        }
    });

    // Ensure we have a product for the seller
    const sellerUser = await prisma.user.findUnique({ where: { email: 'seller@atlas.com' } });
    const sellerEntity = await prisma.seller.findUnique({ where: { userId: sellerUser.id } });

    const product = await prisma.product.upsert({
        where: { sku: 'WHP-001' },
        update: {},
        create: {
            name: 'Wireless Headphones',
            sku: 'WHP-001',
            price: 654.00,
            sellerId: sellerEntity.id
        }
    });

    const warehouse = await prisma.warehouse.upsert({
        where: { name: 'Main Dubai Warehouse' },
        update: {},
        create: {
            name: 'Main Dubai Warehouse',
            location: 'Al Quoz'
        }
    });

    await prisma.inventory.upsert({
        where: {
            productId_warehouseId: {
                productId: product.id,
                warehouseId: warehouse.id
            }
        },
        update: {},
        create: {
            productId: product.id,
            warehouseId: warehouse.id,
            quantity: 100
        }
    });

    console.log('--- Seeding Completed ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
