/**
 * Validates if the requested status update is allowed for a Call Center Agent.
 * @param {string} status - The next status
 * @returns {boolean}
 */
const isAllowedCallCenterStatus = (status) => {
    return ['CONFIRMED', 'CANCELLED'].includes(status);
};

module.exports = {
    isAllowedCallCenterStatus
};
