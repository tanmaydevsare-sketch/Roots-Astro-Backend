const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.update({
    where: { id: 4 },
    data: { status: 'PENDING' }
  });
  await prisma.astrologerProfile.update({
    where: { userId: 4 },
    data: { status: 'PENDING_APPROVAL' }
  });
  console.log("✅ TSD successfully reverted to PENDING and PENDING_APPROVAL!");
}

main()
  .catch(err => {
    console.error("❌ Error reverting TSD:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
