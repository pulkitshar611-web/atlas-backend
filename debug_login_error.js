const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Attempting to fetch admin@atlas.com...');
        const user = await prisma.user.findUnique({
            where: { email: 'admin@atlas.com' },
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
        console.log('User found:', !!user);
    } catch (error) {
        console.error('FULL PRISMA ERROR:');
        console.error(error);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
