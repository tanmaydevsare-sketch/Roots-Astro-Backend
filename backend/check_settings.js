const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
  console.log("DATABASE SETTINGS VALUES:");
  console.log("systemCurrency:", settings?.systemCurrency);
}

main().finally(() => prisma.$disconnect());
