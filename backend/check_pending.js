const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Checking Database for Pending Entities ===");

  // 1. Astrologer Profiles
  const pendingAstrologers = await prisma.astrologerProfile.findMany({
    where: { status: 'PENDING_APPROVAL' },
    include: { user: true }
  });
  console.log(`\nFound ${pendingAstrologers.length} Pending Astrologers:`);
  pendingAstrologers.forEach(ap => {
    console.log(`- Profile ID ${ap.id}: ${ap.user.firstName} ${ap.user.lastName} (${ap.user.email}) | Certification: ${ap.certification} | Status: ${ap.status}`);
  });

  // 2. Withdrawals
  const pendingWithdrawals = await prisma.withdrawal.findMany({
    where: { status: 'PENDING' },
    include: { user: true }
  });
  console.log(`\nFound ${pendingWithdrawals.length} Pending Withdrawals:`);
  pendingWithdrawals.forEach(w => {
    console.log(`- Withdrawal ID ${w.id}: User ${w.user.firstName} ${w.user.lastName} (${w.user.email}) | Amount: ${w.amount} | Method: ${w.method} | Ref: ${w.reference}`);
  });

  // 3. Transactions
  const pendingTransactions = await prisma.transaction.findMany({
    where: { status: 'PENDING' }
  });
  console.log(`\nFound ${pendingTransactions.length} Pending Transactions:`);
  pendingTransactions.forEach(t => {
    console.log(`- Transaction ID ${t.id}: Amount: ${t.amount} | Type: ${t.type} | Cat: ${t.category} | Ref: ${t.reference}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
