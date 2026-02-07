const prisma = require('../../utils/prisma');

const validateAssignment = async (orderId, agentId) => {
    const order = await prisma.order.findUnique({
        where: { id: parseInt(orderId) }
    });

    if (!order) throw new Error('Order not found');
    if (order.status !== 'PACKED') {
        throw new Error(`Order must be in PACKED status for delivery assignment. Current status: ${order.status}`);
    }

    const agent = await prisma.user.findUnique({
        where: { id: parseInt(agentId) },
        include: { role: true }
    });

    if (!agent) throw new Error('Delivery Agent not found');
    if (agent.role.name !== 'DELIVERY_AGENT') {
        throw new Error('User is not a valid Delivery Agent');
    }

    return order;
};

const validateCompletion = async (taskId, agentId) => {
    const task = await prisma.deliveryTask.findUnique({
        where: { id: parseInt(taskId) },
        include: { order: true }
    });

    if (!task) throw new Error('Delivery task not found');
    if (task.agentId !== parseInt(agentId)) {
        throw new Error('Forbidden: This task is not assigned to you');
    }
    if (task.completedAt) {
        throw new Error('Delivery already completed');
    }
    if (task.order.status !== 'OUT_FOR_DELIVERY') {
        throw new Error(`Order must be in OUT_FOR_DELIVERY status for completion. Current status: ${task.order.status}`);
    }

    return task;
};

module.exports = {
    validateAssignment,
    validateCompletion
};
