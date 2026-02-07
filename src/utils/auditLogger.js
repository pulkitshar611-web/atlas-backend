const prisma = require('./prisma');

/**
 * Logs a critical system action to the AuditLog table.
 * This function is fail-safe and will not throw errors to the caller.
 * 
 * @param {Object} params
 * @param {string} params.actionType - Define constant for action (e.g., 'LOGIN', 'ORDER_CREATED')
 * @param {string} params.entityType - 'USER', 'ORDER', 'INVENTORY', etc.
 * @param {number|null} params.entityId - ID of the entity being acted upon
 * @param {Object} params.user - The user object performing the action (req.user)
 * @param {Object} [params.metadata] - Optional JSON metadata
 */
const logAction = async ({ actionType, entityType, entityId, user, metadata = {} }) => {
    try {
        if (!user || !user.id) {
            console.warn('AuditLog skipped: No user provided');
            return;
        }

        await prisma.auditLog.create({
            data: {
                actionType,
                entityType,
                entityId: entityId ? parseInt(entityId) : null,
                performedBy: user.id,

                performedByRole: user.role,
                metadata
            }
        });
    } catch (error) {
        // Silent failure to avoid breaking business logic
        console.error('AuditLog Failed:', error.message);
    }
};

module.exports = {
    logAction
};
