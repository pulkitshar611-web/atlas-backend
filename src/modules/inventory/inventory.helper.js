/**
 * Validates if the requested quantity can be removed from current stock.
 * @param {number} currentQuantity - Current stock level
 * @param {number} requestedQuantity - Quantity to remove (positive number)
 * @returns {boolean}
 */
const canDeductStock = (currentQuantity, requestedQuantity) => {
    return currentQuantity >= requestedQuantity;
};

module.exports = {
    canDeductStock
};
