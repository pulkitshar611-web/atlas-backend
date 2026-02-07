const prisma = require('../../utils/prisma');

const validateAssignment = async (orderId, agentId) => {
    const order = await prisma.order.findUnique({
        where: { id: parseInt(orderId) }
    });

    if (!order) throw new Error('Order not found');
    if (order.status !== 'CONFIRMED') {
        throw new Error(`Order must be in CONFIRMED status for assignment. Current status: ${order.status}`);
    }

    const agent = await prisma.user.findUnique({
        where: { id: parseInt(agentId) },
        include: { role: true }
    });

    if (!agent) throw new Error('Packaging Agent not found');
    if (agent.role.name !== 'PACKAGING_AGENT') {
        throw new Error('User is not a valid Packaging Agent');
    }

    return order;
};

const validateCompletion = async (taskId, agentId) => {
    const task = await prisma.packagingTask.findUnique({
        where: { id: parseInt(taskId) },
        include: { order: true }
    });

    if (!task) throw new Error('Packaging task not found');
    if (task.agentId !== parseInt(agentId)) {
        throw new Error('Forbidden: This task is not assigned to you');
    }
    if (task.completedAt) {
        throw new Error('Task is already completed');
    }
    if (task.order.status !== 'IN_PACKAGING') {
        throw new Error(`Order must be in IN_PACKAGING status for completion. Current status: ${task.order.status}`);
    }

    return task;
};

module.exports = {
    validateAssignment,
    validateCompletion
};
