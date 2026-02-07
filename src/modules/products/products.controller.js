const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createProduct = async (req, res) => {
    try {
        const {
            name,
            nameAr,
            category,
            purchasePrice,
            sellingPrice,
            price,
            stockQuantity,
            stock,
            description,
            productLink,
            warehouse, // Expecting ID now
            variants,
            status,
            sellerId,
            image
        } = req.body;

        const { role, id: userId } = req.user;

        const finalName = name || req.body.nameEn;
        const finalPrice = parseFloat(sellingPrice || price);

        if (!finalName) {
            return res.status(400).json({ error: 'Product Name is required' });
        }
        if (isNaN(finalPrice)) {
            return res.status(400).json({ error: 'Selling Price is required and must be a number' });
        }

        const sku = req.body.sku || req.body.code || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const productData = {
            name: finalName,
            nameAr: nameAr || null,
            sku: sku,
            category: category || 'Uncategorized',
            description: description || '',
            purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
            price: finalPrice,
            stock: parseInt(stockQuantity || stock || 0),
            status: status || 'Active',
            productLink: productLink || null,
            image: image || null,
            variants: variants || [],
            sellerId: sellerId ? parseInt(sellerId) : null,
            adminId: (role === 'ADMIN' || role === 'SUPER_ADMIN') ? userId : null
        };

        // Add inventory creation if warehouse is provided
        if (warehouse && !isNaN(parseInt(warehouse))) {
            productData.inventory = {
                create: {
                    warehouseId: parseInt(warehouse),
                    quantity: productData.stock
                }
            };
        }

        const product = await prisma.product.create({
            data: productData,
            include: {
                seller: {
                    include: {
                        user: { select: { name: true } }
                    }
                },
                inventory: {
                    include: { warehouse: true }
                }
            }
        });

        return res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A product with this SKU already exists' });
        }
        return res.status(500).json({ error: 'Failed to create product', details: error.message });
    }
};

const getProducts = async (req, res) => {
    try {
        const { active } = req.query;
        const { role, id: userId, sellerId } = req.user;
        const where = {};

        if (role === 'SELLER') {
            const seller = await prisma.seller.findUnique({
                where: { userId: userId }
            });

            if (!seller) {
                return res.json([]);
            }

            where.sellerId = seller.id;
        } else if (role === 'ADMIN') {
            if (req.query.sellerId) {
                // If filtering by specific seller, ensure it's one they manage
                where.sellerId = parseInt(req.query.sellerId);
                where.seller = { adminId: userId };
            } else {
                // Otherwise show products created by this Admin OR products from their sellers
                where.OR = [
                    { adminId: userId },
                    { seller: { adminId: userId } }
                ];
            }
        }

        if (active === 'true') {
            where.status = 'Active';
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                seller: {
                    include: {
                        user: {
                            select: { name: true }
                        }
                    }
                },
                inventory: {
                    include: {
                        warehouse: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ error: 'Failed to fetch products' });
    }
};


const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { image, warehouse, ...updateData } = req.body; // warehouse separate
        const { role, id: userId } = req.user;

        // Check if product exists and belongs to admin
        const productToCheck = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: { seller: true }
        });

        if (!productToCheck) return res.status(404).json({ error: 'Product not found' });

        // Admin boundary
        if (role === 'ADMIN' && productToCheck.adminId !== userId && productToCheck.seller?.adminId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to update this product' });
        }

        // Convert types if present
        if (updateData.price) updateData.price = parseFloat(updateData.price);
        if (updateData.purchasePrice) updateData.purchasePrice = parseFloat(updateData.purchasePrice);
        if (updateData.stock) updateData.stock = parseInt(updateData.stock);

        // Update Inventory/Warehouse if provided
        if (warehouse && !isNaN(parseInt(warehouse))) {
            const warehouseId = parseInt(warehouse);

            // Check if inventory exists
            const existingInventory = await prisma.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: parseInt(id),
                        warehouseId: warehouseId
                    }
                }
            });

            if (existingInventory) {
                await prisma.inventory.update({
                    where: { id: existingInventory.id },
                    data: { quantity: updateData.stock !== undefined ? updateData.stock : existingInventory.quantity }
                });
            } else {
                await prisma.inventory.create({
                    data: {
                        productId: parseInt(id),
                        warehouseId: warehouseId,
                        quantity: updateData.stock || 0
                    }
                });
            }
        }

        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                ...updateData,
                image: image !== undefined ? image : undefined
            },
            include: {
                seller: {
                    include: {
                        user: { select: { name: true } }
                    }
                },
                inventory: {
                    include: { warehouse: true }
                }
            }
        });

        return res.json(product);
    } catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ error: 'Failed to update product', details: error.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: {
                seller: {
                    include: {
                        user: { select: { name: true, email: true, phone: true } }
                    }
                },
                inventory: {
                    include: { warehouse: true }
                }
            }
        });

        if (!product) return res.status(404).json({ error: 'Product not found' });

        return res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).json({ error: 'Failed to fetch product' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;

        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: { seller: true }
        });

        if (!product) return res.status(404).json({ error: 'Product not found' });

        // Admin boundary
        if (role === 'ADMIN' && product.adminId !== userId && product.seller?.adminId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this product' });
        }

        // Cleanup associated inventory and movements
        const inventory = await prisma.inventory.findMany({ where: { productId: parseInt(id) } });
        for (const item of inventory) {
            await prisma.stockMovement.deleteMany({ where: { inventoryId: item.id } });
        }
        await prisma.inventory.deleteMany({ where: { productId: parseInt(id) } });
        await prisma.orderItem.deleteMany({ where: { productId: parseInt(id) } });

        await prisma.product.delete({
            where: { id: parseInt(id) }
        });

        return res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({ error: 'Failed to delete product', details: error.message });
    }
};

const getAllProducts = getProducts;

const getActiveProducts = async (req, res) => {
    req.query.active = 'true';
    return getProducts(req, res);
};

module.exports = {
    createProduct,
    getProducts,
    getAllProducts,
    getActiveProducts,
    getProductById,
    updateProduct,
    deleteProduct
};
