const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Roots Astro Database (Encrypted)...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Super Admin (Encrypted)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'active',
      firstName: 'Roots',
      lastName: 'Superadmin'
    }
  });
  console.log('✅ Super Admin created (Encrypted): admin@test.com / password123');

  // 2. Create Existing Expert (Approved)
  await prisma.user.upsert({
    where: { email: 'astro@test.com' },
    update: { password: hashedPassword },
    create: {
      email: 'astro@test.com',
      password: hashedPassword,
      role: 'ASTROLOGER',
      status: 'active',
      firstName: 'Expert',
      lastName: 'Astrologer',
      astrologerProfile: {
        create: {
          bio: 'Elite Vedic expert with 15+ years of experience in planetary governance.',
          expertise: 'Vedic Astrology',
          languages: 'English, Hindi',
          experienceInt: 15,
          rate: '99',
          isOnline: true,
          upiId: 'astro@bank'
        }
      }
    }
  });
  console.log('✅ Approved Astrologer created: astro@test.com');

  // 3. Create a Pending Expert (For Admin to Approve)
  await prisma.user.upsert({
    where: { email: 'pending@test.com' },
    update: { password: hashedPassword },
    create: {
      email: 'pending@test.com',
      password: hashedPassword,
      role: 'ASTROLOGER',
      status: 'PENDING',
      firstName: 'New',
      lastName: 'Applicant',
      astrologerProfile: {
        create: {
          bio: 'I am a new applicant waiting to be vetted by the Roots Team.',
          expertise: 'Palmistry',
          languages: 'English',
          experienceInt: 5,
          rate: '50',
          idNumber: 'CERT-998877',
          upiId: 'applicant@upi'
        }
      }
    }
  });
  console.log('✅ Pending Application created: pending@test.com');

  console.log('🚀 Seeding complete! Database is now secure and ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
