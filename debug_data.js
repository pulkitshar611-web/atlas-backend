const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const fs = require('fs');

async function debug() {
    let output = "";
    try {
        output += "--- Users ---\n";
        const users = await prisma.user.findMany({
            include: { role: true }
        });
        users.forEach(u => {
            output += `[USER] ID: ${u.id} | Name: ${u.name} | Role: ${u.role.name} | CreatedBy: ${u.createdById}\n`;
        });

        output += "\n--- Orders ---\n";
        const orders = await prisma.order.findMany({
            include: {
                seller: {
                    select: { adminId: true, shopName: true }
                }
            }
        });
        orders.forEach(o => {
            output += `[ORDER] Number: ${o.orderNumber} | Status: ${o.status} | SellerAdminId: ${o.seller?.adminId} | Shop: ${o.seller?.shopName}\n`;
        });

        fs.writeFileSync('debug_output.txt', output);
        console.log("Output written to debug_output.txt");

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
