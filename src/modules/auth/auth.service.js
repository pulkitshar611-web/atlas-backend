const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../utils/prisma');

const validateCredentials = async (email, password) => {
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            role: true,
            seller: true
        }
    });

    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
};

const generateToken = (user) => {
    const payload = {
        id: user.id,
        role: user.role.name,
        sellerId: user.seller ? user.seller.id : null
    };


    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
};

module.exports = {
    validateCredentials,
    generateToken
};
