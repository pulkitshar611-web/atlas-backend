const { createUser } = require('./src/modules/users/users.service');
const prisma = require('./src/utils/prisma');

async function test() {
    const requester = { id: 10, role: 'ADMIN' }; // Assuming 10 is an admin
    const userData = {
        email: `test_${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Test Reproduction User',
        roleName: 'SELLER',
        phone: '1234567890'
    };

    try {
        const user = await createUser(userData, requester);
        console.log('User created successfully:', user.id);
    } catch (error) {
        console.error('User creation failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
