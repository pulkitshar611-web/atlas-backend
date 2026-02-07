const prisma = require('../../utils/prisma');

const getConfig = async () => {
    const configs = await prisma.systemConfiguration.findMany();
    // Return as an object for easier frontend consumption
    return configs.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});
};

const updateConfig = async (key, value) => {
    return await prisma.systemConfiguration.upsert({
        where: { key },
        update: { value },
        create: { key, value }
    });
};

const batchUpdateConfig = async (configs) => {
    const operations = Object.entries(configs).map(([key, value]) => {
        return prisma.systemConfiguration.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
    });
    return await prisma.$transaction(operations);
};

module.exports = {
    getConfig,
    updateConfig,
    batchUpdateConfig
};
