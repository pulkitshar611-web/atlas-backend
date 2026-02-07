const prisma = require('../../utils/prisma');

const listLogs = async (page = 1, limit = 50) => {
    const skip = (page - 1) * limit;

    const [total, logs] = await prisma.$transaction([
        prisma.auditLog.count(),
        prisma.auditLog.findMany({
            skip,
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' }
        })
    ]);

    // Fetch user details for the logs to display names
    // We do this separately or could use a relation if we linked AuditLog to User formally.
    // For now, let's just return the logs. Since we stored performedBy, we can fetch names if needed, 
    // but strictly sticking to the schema we defined: performedBy is an Int.
    // Ideally, we'd want to join relations, but AuditLog was defined without relation to User in schema to allow hard deletes of users if ever needed without losing logs (historically), 
    // OR we can fetch user names here. Let's fetch user names for better UX.

    const userIds = [...new Set(logs.map(log => log.performedBy))];
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true }
    });

    const userMap = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
    }, {});

    const enrichedLogs = logs.map(log => ({
        ...log,
        performerName: userMap[log.performedBy]?.name || 'Unknown',
        performerEmail: userMap[log.performedBy]?.email || 'Unknown'
    }));

    return {
        data: enrichedLogs,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

const getLogById = async (id) => {
    const log = await prisma.auditLog.findUnique({
        where: { id: parseInt(id) }
    });

    if (!log) return null;

    const user = await prisma.user.findUnique({
        where: { id: log.performedBy },
        select: { name: true, email: true }
    });

    return {
        ...log,
        performerName: user ? user.name : 'Unknown',
        performerEmail: user ? user.email : 'Unknown'
    };
};

module.exports = {
    listLogs,
    getLogById
};
