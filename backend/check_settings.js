const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
  console.log("CREDENTIALS IN DATABASE:");
  console.log("zoomAccountId:", settings?.zoomAccountId);
  console.log("zoomClientId:", settings?.zoomClientId);
  console.log("zoomClientSecret:", settings?.zoomClientSecret);
  console.log("razorpayKeyId:", settings?.razorpayKeyId);
  console.log("razorpayKeySecret:", settings?.razorpayKeySecret);
}

main().finally(() => prisma.$disconnect());
