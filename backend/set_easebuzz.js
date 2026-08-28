const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.globalSettings.update({
    where: { id: 1 },
    data: {
      activeDomesticGateway: 'easebuzz',
      easebuzzKey: 'easebuzz_test_key',
      easebuzzSalt: 'easebuzz_test_salt'
    }
  });
  console.log("UPDATED GLOBAL SETTINGS IN DATABASE:");
  console.log("Active Domestic Gateway:", settings.activeDomesticGateway);
  console.log("Easebuzz Key:", settings.easebuzzKey);
  console.log("Easebuzz Salt:", settings.easebuzzSalt);
}

main().finally(() => prisma.$disconnect());
