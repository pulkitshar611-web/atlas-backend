const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../utils/prisma');

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
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
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Your account is inactive. Please contact admin.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const roleName = user.role ? user.role.name : null;
        const permissions = user.role && user.role.permissions ? user.role.permissions.map(p => p.permission.code) : [];

        const token = jwt.sign(
            { id: user.id, email: user.email, role: roleName, permissions, createdById: user.createdById },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: roleName,
                permissions,
                createdById: user.createdById
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

const register = async (req, res) => {
    const { email, password, name, role } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        let roleConnection = {};
        if (role) {
            const roleRecord = await prisma.role.findUnique({ where: { name: role } });
            if (roleRecord) {
                roleConnection = { role: { connect: { id: roleRecord.id } } };
            } else {
                // Fallback or error if role doesn't exist? For now, default to SELLER or error
                // Assuming roles exist. If not, maybe create? schema says name unique.
                // Better to fail if role invalid
                return res.status(400).json({ message: 'Invalid role specified' });
            }
        }

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                ...roleConnection
            },
            include: { role: true }
        });

        res.status(201).json({
            message: 'User created successfully',
            user: { id: user.id, email: user.email, name: user.name, role: user.role.name }
        });
    } catch (error) {
        res.status(400).json({ message: 'Registration failed', error: error.message });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
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

        const permissions = user.role && user.role.permissions ? user.role.permissions.map(p => p.permission.code) : [];

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role ? user.role.name : null,
            permissions
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user data' });
    }
};

module.exports = { login, register, getMe };
