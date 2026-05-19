const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany();
    console.log('USERS:', JSON.stringify(users, null, 2));
    const setup = await prisma.globalSettings.findFirst();
    console.log('SETTINGS:', JSON.stringify(setup, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
