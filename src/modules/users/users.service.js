const bcrypt = require('bcryptjs');
const prisma = require('../../utils/prisma');
const { logAction } = require('../../utils/auditLogger');

const ROLE_SCOPES = {
    SUPER_ADMIN: ['ADMIN'], // Super Admin can ONLY create Admins
    ADMIN: [ // Admin can create operational roles ONLY
        'SELLER',
        'CALL_CENTER_AGENT',
        'CALL_CENTER_MANAGER',
        'STOCK_KEEPER',
        'PACKAGING_AGENT',
        'DELIVERY_AGENT'
    ]
};


const getAllowedRoles = (requesterRole) => {
    return ROLE_SCOPES[requesterRole] || [];
};

const createUser = async (userData, requester) => {
    const requesterRole = requester.role;
    const requesterId = requester.id;

    const {
        email,
        password,
        name,
        roleName,
        phone,
        storeLink,
        bankName,
        accountHolder,
        accountNumber,
        ibanConfirmation,
        idFrontImage,
        idBackImage,
        isActive,
        shopName
    } = userData;

    // 1. Role Boundary Check
    const allowedRoles = getAllowedRoles(requesterRole);
    if (!allowedRoles.includes(roleName)) {
        throw new Error(`Forbidden: You cannot create users with the role ${roleName}`);
    }

    // 2. Role Existence Check
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new Error('Invalid role specified');

    // 3. User Existence Check
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('User with this email already exists');

    // 4. Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            phone,
            roleId: role.id,
            isActive: isActive !== undefined ? isActive : true,
            storeLink,
            bankName,
            accountHolder,
            accountNumber,
            ibanConfirmation,
            idFrontImage,
            idBackImage,
            createdById: requesterId // Track who created this user
        },
        include: { role: true }
    });

    await logAction({
        actionType: 'USER_CREATE',
        entityType: 'USER',
        entityId: user.id,
        user: requesterId,
        metadata: { email: user.email, role: roleName }
    });

    // 5. If role is SELLER, create a Seller entry and link to Admin
    if (roleName === 'SELLER') {
        await prisma.seller.create({
            data: {
                userId: user.id,
                shopName: shopName || name, // Use provided shopName or fallback to user name
                adminId: requesterRole === 'ADMIN' ? requesterId : null // Link to admin
            }
        });
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
};


const listUsers = async (requester) => {
    const requesterRole = requester.role;
    const requesterId = requester.id;
    const allowedRoles = getAllowedRoles(requesterRole);

    let where = {
        role: {
            name: { in: allowedRoles }
        }
    };

    // Admin only sees users they created
    if (requesterRole === 'ADMIN') {
        where.createdById = requesterId;
    }

    return await prisma.user.findMany({
        where,
        select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            createdAt: true,
            role: {
                select: { name: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};


const updateUserStatus = async (userId, isActive, requesterRole, adminUserId) => { // Added adminUserId for logging
    const userToUpdate = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        include: { role: true }
    });

    if (!userToUpdate) throw new Error('User not found');

    // Role Boundary Check for the target user
    const allowedRoles = getAllowedRoles(requesterRole);
    if (!allowedRoles.includes(userToUpdate.role.name)) {
        throw new Error('Forbidden: You do not have permission to manage this user');
    }

    const updatedUser = await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { isActive },
        include: { role: true } // Include role to get name for logging
    });

    await logAction({
        actionType: 'USER_STATUS_UPDATE',
        entityType: 'USER',
        entityId: updatedUser.id,
        user: adminUserId, // Assuming adminUserId is passed for logging
        metadata: { newStatus: isActive ? 'ACTIVE' : 'INACTIVE', targetUser: updatedUser.email }
    });

    // Return a subset of fields as originally intended by the select block
    const { password, ...userWithoutPassword } = updatedUser;
    return {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        isActive: userWithoutPassword.isActive,
        role: { name: userWithoutPassword.role.name }
    };
};

const getUserById = async (userId, requester) => {
    const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        include: { role: true, seller: true }
    });

    if (!user) throw new Error('User not found');

    // Role Boundary Check
    const allowedRoles = getAllowedRoles(requester.role);
    if (!allowedRoles.includes(user.role.name) && requester.id !== user.id) {
        throw new Error('Forbidden: You do not have permission to view this user');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

const updateUser = async (userId, updateData, requester) => {
    const userToUpdate = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        include: { role: true, seller: true }
    });

    if (!userToUpdate) throw new Error('User not found');

    const allowedRoles = getAllowedRoles(requester.role);
    if (!allowedRoles.includes(userToUpdate.role.name) && requester.id !== userToUpdate.id) {
        throw new Error('Forbidden: You do not have permission to edit this user');
    }

    const { password, roleName, shopName, role, ...otherData } = updateData;

    // Define valid User model fields
    const validUserFields = [
        'email', 'name', 'phone', 'isActive', 'storeLink',
        'bankName', 'accountHolder', 'accountNumber',
        'ibanConfirmation', 'idFrontImage', 'idBackImage'
    ];

    const data = {};
    Object.keys(otherData).forEach(key => {
        if (validUserFields.includes(key)) {
            data[key] = otherData[key];
        }
    });

    if (password) {
        data.password = await bcrypt.hash(password, 10);
    }

    if (roleName) {
        if (!allowedRoles.includes(roleName)) {
            throw new Error(`Forbidden: You cannot assign the role ${roleName}`);
        }
        const foundRole = await prisma.role.findUnique({ where: { name: roleName } });
        if (!foundRole) throw new Error('Invalid role specified');
        data.roleId = foundRole.id;
    }

    // Update User
    const updatedUser = await prisma.user.update({
        where: { id: parseInt(userId) },
        data,
        include: { role: true, seller: true }
    });

    // If it's a seller and shopName is provided, update Seller model
    if (shopName && updatedUser.seller) {
        await prisma.seller.update({
            where: { id: updatedUser.seller.id },
            data: { shopName }
        });
    }

    await logAction({
        actionType: 'USER_UPDATE',
        entityType: 'USER',
        entityId: updatedUser.id,
        user: requester.id,
        metadata: { email: updatedUser.email, role: updatedUser.role.name }
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
};

const deleteUser = async (userId, requester) => {
    const userToDelete = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        include: { role: true, seller: true }
    });

    if (!userToDelete) throw new Error('User not found');

    // Role Boundary Check
    const allowedRoles = getAllowedRoles(requester.role);
    if (!allowedRoles.includes(userToDelete.role.name)) {
        throw new Error('Forbidden: You do not have permission to delete this user');
    }

    // Handle Seller deletion if exists
    if (userToDelete.seller) {
        await prisma.seller.delete({ where: { id: userToDelete.seller.id } });
    }

    await prisma.user.delete({
        where: { id: parseInt(userId) }
    });

    await logAction({
        actionType: 'USER_DELETE',
        entityType: 'USER',
        entityId: parseInt(userId),
        user: requester.id,
        metadata: { email: userToDelete.email, name: userToDelete.name }
    });

    return { message: 'User deleted successfully' };
};

module.exports = {
    createUser,
    listUsers,
    updateUserStatus,
    getUserById,
    updateUser,
    deleteUser,
    getAllowedRoles
};
