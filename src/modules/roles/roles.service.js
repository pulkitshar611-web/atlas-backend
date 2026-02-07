const prisma = require('../../utils/prisma');

const listRoles = async () => {
    const roles = await prisma.role.findMany({
        include: {
            _count: {
                select: { users: true }
            },
            permissions: true
        }
    });

    return roles.map(role => ({
        id: role.id,
        name: role.name,
        users: role._count.users,
        permissions: role.permissions,
        description: `Manage ${role.name.toLowerCase()} operations`,
        status: 'Active'
    }));
};

const getPermissions = async () => {
    return await prisma.permission.findMany();
};

const updatePermissions = async (roleId, permissionIds) => {
    // 1. Disconnect all existing
    // 2. Connect new ones
    // simpler: using set (if array provided) or explicit loop

    // We expect permissionIds to be an array of integers (IDs)
    return await prisma.role.update({
        where: { id: parseInt(roleId) },
        data: {
            permissions: {
                set: permissionIds.map(id => ({ id: parseInt(id) }))
            }
        },
        include: {
            permissions: true
        }
    });
};

module.exports = {
    listRoles,
    getPermissions,
    updatePermissions
};
