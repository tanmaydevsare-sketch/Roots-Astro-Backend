const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Astrologer Services linked to Master Services...");

  // 1. Ensure Palm Line Reading Master Service exists for Palmistry
  const palmistryCat = await prisma.serviceCategory.findUnique({ where: { name: 'Palmistry' } });
  if (!palmistryCat) {
    console.error("❌ Palmistry category not found!");
    return;
  }

  let palmLineReading = await prisma.masterService.findFirst({ where: { name: 'Palm Line Reading' } });
  if (!palmLineReading) {
    palmLineReading = await prisma.masterService.create({
      data: {
        name: 'Palm Line Reading',
        description: 'Detailed hand line and mount analysis for destiny insights',
        categoryId: palmistryCat.id,
        active: true
      }
    });
    console.log("✅ Created 'Palm Line Reading' master service under Palmistry.");
  }

  // 2. Fetch all required Master Services
  const natalChart = await prisma.masterService.findFirst({ where: { name: 'Natal Chart Analysis' } });
  const marriageComp = await prisma.masterService.findFirst({ where: { name: 'Marriage Compatibility' } });
  const loveTarot = await prisma.masterService.findFirst({ where: { name: 'Love Tarot Spread' } });
  const careerGuidance = await prisma.masterService.findFirst({ where: { name: 'Career Guidance' } });
  const nameSpelling = await prisma.masterService.findFirst({ where: { name: 'Name Spelling Analysis' } });

  // 3. Find Astrologer Profiles
  const expertProfile = await prisma.astrologerProfile.findFirst({ where: { user: { email: 'astro@test.com' } } });
  const pendingProfile = await prisma.astrologerProfile.findFirst({ where: { user: { email: 'pending@test.com' } } });
  const tsdProfile = await prisma.astrologerProfile.findFirst({ where: { user: { email: '919599445291@rootsastro.com' } } });
  const maneeshaProfile = await prisma.astrologerProfile.findFirst({ where: { user: { email: '919910091281@rootsastro.com' } } });
  const anubhaProfile = await prisma.astrologerProfile.findFirst({ where: { user: { email: '919810022115@rootsastro.com' } } });

  const seedService = async (profile, masterService, price, duration) => {
    if (!profile || !masterService) return;
    
    // Check if service already exists for this profile
    const existing = await prisma.service.findFirst({
      where: {
        profileId: profile.id,
        masterServiceId: masterService.id
      }
    });

    if (!existing) {
      await prisma.service.create({
        data: {
          profileId: profile.id,
          masterServiceId: masterService.id,
          title: masterService.name,
          description: masterService.description || '',
          price: parseFloat(price),
          duration: parseInt(duration),
          type: 'CHAT',
          active: true
        }
      });
      console.log(`✅ Seeded service "${masterService.name}" for Profile ID ${profile.id} (Price: ${price})`);
    } else {
      console.log(`ℹ️ Service "${masterService.name}" already exists for Profile ID ${profile.id}`);
    }
  };

  // Seed Expert Astrologer (Vedic)
  await seedService(expertProfile, natalChart, 99, 45);

  // Seed New Applicant (Palmistry)
  await seedService(pendingProfile, palmLineReading, 50, 30);

  // Seed TSD (Numerology & Tarot)
  await seedService(tsdProfile, loveTarot, 75, 30);
  await seedService(tsdProfile, nameSpelling, 100, 30);

  // Seed Maneesha Devsare (Vedic Astrology & Vastu)
  await seedService(maneeshaProfile, natalChart, 150, 45);
  await seedService(maneeshaProfile, marriageComp, 200, 60);
  await seedService(maneeshaProfile, careerGuidance, 120, 30);

  // Seed Anubha Jain (Vedic Astrology)
  await seedService(anubhaProfile, natalChart, 120, 45);
  await seedService(anubhaProfile, careerGuidance, 100, 30);

  console.log("\n✨ All astrologer services seeded successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
