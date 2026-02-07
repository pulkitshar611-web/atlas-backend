const prisma = require('../../utils/prisma'); // path adjusted

const getCustomers = async (req, res) => {
    try {
        const customers = await prisma.customer.findMany();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching customers' });
    }
};

const getCustomerById = async (req, res) => {
    const { id } = req.params;
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: parseInt(id) },
            include: {
                orders: {
                    include: { items: { include: { product: true } } }
                }
            }
        });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching customer details' });
    }
};

module.exports = { getCustomers, getCustomerById };
