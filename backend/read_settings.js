const prisma = require('./config/prisma');

async function main() {
    try {
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        console.log("SETTINGS:", JSON.stringify(settings, null, 2));
    } catch (err) {
        console.error("Prisma error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
