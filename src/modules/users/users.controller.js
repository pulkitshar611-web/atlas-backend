const userService = require('./users.service');

const createUser = async (req, res) => {
    try {
        const user = await userService.createUser(req.body, req.user);

        res.status(201).json(user);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 : 400;
        res.status(status).json({ message: error.message });
    }
};

const listUsers = async (req, res) => {
    try {
        const users = await userService.listUsers(req.user);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateStatus = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive status is required as boolean' });
    }

    try {
        const user = await userService.updateUserStatus(id, isActive, req.user.role, req.user.id);
        res.json(user);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 :
            error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

const getUser = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id, req.user);
        res.json(user);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 :
            error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const user = await userService.updateUser(req.params.id, req.body, req.user);
        res.json(user);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 :
            error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const result = await userService.deleteUser(req.params.id, req.user);
        res.json(result);
    } catch (error) {
        const status = error.message.includes('Forbidden') ? 403 :
            error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

module.exports = {
    createUser,
    listUsers,
    updateStatus,
    getUser,
    updateUser,
    deleteUser
};
