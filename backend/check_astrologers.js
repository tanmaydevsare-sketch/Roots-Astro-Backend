const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAstrologers() {
  try {
    const astros = await prisma.user.findMany({
      where: { role: 'ASTROLOGER' },
      include: { astrologerProfile: true }
    });

    console.log("=========================================");
    console.log("📊 REGISTERED ASTROLOGER ACCOUNTS 📊");
    console.log("=========================================");
    if (astros.length === 0) {
      console.log("No astrologers found in the database.");
    } else {
      astros.forEach(a => {
        console.log(`- ID: ${a.id}`);
        console.log(`  Name: ${a.firstName} ${a.lastName}`);
        console.log(`  Email: ${a.email}`);
        console.log(`  Phone: ${a.phone}`);
        console.log(`  Status: ${a.status}`);
        console.log(`  Profile Status: ${a.astrologerProfile?.status}`);
        console.log(`  Bio: ${a.astrologerProfile?.bio}`);
        console.log(`  UPI ID: ${a.astrologerProfile?.upiId}`);
        console.log("-----------------------------------------");
      });
    }
  } catch (err) {
    console.error("Error reading astrologers:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAstrologers();
