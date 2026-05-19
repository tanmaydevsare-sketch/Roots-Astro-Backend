const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Vedic Astrology', description: 'Traditional Indian astrology systems' },
    { name: 'Tarot Card Reading', description: 'Divination using tarot deck' },
    { name: 'Palmistry', description: 'Hand reading services' },
    { name: 'Numerology', description: 'Study of numbers and their influence' }
  ];

  console.log('Seeding Master Categories...');
  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat
    });
  }

  const vedic = await prisma.serviceCategory.findUnique({ where: { name: 'Vedic Astrology' } });
  const tarot = await prisma.serviceCategory.findUnique({ where: { name: 'Tarot Card Reading' } });

  const masterServices = [
    { name: 'Natal Chart Analysis', categoryId: vedic.id, description: 'Complete birth chart analysis with predictions' },
    { name: 'Marriage Compatibility', categoryId: vedic.id, description: 'Synastry and Gun Milan for couples' },
    { name: 'Love Tarot Spread', categoryId: tarot.id, description: 'Insight into your romantic future' },
    { name: 'Career Guidance', categoryId: vedic.id, description: 'Astro-forecast for professional life' }
  ];

  console.log('Seeding Master Services...');
  for (const ms of masterServices) {
    const exists = await prisma.masterService.findFirst({ where: { name: ms.name } });
    if (!exists) {
      await prisma.masterService.create({ data: ms });
    }
  }

  console.log('Master Seed Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
