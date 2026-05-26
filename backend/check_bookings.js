const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Checking Bookings in Database ===");
  const bookings = await prisma.booking.findMany({
    include: {
      client: true,
      astrologer: true,
      service: true
    }
  });

  console.log(`Total Bookings: ${bookings.length}`);
  bookings.forEach(b => {
    console.log(`- ID: ${b.id}`);
    console.log(`  Client: ${b.client.firstName} ${b.client.lastName} (${b.client.email})`);
    console.log(`  Astrologer: ${b.astrologer.firstName} ${b.astrologer.lastName} (${b.astrologer.email})`);
    console.log(`  Service: ${b.service ? b.service.title : 'None'} (${b.service ? b.service.type : 'N/A'})`);
    console.log(`  Scheduled At: ${b.scheduledAt.toISOString()}`);
    console.log(`  Status: ${b.status}`);
    console.log(`  Amount: ${b.amount}`);
    console.log("-----------------------------------------");
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
