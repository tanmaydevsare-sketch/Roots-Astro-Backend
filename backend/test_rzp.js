const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const RazorpayPackage = require('razorpay');

async function main() {
  const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
  const keyId = settings.razorpayKeyId;
  const keySecret = settings.razorpayKeySecret;

  console.log(`🔑 Testing Razorpay with Key ID: "${keyId}" and Secret length: ${keySecret ? keySecret.length : 0}`);

  try {
    const dynamicRazorpay = new RazorpayPackage({
      key_id: keyId,
      key_secret: keySecret
    });

    const order = await dynamicRazorpay.orders.create({
      amount: 100, // 1 INR / USD
      currency: settings.systemCurrency || "INR",
      receipt: `test_${Date.now()}`
    });

    console.log("✅ Razorpay API Success! Created Order:");
    console.log(JSON.stringify(order, null, 2));
  } catch (err) {
    console.error("❌ Razorpay API Error details:");
    console.error(err);
  }
}

main().finally(() => prisma.$disconnect());
