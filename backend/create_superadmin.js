const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  const adminEmail = "admin@rootsastro.com";
  const adminPassword = "supersecureadminpassword123";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // 1. Create or update admin@rootsastro.com to SUPERADMIN
  let superAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (superAdmin) {
    superAdmin = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        password: hashedPassword,
        role: 'SUPERADMIN',
        status: 'active',
        firstName: 'Super',
        lastName: 'Admin'
      }
    });
    console.log("Updated existing user to SUPERADMIN:", superAdmin.email);
  } else {
    superAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: 'SUPERADMIN',
        status: 'active',
        firstName: 'Super',
        lastName: 'Admin'
      }
    });
    console.log("Created new SUPERADMIN user:", superAdmin.email);
  }

  // Ensure wallet exists for admin@rootsastro.com
  const wallet = await prisma.wallet.findUnique({ where: { userId: superAdmin.id } });
  if (!wallet) {
    await prisma.wallet.create({ data: { userId: superAdmin.id, balance: 0.0 } });
    console.log("Created wallet for Superadmin");
  }

  // 2. Also upgrade admin@test.com to SUPERADMIN just in case
  const testAdmin = await prisma.user.findUnique({
    where: { email: 'admin@test.com' }
  });

  if (testAdmin) {
    await prisma.user.update({
      where: { email: 'admin@test.com' },
      data: { role: 'SUPERADMIN' }
    });
    console.log("Upgraded admin@test.com to SUPERADMIN");
  }
}

main()
  .then(() => console.log("Superadmin provisioning complete!"))
  .catch(err => console.error("Error creating superadmin:", err))
  .finally(() => prisma.$disconnect());
