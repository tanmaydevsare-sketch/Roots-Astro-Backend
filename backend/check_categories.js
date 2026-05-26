const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Service Categories in Database ===");
  const categories = await prisma.serviceCategory.findMany({
    include: {
      masterServices: true
    }
  });

  console.log(`Total Categories: ${categories.length}`);
  categories.forEach(c => {
    console.log(`- ID: ${c.id} | Name: "${c.name}" | Active: ${c.active}`);
    c.masterServices.forEach(ms => {
      console.log(`    ↳ Master Service ID: ${ms.id} | Name: "${ms.name}" | Category ID: ${ms.categoryId}`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
