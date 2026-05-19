const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log("Checking prisma.wallet access...");
    console.log("prisma.wallet exists:", !!prisma.wallet);
    const count = await prisma.wallet.count();
    console.log("Wallet count:", count);
    process.exit(0);
  } catch (err) {
    console.error("Error accessing wallet:", err);
    process.exit(1);
  }
}

check();
