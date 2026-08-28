const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  console.log("Seeding realistic platform finance, escrow, and dispute records...");

  // 1. Get or Create Astrologer
  let astrologer = await prisma.user.findFirst({
    where: { role: 'ASTROLOGER' }
  });

  if (!astrologer) {
    astrologer = await prisma.user.create({
      data: {
        email: "expert_wisdom@rootsastro.com",
        phone: "+918888888888",
        password: await bcrypt.hash("expertpass123", 10),
        firstName: "Stellar",
        lastName: "Wisdom",
        role: "ASTROLOGER",
        status: "active"
      }
    });
    console.log("Created Astrologer User:", astrologer.email);
  }

  // Ensure Astrologer Profile exists
  let astroProfile = await prisma.astrologerProfile.findUnique({
    where: { userId: astrologer.id }
  });

  if (!astroProfile) {
    astroProfile = await prisma.astrologerProfile.create({
      data: {
        userId: astrologer.id,
        bio: "Stellar Wisdom is an expert vedic astrologer with over 15 years of experience in birth chart readings, kundali matchmaking, and career guidance.",
        expertise: "Vedic, Kundali, Numerology",
        languages: "English, Hindi",
        experienceInt: 15,
        rate: "1000",
        status: "APPROVED",
        upiId: "stellarwisdom@upi"
      }
    });
    console.log("Created Astrologer Profile:", astroProfile.id);
  }

  // Ensure Introductory Service exists
  let service = await prisma.service.findFirst({
    where: { profileId: astroProfile.id }
  });

  if (!service) {
    service = await prisma.service.create({
      data: {
        title: "Standard Horoscope Analysis",
        description: "In-depth calculation and analysis of your primary planetary alignments.",
        price: 1000.0,
        duration: 30,
        profileId: astroProfile.id
      }
    });
    console.log("Created Consultation Service:", service.title);
  }

  // Ensure wallet exists for Astrologer
  let astroWallet = await prisma.wallet.findUnique({ where: { userId: astrologer.id } });
  if (!astroWallet) {
    astroWallet = await prisma.wallet.create({
      data: { userId: astrologer.id, balance: 15000.0 }
    });
    console.log("Created wallet for Astrologer with balance:", astroWallet.balance);
  }

  // 2. Get or Create Client
  let client = await prisma.user.findFirst({
    where: { role: 'CLIENT' }
  });

  if (!client) {
    client = await prisma.user.create({
      data: {
        email: "astro_seeker@rootsastro.com",
        phone: "+917777777777",
        password: await bcrypt.hash("seekerpass123", 10),
        firstName: "Astro",
        lastName: "Seeker",
        role: "CLIENT",
        status: "active"
      }
    });
    console.log("Created Client User:", client.email);
  }

  // Ensure Client Profile exists
  let clientProfile = await prisma.clientProfile.findUnique({
    where: { userId: client.id }
  });

  if (!clientProfile) {
    clientProfile = await prisma.clientProfile.create({
      data: { userId: client.id }
    });
    console.log("Created Client Profile");
  }

  // Ensure wallet exists for Client
  let clientWallet = await prisma.wallet.findUnique({ where: { userId: client.id } });
  if (!clientWallet) {
    clientWallet = await prisma.wallet.create({
      data: { userId: client.id, balance: 5000.0 }
    });
    console.log("Created wallet for Client with balance:", clientWallet.balance);
  }

  // 3. Seed Payouts and Escrow Transactions
  // Booking 1: Held in Escrow (Awaiting Confirmation)
  const scheduledTime1 = new Date();
  scheduledTime1.setHours(scheduledTime1.getHours() - 1); // 1 hour ago

  const escrowBooking = await prisma.booking.create({
    data: {
      clientId: client.id,
      astrologerId: astrologer.id,
      serviceId: service.id,
      scheduledAt: scheduledTime1,
      baseAmount: 1000.00,
      amount: 1180.00, // including 18% GST
      totalPaidAmount: 1180.00,
      convenienceAmount: 40.00,
      gstAmount: 180.00,
      status: "COMPLETED",
      paymentStatus: "HELD", // held in escrow!
      clientConfirmed: true,
      astrologerConfirmed: false,
      problemDesc: "I want to ask about my upcoming career transition in September."
    }
  });
  console.log("Seeded Escrow Booking #", escrowBooking.id);

  // Booking 2: Disputed Booking
  const scheduledTime2 = new Date();
  scheduledTime2.setDate(scheduledTime2.getDate() - 1); // Yesterday

  const disputedBooking = await prisma.booking.create({
    data: {
      clientId: client.id,
      astrologerId: astrologer.id,
      serviceId: service.id,
      scheduledAt: scheduledTime2,
      baseAmount: 1000.00,
      amount: 1180.00,
      totalPaidAmount: 1180.00,
      convenienceAmount: 40.00,
      gstAmount: 180.00,
      status: "COMPLETED",
      paymentStatus: "RELEASED",
      clientConfirmed: true,
      astrologerConfirmed: true,
      problemDesc: "Love life matchmaking and family transit questions."
    }
  });

  const disputeClaim = await prisma.disputeClaim.create({
    data: {
      bookingId: disputedBooking.id,
      clientId: client.id,
      reason: "DISSATISFIED",
      description: "The astrologer was highly unsatisfactory, did not give accurate timelines, and was very discourteous during the consult.",
      evidenceUrls: JSON.stringify(["https://roots-astro.web.app/samples/evidence.jpg"]),
      status: "OPEN"
    }
  });
  console.log("Seeded Disputed Booking #", disputedBooking.id, "with Dispute ID:", disputeClaim.id);

  // Bookings 3 & 4: Released Payouts (for Payout History & Volume)
  const scheduledTime3 = new Date();
  scheduledTime3.setDate(scheduledTime3.getDate() - 5);

  const releasedBooking1 = await prisma.booking.create({
    data: {
      clientId: client.id,
      astrologerId: astrologer.id,
      serviceId: service.id,
      scheduledAt: scheduledTime3,
      baseAmount: 2000.00,
      amount: 2360.00,
      totalPaidAmount: 2360.00,
      convenienceAmount: 80.00,
      gstAmount: 360.00,
      status: "COMPLETED",
      paymentStatus: "RELEASED",
      clientConfirmed: true,
      astrologerConfirmed: true,
      problemDesc: "Financial and business investments check."
    }
  });

  // Log release transaction in Ledger
  await prisma.transaction.create({
    data: {
      walletId: astroWallet.id,
      amount: 1600.00, // Astrologer's share after 20% platform share
      type: "CREDIT",
      category: "BOOKING",
      status: "COMPLETED",
      description: `Earnings released for Booking #${releasedBooking1.id}`,
      reference: `RELEASE-${releasedBooking1.id}`
    }
  });

  console.log("Seeded Released Booking #", releasedBooking1.id);

  const superadmin = await prisma.user.findFirst({
    where: { role: 'SUPERADMIN' }
  });
  const superAdminId = superadmin ? superadmin.id : client.id;

  // Add system audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: "GATEWAY_SWITCH",
        details: "Admin switched domestic payment gateway to Easebuzz",
        userId: superAdminId
      },
      {
        action: "DISPUTE_RAISED",
        details: `Client raised dispute for session #${disputedBooking.id}`,
        userId: client.id
      }
    ]
  });

  console.log("Seeding complete! Admin dashboard has active escrows, active disputes, and month-end payouts configuration.");
}

main()
  .catch(err => console.error("Error seeding finance data:", err))
  .finally(() => prisma.$disconnect());
