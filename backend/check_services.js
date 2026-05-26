const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Services in Database ===");
  const services = await prisma.service.findMany({
    include: {
      profile: {
        include: {
          user: true
        }
      },
      masterService: {
        include: {
          category: true
        }
      }
    }
  });

  console.log(`Total Services: ${services.length}`);
  services.forEach(s => {
    console.log(`- Service ID: ${s.id} | Title: "${s.title}" | Price: ${s.price} | Type: ${s.type}`);
    console.log(`  Astrologer: ${s.profile.user.firstName} ${s.profile.user.lastName}`);
    if (s.masterService) {
      console.log(`  Master Service: "${s.masterService.name}"`);
      console.log(`  Category: "${s.masterService.category.name}"`);
    } else {
      console.log(`  No Master Service linked`);
    }
    console.log("-----------------------------------------");
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
