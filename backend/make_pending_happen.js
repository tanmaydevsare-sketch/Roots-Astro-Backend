const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting process to make all pending entities happen...\n");

  // 1. Approve all pending Astrologer Profiles
  const pendingAstrologers = await prisma.astrologerProfile.findMany({
    where: { status: 'PENDING_APPROVAL' },
    include: { user: true }
  });

  console.log(`[Astrologers] Found ${pendingAstrologers.length} pending profiles.`);
  for (const ap of pendingAstrologers) {
    console.log(`Approving Astrologer: ${ap.user.firstName} ${ap.user.lastName} (Email: ${ap.user.email})`);
    
    // Update Astrologer Profile
    await prisma.astrologerProfile.update({
      where: { id: ap.id },
      data: { status: 'APPROVED' }
    });

    // Activate User
    await prisma.user.update({
      where: { id: ap.userId },
      data: { status: 'active' }
    });
    
    console.log(`✅ Approved and activated ID ${ap.id} / User ID ${ap.userId}`);
  }

  // 2. Complete all pending Withdrawals
  const pendingWithdrawals = await prisma.withdrawal.findMany({
    where: { status: 'PENDING' },
    include: { user: true }
  });

  console.log(`\n[Withdrawals] Found ${pendingWithdrawals.length} pending withdrawals.`);
  for (const w of pendingWithdrawals) {
    console.log(`Completing Withdrawal: User ${w.user.firstName} (Amount: ${w.amount}, Ref: ${w.reference})`);
    
    await prisma.withdrawal.update({
      where: { id: w.id },
      data: { 
        status: 'COMPLETED',
        processedAt: new Date(),
        adminNotes: 'Automatically processed by system task'
      }
    });

    console.log(`✅ Completed withdrawal ID ${w.id}`);
  }

  // 3. Complete all pending Transactions
  const pendingTransactions = await prisma.transaction.findMany({
    where: { status: 'PENDING' }
  });

  console.log(`\n[Transactions] Found ${pendingTransactions.length} pending transactions.`);
  for (const t of pendingTransactions) {
    console.log(`Completing Transaction ID ${t.id} (Amount: ${t.amount}, Ref: ${t.reference})`);
    
    await prisma.transaction.update({
      where: { id: t.id },
      data: { status: 'COMPLETED' }
    });

    console.log(`✅ Completed transaction ID ${t.id}`);
  }

  // 4. Complete all past Bookings that are still marked as BOOKED or IN_PROGRESS
  const now = new Date();
  const pastBookings = await prisma.booking.findMany({
    where: {
      scheduledAt: { lt: now },
      status: { in: ['BOOKED', 'IN_PROGRESS'] }
    },
    include: {
      client: true,
      astrologer: true
    }
  });

  console.log(`\n[Past Bookings] Found ${pastBookings.length} bookings in the past that are still pending/booked.`);
  for (const b of pastBookings) {
    console.log(`Completing Past Booking ID ${b.id}: Client ${b.client.firstName} with Astrologer ${b.astrologer.firstName} scheduled for ${b.scheduledAt.toISOString()}`);
    
    await prisma.booking.update({
      where: { id: b.id },
      data: {
        status: 'COMPLETED',
        endTime: now // Mark actual end time as now
      }
    });

    console.log(`✅ Completed past booking ID ${b.id}`);
  }

  console.log("\n✨ All pending entities successfully processed and approved!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
