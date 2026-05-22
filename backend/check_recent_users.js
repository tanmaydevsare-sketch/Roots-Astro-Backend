const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { astrologerProfile: true, clientProfile: true }
    });

    console.log("=========================================");
    console.log("📊 RECENT 10 USER REGISTRATIONS 📊");
    console.log("=========================================");
    users.forEach(u => {
      console.log(`- ID: ${u.id}`);
      console.log(`  Name: ${u.firstName} ${u.lastName}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Phone: ${u.phone}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Status: ${u.status}`);
      console.log(`  Created At: ${u.createdAt}`);
      if (u.role === 'ASTROLOGER') {
        console.log(`  Astro Profile ID: ${u.astrologerProfile?.id}`);
        console.log(`  Astro Status: ${u.astrologerProfile?.status}`);
        console.log(`  Astro Bio: ${u.astrologerProfile?.bio}`);
      }
      console.log("-----------------------------------------");
    });
  } catch (err) {
    console.error("Error fetching recent users:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
