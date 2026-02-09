const prisma = require('../../utils/prisma');

const listRoles = async () => {
    const roles = await prisma.role.findMany({
        include: {
            _count: {
                select: { users: true }
            },
            permissions: {
                include: { permission: true }
            }
        }
    });

    return roles.map(role => ({
        id: role.id,
        name: role.name,
        users: role._count.users,
        permissions: role.permissions.map(p => p.permission),
        description: `Manage ${role.name.toLowerCase()} operations`,
        status: 'Active'
    }));
};

const getPermissions = async () => {
    return await prisma.permission.findMany();
};

const updatePermissions = async (roleId, permissionIds) => {
    // 1. Delete all existing mappings for this role
    await prisma.permissionToRole.deleteMany({
        where: { roleId: parseInt(roleId) }
    });

    // 2. Create new mappings
    if (permissionIds && permissionIds.length > 0) {
        await prisma.permissionToRole.createMany({
            data: permissionIds.map(id => ({
                roleId: parseInt(roleId),
                permissionId: parseInt(id)
            }))
        });
    }

    return await prisma.role.findUnique({
        where: { id: parseInt(roleId) },
        include: {
            permissions: {
                include: { permission: true }
            }
        }
    });
};

module.exports = {
    listRoles,
    getPermissions,
    updatePermissions
};
