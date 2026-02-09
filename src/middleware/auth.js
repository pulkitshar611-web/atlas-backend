const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const verifyToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch fresh user data + permissions from DB
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true }
                        }
                    }
                }
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Attach to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role?.name,
            permissions: user.role?.permissions?.map(p => p.permission.code) || []
        };

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const roles = allowedRoles.flat();

        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Forbidden: You do not have permission to access this resource'
            });
        }
        next();
    };
};

const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        // Super Admin bypass
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
            return res.status(403).json({
                message: `Missing permission: ${requiredPermission}`
            });
        }
        next();
    };
};

module.exports = { verifyToken, authorizeRoles, checkPermission };
