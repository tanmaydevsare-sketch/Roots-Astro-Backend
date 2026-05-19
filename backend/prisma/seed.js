const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'admin@test.com', password: hashedPassword, firstName: 'Super', lastName: 'Admin', role: 'SUPERADMIN' },
    { email: 'astro@test.com', password: hashedPassword, firstName: 'Astrologer', lastName: 'Verified', role: 'ASTROLOGER' },
    { email: 'writer@test.com', password: hashedPassword, firstName: 'Content', lastName: 'Writer', role: 'WRITER' },
    { email: 'client@test.com', password: hashedPassword, firstName: 'Elite', lastName: 'Client', role: 'CLIENT' },
  ];

  console.log('Seeding user baseline...');

  for (const u of users) {
    const exists = await prisma.user.findUnique({ where: { email: u.email } });
    if (!exists) {
        const user = await prisma.user.create({ data: u });
        console.log(`Created ${u.role}: ${u.email}`);
        
        if (u.role === 'ASTROLOGER') {
            await prisma.astrologerProfile.create({ data: { userId: user.id, status: 'APPROVED', expertise: 'Vedic Astrology' } });
            await prisma.wallet.create({ data: { userId: user.id, balance: 500.0 } });
        } else if (u.role === 'CLIENT') {
            await prisma.clientProfile.create({ data: { userId: user.id } });
            await prisma.wallet.create({ data: { userId: user.id, balance: 250.0 } });
        }
    }
  }

  // Create Global Settings if not exists
  const settings = await prisma.globalSettings.findFirst();
  if (!settings) {
    await prisma.globalSettings.create({
        data: {
            id: 1,
            platformName: 'Roots Astro',
            commissionRate: 0.25,
            maintenanceMode: false
        }
    });
    console.log('Created Default Global Settings');
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
