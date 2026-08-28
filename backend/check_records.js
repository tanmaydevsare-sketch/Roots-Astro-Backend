const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const bookingCount = await prisma.booking.count();
  const transactionCount = await prisma.transaction.count();
  const disputeCount = await prisma.disputeClaim.count();
  const payoutCount = await prisma.monthlyPayout.count();
  const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });

  console.log("DATABASE RECORD COUNT DIAGNOSTICS:");
  console.log("- Users:", userCount);
  console.log("- Bookings:", bookingCount);
  console.log("- Transactions:", transactionCount);
  console.log("- Disputes:", disputeCount);
  console.log("- Monthly Payouts:", payoutCount);
  console.log("- Settings Table Configured:", !!settings);
  if (settings) {
    console.log("  - Active Gateway:", settings.activeDomesticGateway);
  }
}

main().finally(() => prisma.$disconnect());
