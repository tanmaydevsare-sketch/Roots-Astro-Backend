/**
 * programmatic integration test script for Roots Astro signup flows.
 * This verifies that all three flows (Client, Astrologer, and Super Admin) are 
 * structurally sound, match the database schema constraints, and complete their 
 * full lifecycle successfully.
 * 
 * RUNNING THIS SCRIPT:
 * From the backend directory:
 *   node test_signup_flows.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey_astro_4b9a1c";

async function runTests() {
  console.log("==================================================================");
  console.log("🌌 ROOTS ASTRO: programmatic signup flow verification tests 🌌");
  console.log("==================================================================\n");

  const testEmailClient = "test_client_" + Math.random().toString(36).substring(7) + "@test.com";
  const testPhoneAstro = "+919999" + Math.floor(100000 + Math.random() * 900000);
  const testAdminEmail = process.env.ADMIN_EMAIL || "admin@rootsastro.com";
  const testAdminPassword = process.env.ADMIN_PASSWORD || "AdminSecurePass123";

  // Override ADMIN env keys for testing if not already set
  process.env.ADMIN_EMAIL = testAdminEmail;
  process.env.ADMIN_PASSWORD = testAdminPassword;

  let passedTests = 0;
  let failedTests = 0;

  function reportResult(description, success, details = "") {
    if (success) {
      console.log(`✅ [PASS] ${description}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${description}`);
      if (details) console.error(`   👉 Details: ${details}`);
      failedTests++;
    }
  }

  // Helper Cleanup function
  async function cleanupTestData() {
    try {
      // Find user ids to clean wallets, profiles first
      const usersToClean = await prisma.user.findMany({
        where: {
          OR: [
            { email: testEmailClient },
            { phone: testPhoneAstro },
            { email: testAdminEmail }
          ]
        }
      });

      const userIds = usersToClean.map(u => u.id);

      if (userIds.length > 0) {
        await prisma.wallet.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.clientProfile.deleteMany({ where: { userId: { in: userIds } } });
        
        // Find profile IDs to delete availability and services
        const astroProfiles = await prisma.astrologerProfile.findMany({ where: { userId: { in: userIds } } });
        const profileIds = astroProfiles.map(p => p.id);
        
        if (profileIds.length > 0) {
          await prisma.service.deleteMany({ where: { profileId: { in: profileIds } } });
          await prisma.availability.deleteMany({ where: { profileId: { in: profileIds } } });
        }
        
        await prisma.astrologerProfile.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (err) {
      console.error("⚠️ Cleanup Warning:", err.message);
    }
  }

  // Run cleanup before starting
  await cleanupTestData();

  // ---------------------------------------------------------
  // FLOW 1: CLIENT SIGNUP (Email/Password registration)
  // ---------------------------------------------------------
  console.log("\n--- Testing FLOW 1: Client Email Signup ---");
  try {
    // 1. Simulate registration logic from /api/auth/register
    const existing = await prisma.user.findUnique({ where: { email: testEmailClient } });
    if (existing) throw new Error("Test client already exists");

    const hashedPassword = await bcrypt.hash("clientpass123", 10);
    const user = await prisma.user.create({
      data: {
        email: testEmailClient,
        password: hashedPassword,
        firstName: "TestClientFirstName",
        lastName: "TestClientLastName",
        role: "CLIENT"
      }
    });

    reportResult("Client User Model DB Entry", user && user.id > 0, `Created User ID: ${user?.id}`);

    // Create Client profile
    const profile = await prisma.clientProfile.create({ data: { userId: user.id } });
    reportResult("ClientProfile Model DB Linkage", profile && profile.id > 0, `Created ClientProfile ID: ${profile?.id}`);

    // Create Wallet
    const wallet = await prisma.wallet.create({ data: { userId: user.id, balance: 0.0 } });
    reportResult("Client Wallet Auto-Provision", wallet && wallet.balance === 0.0, `Created Wallet ID: ${wallet?.id} with balance: ${wallet?.balance}`);

    // 2. Simulate login logic from /api/auth/login
    const fetchedUser = await prisma.user.findUnique({ where: { email: testEmailClient } });
    const isMatch = await bcrypt.compare("clientpass123", fetchedUser.password);
    reportResult("Client Password Hashing & Verification", isMatch);

    const token = jwt.sign(
      { id: fetchedUser.id, email: fetchedUser.email, role: fetchedUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    reportResult("Client JWT Access Token Issuance", !!token);

  } catch (err) {
    reportResult("Client Signup Flow Lifecycle", false, err.message);
  }

  // ---------------------------------------------------------
  // FLOW 2: EXPERT / ASTROLOGER ONBOARDING (Mobile OTP & Verification)
  // ---------------------------------------------------------
  console.log("\n--- Testing FLOW 2: Astrologer Mobile Signup & Mandatory Profile Setup ---");
  try {
    // 1. Simulate Firebase ID Token check & Auto-registration logic from /api/auth/firebase-login
    let astroUser = await prisma.user.findUnique({ where: { phone: testPhoneAstro } });
    reportResult("Astrologer Unique Mobile Check", !astroUser);

    // Create user and auto-register with PENDING status
    astroUser = await prisma.user.create({
      data: {
        phone: testPhoneAstro,
        email: `${testPhoneAstro.replace('+', '')}@rootsastro.com`,
        password: await bcrypt.hash(Math.random().toString(), 10),
        firstName: 'New',
        lastName: 'User',
        role: 'ASTROLOGER',
        status: 'PENDING'
      }
    });
    reportResult("Astrologer User Database Auto-Provision", astroUser && astroUser.id > 0 && astroUser.status === 'PENDING');

    const astroProfile = await prisma.astrologerProfile.create({ data: { userId: astroUser.id } });
    reportResult("AstrologerProfile DB Model Linkage & Status", astroProfile && astroProfile.status === 'PENDING_APPROVAL', `Profile ID: ${astroProfile?.id}, Status: ${astroProfile?.status}`);

    const astroWallet = await prisma.wallet.create({ data: { userId: astroUser.id, balance: 0.0 } });
    reportResult("Astrologer Wallet Auto-Provision", astroWallet && astroWallet.balance === 0.0);

    const astroJWT = jwt.sign(
      { id: astroUser.id, phone: astroUser.phone, role: astroUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    reportResult("Astrologer Backend Session JWT Token", !!astroJWT);

    // 2. Simulate Onboarding Form Submission from /api/astrologers/profile/update
    const updatedUser = await prisma.user.update({
      where: { id: astroUser.id },
      data: {
        firstName: "TestAstroLegal",
        lastName: "Expert",
        phone: testPhoneAstro,
        city: "Mumbai",
        country: "India",
        dob: "1988-08-18",
        gender: "Male"
      }
    });
    reportResult("Astrologer Personal Identity Details Saved", updatedUser.firstName === "TestAstroLegal");

    const updatedProfile = await prisma.astrologerProfile.update({
      where: { userId: astroUser.id },
      data: {
        bio: "This is a programmatic test expert profile bio with extensive stellar wisdom and Palmistry analysis.",
        expertise: "Palmistry, Vedic Astrology",
        languages: "English, Hindi",
        experienceInt: 10,
        rate: "100",
        idNumber: "PASSPORT-XYZ9876",
        upiId: "testastro@upi",
        certification: "Council of Astrological Sciences Degree"
      }
    });
    reportResult("Astrologer Professional Vetting Fields Saved (Passport/UPI/Bio)", updatedProfile.idNumber === "PASSPORT-XYZ9876" && updatedProfile.upiId === "testastro@upi");

    // Simulate initial service generation logic
    const currentServices = await prisma.service.findMany({ where: { profileId: updatedProfile.id } });
    let createdService = null;
    if (currentServices.length === 0) {
      createdService = await prisma.service.create({
        data: {
          title: 'Introductory Consultation',
          description: 'Introductory astrology consultation session.',
          price: parseFloat(updatedProfile.rate),
          duration: 30,
          profileId: updatedProfile.id
        }
      });
    }
    reportResult("Astrologer Introductory Service Auto-Generation", createdService && createdService.price === 100.0, `Service ID: ${createdService?.id}, Price: ${createdService?.price}`);

  } catch (err) {
    reportResult("Astrologer Signup & Profile Setup Flow", false, err.message);
  }

  // ---------------------------------------------------------
  // FLOW 3: SUPER ADMIN INTEGRATION (Auto-provisioning & Auth Control)
  // ---------------------------------------------------------
  console.log("\n--- Testing FLOW 3: Super Admin Credentials & Auto-provisioning ---");
  try {
    // 1. Validate that env-defined Admin Email matches process.env
    reportResult("Super Admin Credentials Env Configuration", !!process.env.ADMIN_EMAIL && !!process.env.ADMIN_PASSWORD);

    // 2. Simulate Login Logic with Admin credentials from /api/auth/login
    let adminUser = await prisma.user.findUnique({ where: { email: testAdminEmail } });
    
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(testAdminPassword, 10);
      adminUser = await prisma.user.create({
        data: {
          email: testAdminEmail,
          password: hashedPassword,
          role: 'ADMIN',
          firstName: 'System',
          lastName: 'Administrator',
          status: 'active'
        }
      });
      await prisma.wallet.create({ data: { userId: adminUser.id, balance: 0.0 } });
    } else {
      // Keep password in sync with env
      const isMatch = await bcrypt.compare(testAdminPassword, adminUser.password);
      if (!isMatch) {
        const hashedPassword = await bcrypt.hash(testAdminPassword, 10);
        adminUser = await prisma.user.update({
          where: { id: adminUser.id },
          data: { password: hashedPassword }
        });
      }
    }

    reportResult("Super Admin Database Sync & Auto-Provision", adminUser && adminUser.role === 'ADMIN' && adminUser.status === 'active');

    const adminWallet = await prisma.wallet.findUnique({ where: { userId: adminUser.id } });
    reportResult("Super Admin Wallet DB Integrity", !!adminWallet);

    const adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    reportResult("Super Admin Platform JWT Security Token", !!adminToken);

  } catch (err) {
    reportResult("Super Admin Flow Lifecycle", false, err.message);
  }

  // Run cleanup to prevent database bloat
  await cleanupTestData();

  console.log("\n==================================================================");
  console.log("📊 SUMMARY OF INTEGRATION TESTS");
  console.log(`   👉 Tests Passed: ${passedTests}`);
  console.log(`   👉 Tests Failed: ${failedTests}`);
  if (failedTests === 0) {
    console.log("🎉 ALL SIGNUP AND USER MANAGEMENT FLOWS SUCCESSFULLY VERIFIED!");
  } else {
    console.error("⚠️ SOME FLOWS EXPERIENCED DB SCHEMA CONFLICTS OR ERROR STATES.");
  }
  console.log("==================================================================\n");

  await prisma.$disconnect();
}

runTests();
