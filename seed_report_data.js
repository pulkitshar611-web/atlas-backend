const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding report data...');

    // Find a packaging agent (User ID 12 or similar)
    const agent = await prisma.user.findFirst({
        where: { role: { name: 'PACKAGING_AGENT' } }
    });

    if (!agent) {
        console.error('No Packaging Agent found to seed reports for.');
        return;
    }

    console.log(`Using agent: ${agent.name} (ID: ${agent.id})`);

    // Find some completed packaging tasks or create them
    const completedTasks = await prisma.packagingTask.findMany({
        where: { agentId: agent.id, completedAt: { not: null } },
        take: 5
    });

    for (const task of completedTasks) {
        const weight = (Math.random() * 5 + 0.5).toFixed(2);
        const qualityOptions = ['PASSED', 'PASSED', 'PASSED', 'CONDITIONAL', 'FAILED'];
        const qualityCheck = qualityOptions[Math.floor(Math.random() * qualityOptions.length)];

        await prisma.packagingTask.update({
            where: { id: task.id },
            data: {
                weight: parseFloat(weight),
                qualityCheck,
                notes: 'Seeded for report verification'
            }
        });
        console.log(`Updated Task ${task.id}: ${weight}kg, ${qualityCheck}`);
    }

    console.log('Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
