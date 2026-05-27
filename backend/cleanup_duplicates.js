const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking for duplicate services in the database...");
  const allServices = await prisma.service.findMany({
    orderBy: { id: 'asc' }
  });

  console.log(`📊 Found ${allServices.length} total services.`);

  const seen = new Set();
  const duplicates = [];

  for (const svc of allServices) {
    // Generate a unique key for profile + masterService (or title if masterServiceId is null)
    const key = svc.masterServiceId 
      ? `m-${svc.profileId}-${svc.masterServiceId}`
      : `t-${svc.profileId}-${svc.title.toLowerCase().trim()}`;

    if (seen.has(key)) {
      duplicates.push(svc.id);
    } else {
      seen.add(key);
    }
  }

  console.log(`⚠️ Found ${duplicates.length} duplicate services.`);

  if (duplicates.length > 0) {
    console.log("🧹 Deleting duplicate records...");
    const deleteResult = await prisma.service.deleteMany({
      where: {
        id: { in: duplicates }
      }
    });
    console.log(`✅ Deleted ${deleteResult.count} duplicate services!`);
  } else {
    console.log("✨ No duplicate services found.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
