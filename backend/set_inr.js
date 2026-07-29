const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.globalSettings.update({
    where: { id: 1 },
    data: { systemCurrency: 'INR' }
  });
  console.log("UPDATED SYSTEM CURRENCY IN DATABASE:", settings.systemCurrency);
}

main().finally(() => prisma.$disconnect());
