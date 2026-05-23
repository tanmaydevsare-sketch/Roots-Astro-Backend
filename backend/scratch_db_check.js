const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No users found in database, but schema initialized successfully.");
  } else {
    console.log("SUCCESS! Database columns present:", {
      id: user.id,
      email: user.email,
      role: user.role,
      image: user.image !== undefined ? 'PRESENT' : 'MISSING',
      isPasswordSet: user.isPasswordSet !== undefined ? `PRESENT (${user.isPasswordSet})` : 'MISSING'
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
