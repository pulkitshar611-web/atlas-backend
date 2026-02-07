const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const permissions = [
    // USERS Module
    { code: 'USERS_VIEW', module: 'USERS', action: 'VIEW', description: 'View all users' },
    { code: 'USERS_CREATE', module: 'USERS', action: 'CREATE', description: 'Create new users' },
    { code: 'USERS_UPDATE', module: 'USERS', action: 'UPDATE', description: 'Update user details' },
    { code: 'USERS_DELETE', module: 'USERS', action: 'DELETE', description: 'Delete users' },

    // SELLERS Module
    { code: 'SELLERS_VIEW', module: 'SELLERS', action: 'VIEW', description: 'View all sellers' },
    { code: 'SELLERS_APPROVE', module: 'SELLERS', action: 'APPROVE', description: 'Approve or reject sellers' },
    { code: 'SELLERS_UPDATE', module: 'SELLERS', action: 'UPDATE', description: 'Update seller details' },

    // ORDERS Module
    { code: 'ORDERS_VIEW_ALL', module: 'ORDERS', action: 'VIEW', description: 'View all orders (Admin)' },
    { code: 'ORDERS_VIEW_ASSIGNED', module: 'ORDERS', action: 'VIEW', description: 'View assigned orders only' },
    { code: 'ORDERS_CREATE', module: 'ORDERS', action: 'CREATE', description: 'Create new orders' },
    { code: 'ORDERS_UPDATE', module: 'ORDERS', action: 'UPDATE', description: 'Update order status/details' },
    { code: 'ORDERS_DELETE', module: 'ORDERS', action: 'DELETE', description: 'Delete orders' },

    // PRODUCTS Module
    { code: 'PRODUCTS_VIEW_ALL', module: 'PRODUCTS', action: 'VIEW', description: 'View all products' },
    { code: 'PRODUCTS_CREATE', module: 'PRODUCTS', action: 'CREATE', description: 'Create new products' },
    { code: 'PRODUCTS_UPDATE', module: 'PRODUCTS', action: 'UPDATE', description: 'Update products' },
    { code: 'PRODUCTS_DELETE', module: 'PRODUCTS', action: 'DELETE', description: 'Delete products' },

    // INVENTORY Module
    { code: 'INVENTORY_VIEW', module: 'INVENTORY', action: 'VIEW', description: 'View inventory levels' },
    { code: 'INVENTORY_UPDATE', module: 'INVENTORY', action: 'UPDATE', description: 'Update stock levels' },
    { code: 'INVENTORY_MOVEMENTS', module: 'INVENTORY', action: 'VIEW', description: 'View stock movements' },

    // FINANCE Module
    { code: 'FINANCE_VIEW_ALL', module: 'FINANCE', action: 'VIEW', description: 'View all financial data' },
    { code: 'FINANCE_PAYMENTS', module: 'FINANCE', action: 'UPDATE', description: 'Manage payments' },
    { code: 'FINANCE_REPORTS', module: 'FINANCE', action: 'VIEW', description: 'View financial reports' },

    // DELIVERY Module
    { code: 'DELIVERY_VIEW_ALL', module: 'DELIVERY', action: 'VIEW', description: 'View all delivery tasks' },
    { code: 'DELIVERY_ASSIGN', module: 'DELIVERY', action: 'UPDATE', description: 'Assign delivery tasks' },
    { code: 'DELIVERY_UPDATE_STATUS', module: 'DELIVERY', action: 'UPDATE', description: 'Update delivery status' },

    // SOURCING Module
    { code: 'SOURCING_VIEW_ALL', module: 'SOURCING', action: 'VIEW', description: 'View all sourcing requests' },
    { code: 'SOURCING_CREATE', module: 'SOURCING', action: 'CREATE', description: 'Create sourcing requests' },
    { code: 'SOURCING_UPDATE_STATUS', module: 'SOURCING', action: 'UPDATE', description: 'Update sourcing request status' },

    // ROLES Module
    { code: 'ROLES_VIEW', module: 'ROLES', action: 'VIEW', description: 'View roles and permissions' },
    { code: 'ROLES_MANAGE', module: 'ROLES', action: 'UPDATE', description: 'Manage roles and assign permissions' },

    // SYSTEM
    { code: 'SYSTEM_CONFIG', module: 'SYSTEM', action: 'UPDATE', description: 'Manage system configuration' },
    { code: 'AUDIT_LOGS_VIEW', module: 'SYSTEM', action: 'VIEW', description: 'View audit logs' }
];

async function main() {
    console.log('Start seeding permissions...');

    for (const perm of permissions) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: {},
            create: perm,
        });
    }

    console.log('Permissions seeded.');

    // Assign ALL permissions to SUPER_ADMIN
    const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (superAdminRole) {
        const allPermissions = await prisma.permission.findMany();
        await prisma.role.update({
            where: { id: superAdminRole.id },
            data: {
                permissions: {
                    connect: allPermissions.map(p => ({ id: p.id }))
                }
            }
        });
        console.log('Assigned all permissions to SUPER_ADMIN.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
