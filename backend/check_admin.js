const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: 'admin'
      }
    }
  });
  console.log("ADMIN USERS IN DATABASE:");
  users.forEach(u => {
    console.log(`ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Status: ${u.status}`);
  });
}

main().finally(() => prisma.$disconnect());
