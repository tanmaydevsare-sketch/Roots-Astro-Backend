const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const crypto = require("crypto");
const { authMiddleware, roleMiddleware } = require("../middleware/auth");
const { getEasebuzzCreds, computeInitiateHash, verifyResponseHash, getEasebuzzBaseUrl } = require("../config/easebuzz");
const { encrypt, decrypt, getCCAvenueCreds, getCCAvenueBaseUrl } = require("../config/ccavenue");
const PDFDocument = require("pdfkit");

// ─── SHARED WALLET STATS ───────────────────────────────────────────────────
router.get("/stats", authMiddleware, async (req, res) => {
    try {
        let wallet = await prisma.wallet.findUnique({
            where: { userId: req.user.id },
            include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } }
        });
        if (!wallet) wallet = await prisma.wallet.create({ data: { userId: req.user.id, balance: 0 }, include: { transactions: true } });
        const withdrawals = await prisma.withdrawal.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" } });
        res.json({ balance: wallet.balance, withdrawals, transactions: wallet.transactions });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── WALLET TOP-UP (manual/admin) ─────────────────────────────────────────
router.post("/topup", authMiddleware, async (req, res) => {
    const { amount, method } = req.body;
    try {
        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
        let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
        if (!wallet) wallet = await prisma.wallet.create({ data: { userId: req.user.id, balance: 0 } });
        const updated = await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: parseFloat(amount) } } });
        const transaction = await prisma.transaction.create({
            data: {
                walletId: wallet.id, amount: parseFloat(amount), type: "CREDIT", category: "TOPUP", status: "COMPLETED",
                description: `Wallet Top-up via ${method || "External Gateway"}`,
                reference: `TOP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
            }
        });
        res.json({ message: "Funds added successfully", balance: updated.balance, transaction });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── RAZORPAY ORDER ────────────────────────────────────────────────────────
router.post("/razorpay/order", authMiddleware, async (req, res) => {
    const { amount } = req.body;
    try {
        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const currencyCode = settings?.systemCurrency || "INR";
        const keyId = settings?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "rzp_test_xxxxxxx";
        const keySecret = settings?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "xxxxxxx";

        if (keyId.includes("xxxxxxx") || keyId === "rzp_test_xxxxxxx") {
            return res.json({
                id: `order_mock_${Math.random().toString(36).slice(2, 10)}`,
                entity: "order", amount: Math.round(amount * 100), amount_paid: 0,
                amount_due: Math.round(amount * 100), currency: currencyCode,
                receipt: `receipt_${Date.now()}`, status: "created", attempts: 0,
                created_at: Math.floor(Date.now() / 1000), isMock: true
            });
        }

        const RazorpayPkg = require("razorpay");
        const rz = new RazorpayPkg({ key_id: keyId, key_secret: keySecret });
        const order = await rz.orders.create({ amount: Math.round(amount * 100), currency: currencyCode, receipt: `receipt_${Date.now()}` });
        res.json(order);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── RAZORPAY VERIFY ───────────────────────────────────────────────────────
router.post("/razorpay/verify", authMiddleware, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    try {
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        if (razorpay_order_id && razorpay_order_id.startsWith("order_mock_")) {
            let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
            if (!wallet) wallet = await prisma.wallet.create({ data: { userId: req.user.id, balance: 0 } });
            const updated = await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: parseFloat(amount) } } });
            const mockPaymentId = razorpay_payment_id || `pay_mock_${Math.random().toString(36).slice(2, 10)}`;
            const transaction = await prisma.transaction.create({
                data: {
                    walletId: wallet.id, amount: parseFloat(amount), type: "CREDIT", category: "TOPUP", status: "COMPLETED",
                    description: `Wallet Top-up via Sandbox (${mockPaymentId})`, reference: mockPaymentId
                }
            });
            return res.json({ message: "Mock payment verified (Sandbox)", balance: updated.balance, transaction });
        }

        const secret = settings?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "xxxxxxx";
        const expectedSign = crypto.createHmac("sha256", secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
        if (razorpay_signature !== expectedSign) return res.status(400).json({ error: "Invalid signature" });

        let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
        if (!wallet) wallet = await prisma.wallet.create({ data: { userId: req.user.id, balance: 0 } });
        const updated = await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: parseFloat(amount) } } });
        const transaction = await prisma.transaction.create({
            data: {
                walletId: wallet.id, amount: parseFloat(amount), type: "CREDIT", category: "TOPUP", status: "COMPLETED",
                description: `Wallet Top-up via Razorpay (${razorpay_payment_id})`, reference: razorpay_payment_id
            }
        });
        res.json({ message: "Payment verified", balance: updated.balance, transaction });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── EASEBUZZ INITIATE ─────────────────────────────────────────────────────
router.post("/easebuzz/initiate", authMiddleware, async (req, res) => {
    const { amount, firstname, email, phone } = req.body;
    try {
        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const creds = getEasebuzzCreds(settings);

        if (!creds.key || !creds.salt || creds.key.includes("xxxxxxx") || creds.key === "easebuzz_test_key" || !creds.key) {
            console.log("🛡️ Sandboxed Mode: Returning mock Easebuzz paymentUrl.");
            return res.json({
                paymentUrl: `mock_easebuzz_checkout_${Math.random().toString(36).slice(2, 10)}`,
                txnid: `EB-MOCK-${Date.now()}`,
                hash: "mock_easebuzz_hash",
                isMock: true
            });
        }

        const txnid = `EB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const hash = computeInitiateHash({
            key: creds.key, txnid, amount: parseFloat(amount).toFixed(2),
            productinfo: "Roots Astro Wallet Top-up",
            firstname: firstname || req.user.firstName || "User",
            email: email || req.user.email || "user@rootsastro.com",
            udf1: req.user.id.toString(),
            salt: creds.salt
        });

        const baseUrl = getEasebuzzBaseUrl(creds.mode);
        const initiateUrl = `${baseUrl}/payment/initiateLink`;

        const formData = new URLSearchParams({
            key: creds.key, txnid, amount: parseFloat(amount).toFixed(2),
            productinfo: "Roots Astro Wallet Top-up",
            firstname: firstname || "User",
            email: email || "user@rootsastro.com",
            phone: phone || "9999999999",
            surl: `${process.env.API_BASE_URL || "http://localhost:5000"}/api/finance/easebuzz/success`,
            furl: `${process.env.API_BASE_URL || "http://localhost:5000"}/api/finance/easebuzz/failure`,
            udf1: req.user.id.toString(),
            hash
        });

        const ebRes = await fetch(initiateUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formData });
        const ebData = await ebRes.json();

        if (ebData.status === 1) {
            res.json({ paymentUrl: `${baseUrl}/pay/${ebData.data}`, txnid, hash, isMock: false });
        } else {
            res.status(400).json({ error: ebData.msg || "Easebuzz initiation failed" });
        }
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── EASEBUZZ SUCCESS CALLBACK ─────────────────────────────────────────────
router.post("/easebuzz/success", async (req, res) => {
    try {
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const creds = getEasebuzzCreds(settings);
        const isValid = verifyResponseHash(req.body, creds.salt);
        if (!isValid) {
            console.error("Easebuzz success callback hash mismatch");
            return res.status(400).send("Hash verification failed");
        }

        const txnid = req.body.txnid;
        const amount = parseFloat(req.body.amount);
        const userId = parseInt(req.body.udf1);

        if (req.body.status === "success") {
            const wallet = await prisma.wallet.findUnique({ where: { userId } })
                || await prisma.wallet.create({ data: { userId, balance: 0 } });

            await prisma.$transaction(async (tx) => {
                await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: amount } }
                });

                await tx.transaction.create({
                    data: {
                        walletId: wallet.id,
                        amount: amount,
                        type: "CREDIT",
                        category: "TOPUP",
                        status: "COMPLETED",
                        description: `Wallet top-up via Easebuzz (${txnid})`,
                        reference: txnid
                    }
                });
            });
        }

        const frontendUrl = process.env.FRONTEND_URL || "https://roots-astro.web.app";
        res.redirect(`${frontendUrl}/client/dashboard?paymentStatus=success&txnid=${txnid}&amount=${amount}`);
    } catch (error) { 
        console.error("Easebuzz success callback error:", error);
        res.status(500).send(error.message); 
    }
});

// ─── EASEBUZZ FAILURE CALLBACK ─────────────────────────────────────────────
router.post("/easebuzz/failure", async (req, res) => {
    try {
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const creds = getEasebuzzCreds(settings);
        const isValid = verifyResponseHash(req.body, creds.salt);
        if (!isValid) {
            console.error("Easebuzz failure callback hash mismatch");
            return res.status(400).send("Hash verification failed");
        }

        const frontendUrl = process.env.FRONTEND_URL || "https://roots-astro.web.app";
        res.redirect(`${frontendUrl}/client/dashboard?paymentStatus=failed&txnid=${req.body.txnid}`);
    } catch (error) { 
        res.status(500).send(error.message); 
    }
});

// ─── PAYPAL CREATE ORDER (International only) ─────────────────────────────
router.post("/paypal/order", authMiddleware, async (req, res) => {
    const { amount } = req.body;
    try {
        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const clientId = settings?.paypalClientId || process.env.PAYPAL_CLIENT_ID || "";
        const secret = settings?.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET || "";
        const mode = settings?.paypalMode || "sandbox";
        const baseUrl = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

        if (!clientId || !secret || clientId.includes("Example") || !clientId) {
            console.log("🛡️ Sandboxed Mode: Returning mock PayPal order.");
            return res.json({
                orderId: `order_paypal_mock_${Math.random().toString(36).slice(2, 10)}`,
                status: "APPROVED",
                isMock: true
            });
        }

        // Get access token
        const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: "POST",
            headers: { "Authorization": `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: "grant_type=client_credentials"
        });
        if (!authRes.ok) return res.status(400).json({ error: "PayPal authentication failed." });
        const { access_token } = await authRes.json();

        // Create order
        const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [{ amount: { currency_code: "USD", value: parseFloat(amount).toFixed(2) }, description: "Roots Astro – International Booking Payment" }]
            })
        });
        if (!orderRes.ok) return res.status(400).json({ error: "Failed to create PayPal order." });
        const order = await orderRes.json();
        res.json({ orderId: order.id, status: order.status });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── PAYPAL CAPTURE ORDER ─────────────────────────────────────────────────
router.post("/paypal/capture", authMiddleware, async (req, res) => {
    const { orderId, amount } = req.body;
    try {
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const clientId = settings?.paypalClientId || process.env.PAYPAL_CLIENT_ID || "";
        const secret = settings?.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET || "";
        const mode = settings?.paypalMode || "sandbox";
        const baseUrl = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

        if (orderId && orderId.startsWith("order_paypal_mock_")) {
            let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
            if (!wallet) wallet = await prisma.wallet.create({ data: { userId: req.user.id, balance: 0 } });
            const updated = await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: parseFloat(amount) } } });
            const transaction = await prisma.transaction.create({
                data: {
                    walletId: wallet.id, amount: parseFloat(amount), type: "CREDIT", category: "TOPUP", status: "COMPLETED",
                    description: `International payment via rootsastro Sandbox (${orderId})`,
                    reference: `PP-${orderId}`
                }
            });
            return res.json({ message: "PayPal payment captured successfully (Sandbox)", balance: updated.balance, captureId: `cap_mock_${Math.random().toString(36).slice(2, 10)}`, transaction });
        }

        const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: "POST",
            headers: { "Authorization": `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: "grant_type=client_credentials"
        });
        const { access_token } = await authRes.json();

        const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${access_token}`, "Content-Type": "application/json" }
        });
        if (!captureRes.ok) return res.status(400).json({ error: "PayPal capture failed." });
        const capture = await captureRes.json();

        // Credit wallet
        let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
        if (!wallet) wallet = await prisma.wallet.create({ data: { userId: req.user.id, balance: 0 } });
        const updated = await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: parseFloat(amount) } } });
        await prisma.transaction.create({
            data: {
                walletId: wallet.id, amount: parseFloat(amount), type: "CREDIT", category: "TOPUP", status: "COMPLETED",
                description: `International payment via PayPal (${orderId})`,
                reference: `PP-${orderId}`
            }
        });

        res.json({ message: "PayPal payment captured successfully", balance: updated.balance, captureId: capture.id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── WITHDRAWAL REQUEST ────────────────────────────────────────────────────
router.post("/withdraw", authMiddleware, async (req, res) => {
    const { amount, method, details } = req.body;
    try {
        const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
        if (!wallet || wallet.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

        const withdrawal = await prisma.withdrawal.create({
            data: {
                userId: req.user.id, amount, method,
                details: typeof details === "string" ? details : JSON.stringify(details),
                reference: `WDRL-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
                status: "PENDING"
            }
        });

        await prisma.wallet.update({ where: { userId: req.user.id }, data: { balance: { decrement: amount } } });
        await prisma.transaction.create({
            data: {
                walletId: wallet.id, amount: -amount, type: "DEBIT", category: "WITHDRAWAL", status: "PENDING",
                description: `Withdrawal via ${method}`, reference: withdrawal.reference, withdrawalId: withdrawal.id
            }
        });
        await prisma.auditLog.create({ data: { action: "WITHDRAWAL_REQUESTED", details: `User ${req.user.id} requested ${amount} via ${method}`, userId: req.user.id, ipAddress: req.ip } });

        res.status(201).json({ message: "Withdrawal request created", withdrawal });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── ADMIN: FINANCE DASHBOARD ─────────────────────────────────────────────
router.get("/admin/dashboard", authMiddleware, roleMiddleware(["ADMIN"]), async (req, res) => {
    try {
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } }) || {};
        const stats = await prisma.booking.aggregate({
            where: { paymentStatus: { in: ["HELD", "RELEASED", "FORFEITED"] } },
            _sum: {
                baseAmount: true,
                gstAmount: true,
                convenienceAmount: true,
                totalPaidAmount: true
            }
        });

        const baseSum = stats._sum.baseAmount || 0;
        const gstSum = stats._sum.gstAmount || 0;
        const convSum = stats._sum.convenienceAmount || 0;
        const volSum = stats._sum.totalPaidAmount || 0;

        const commissionRate = settings.commissionRate ?? 0.25;
        const tdsRate = settings.tdsRate ?? 0.10;

        // Platform profit = commission on base amount + convenience fees
        const platformProfit = (baseSum * commissionRate) + convSum;

        // Astrologer Gross Share = base amount * (1 - commissionRate)
        const astroGross = baseSum * (1 - commissionRate);
        const tdsWithheld = astroGross * tdsRate;

        const heldEscrow = await prisma.booking.aggregate({
            where: { paymentStatus: "HELD" }, _sum: { totalPaidAmount: true }
        });
        const pendingWithdrawals = await prisma.withdrawal.findMany({
            where: { status: "PENDING" },
            include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
            orderBy: { createdAt: "desc" }
        });
        const pendingDisputes = await prisma.disputeClaim.findMany({
            where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
            include: { booking: { include: { client: { select: { firstName: true, lastName: true } }, astrologer: { select: { firstName: true, lastName: true } } } } },
            orderBy: { createdAt: "desc" }
        });
        const recentTransactions = await prisma.transaction.findMany({
            orderBy: { createdAt: "desc" }, take: 20,
            include: { wallet: { include: { user: { select: { firstName: true, lastName: true, role: true } } } } }
        });

        res.json({
            totalVolume: volSum,
            platformProfit: platformProfit,
            totalGstCollected: gstSum,
            totalTdsWithheld: tdsWithheld,
            heldInEscrow: heldEscrow._sum.totalPaidAmount || 0,
            pendingWithdrawals, pendingDisputes, recentTransactions,
            auditLogs: await prisma.auditLog.findMany({ take: 20, orderBy: { createdAt: "desc" } })
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── ADMIN: ESCROW MONITOR ────────────────────────────────────────────────
router.get("/admin/escrow", authMiddleware, roleMiddleware(["ADMIN"]), async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: { paymentStatus: "HELD" },
            include: {
                client: { select: { firstName: true, lastName: true, email: true } },
                astrologer: { select: { firstName: true, lastName: true, email: true } },
                service: { select: { title: true } }
            },
            orderBy: { scheduledAt: "asc" }
        });
        res.json(bookings);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── ADMIN: APPROVE/REJECT WITHDRAWAL ────────────────────────────────────
router.patch("/admin/payouts/:id", authMiddleware, roleMiddleware(["ADMIN"]), async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes, rejectionReason } = req.body;
    try {
        const withdrawal = await prisma.withdrawal.findUnique({ where: { id: parseInt(id) }, include: { user: { include: { wallet: true } } } });
        if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });

        if (status === "REJECTED") {
            await prisma.wallet.update({ where: { id: withdrawal.user.wallet.id }, data: { balance: { increment: withdrawal.amount } } });
            await prisma.transaction.create({
                data: {
                    walletId: withdrawal.user.wallet.id, amount: withdrawal.amount, type: "CREDIT", category: "REFUND", status: "COMPLETED",
                    description: `Refund for rejected withdrawal ${withdrawal.reference}`,
                    reference: `REF-${withdrawal.reference}`
                }
            });
        }
        const updated = await prisma.withdrawal.update({
            where: { id: parseInt(id) },
            data: { status, adminNotes, rejectionReason, processedAt: status === "COMPLETED" ? new Date() : null }
        });
        await prisma.auditLog.create({ data: { action: `WITHDRAWAL_${status}`, details: `Withdrawal ${withdrawal.reference} → ${status} by admin ${req.user.id}`, userId: req.user.id } });
        res.json({ message: `Withdrawal ${status}`, withdrawal: updated });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── ADMIN: PROCESS MONTHLY PAYOUTS ──────────────────────────────────────
router.post("/admin/monthly-payouts/process", authMiddleware, roleMiddleware(["ADMIN"]), async (req, res) => {
    const { month } = req.body; // "2026-08"
    try {
        if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "Provide month as YYYY-MM" });
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const tdsRate = settings?.tdsRate ?? 0.10;
        const commissionRate = settings?.commissionRate ?? 0.20;

        const [year, mon] = month.split("-").map(Number);
        const startDate = new Date(year, mon - 1, 1);
        const endDate = new Date(year, mon, 1);

        // Get all released bookings for the month grouped by astrologer
        const bookings = await prisma.booking.findMany({
            where: { paymentStatus: "RELEASED", createdAt: { gte: startDate, lt: endDate } },
            select: { astrologerId: true, baseAmount: true, totalPaidAmount: true }
        });

        // Group by astrologer
        const astrologerMap = {};
        for (const b of bookings) {
            if (!astrologerMap[b.astrologerId]) astrologerMap[b.astrologerId] = { grossAmount: 0, bookingCount: 0 };
            const share = b.baseAmount * (1 - commissionRate);
            astrologerMap[b.astrologerId].grossAmount += share;
            astrologerMap[b.astrologerId].bookingCount += 1;
        }

        const payouts = [];
        for (const [astroId, data] of Object.entries(astrologerMap)) {
            const gross = parseFloat(data.grossAmount.toFixed(2));
            const tds = parseFloat((gross * tdsRate).toFixed(2));
            const net = parseFloat((gross - tds).toFixed(2));

            const payout = await prisma.monthlyPayout.upsert({
                where: { astrologerId_month: { astrologerId: parseInt(astroId), month } },
                update: { grossAmount: gross, tdsAmount: tds, netAmount: net, tdsRate, status: "PROCESSED" },
                create: {
                    astrologerId: parseInt(astroId), month, grossAmount: gross, tdsRate,
                    tdsAmount: tds, commissionAmount: 0, netAmount: net, status: "PROCESSED"
                }
            });
            payouts.push({ ...payout, bookingCount: data.bookingCount });
        }

        res.json({ message: `Month-end payouts processed for ${month}`, payouts, tdsRate, commissionRate });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── ADMIN: LIST MONTHLY PAYOUTS ──────────────────────────────────────────
router.get("/admin/monthly-payouts", authMiddleware, roleMiddleware(["ADMIN"]), async (req, res) => {
    try {
        const { month } = req.query;
        const payouts = await prisma.monthlyPayout.findMany({
            where: month ? { month } : {},
            include: { astrologer: { select: { firstName: true, lastName: true, email: true, astrologerProfile: { select: { upiId: true } } } } },
            orderBy: [{ month: "desc" }, { grossAmount: "desc" }]
        });
        res.json(payouts);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── ADMIN: MARK PAYOUT AS PAID ───────────────────────────────────────────
router.patch("/admin/monthly-payouts/:id/pay", authMiddleware, roleMiddleware(["ADMIN"]), async (req, res) => {
    const { referenceId, adminNotes } = req.body;
    try {
        const payout = await prisma.monthlyPayout.update({
            where: { id: parseInt(req.params.id) },
            data: { status: "PAID", referenceId, adminNotes, processedAt: new Date() }
        });
        await prisma.auditLog.create({ data: { action: "MONTHLY_PAYOUT_MARKED_PAID", details: `Payout #${payout.id} for astrologer ${payout.astrologerId} month ${payout.month} — Net: ${payout.netAmount}`, userId: req.user.id } });
        res.json({ message: "Payout marked as PAID", payout });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── ASTROLOGER: MY MONTHLY EARNINGS ─────────────────────────────────────
router.get("/astrologer/earnings", authMiddleware, roleMiddleware(["ASTROLOGER"]), async (req, res) => {
    try {
        const payouts = await prisma.monthlyPayout.findMany({
            where: { astrologerId: req.user.id },
            orderBy: { month: "desc" }
        });
        const currentMonth = new Date().toISOString().slice(0, 7);
        const thisMonthBookings = await prisma.booking.aggregate({
            where: { astrologerId: req.user.id, paymentStatus: "RELEASED", createdAt: { gte: new Date(currentMonth + "-01") } },
            _sum: { baseAmount: true }, _count: true
        });
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const commRate = settings?.commissionRate ?? 0.20;
        const tdsRate = settings?.tdsRate ?? 0.10;
        const gross = parseFloat(((thisMonthBookings._sum.baseAmount || 0) * (1 - commRate)).toFixed(2));
        const tds = parseFloat((gross * tdsRate).toFixed(2));
        const net = parseFloat((gross - tds).toFixed(2));

        res.json({
            payoutHistory: payouts,
            currentMonth: {
                month: currentMonth, grossAmount: gross, tdsRate, tdsAmount: tds, netAmount: net,
                bookingCount: thisMonthBookings._count, status: "PENDING"
            }
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});


// ─── CCAVENUE: Initiate Payment ────────────────────────────────────────────
router.post("/ccavenue/initiate", authMiddleware, async (req, res) => {
    const { amount, purpose } = req.body;
    try {
        if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: "Invalid amount" });
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const { merchantId, accessCode, workingKey, mode } = getCCAvenueCreds(settings);

        if (!merchantId || !accessCode || !workingKey) {
            return res.status(503).json({ error: "CCAvenue is not configured. Please add merchant credentials in Admin > Platform Finance." });
        }

        const orderId = `RA-${Date.now()}-${req.user.id}`;
        const backendUrl = process.env.BACKEND_URL || "https://roots-astro-backend.onrender.com";
        const frontendUrl = process.env.FRONTEND_URL || "https://roots-astro.web.app";

        const params = [
            `merchant_id=${merchantId}`,
            `order_id=${orderId}`,
            `amount=${parseFloat(amount).toFixed(2)}`,
            `currency=INR`,
            `redirect_url=${backendUrl}/api/finance/ccavenue/callback`,
            `cancel_url=${frontendUrl}/client/dashboard?paymentStatus=cancelled`,
            `language=EN`,
            `billing_name=${req.user.firstName || "Customer"} ${req.user.lastName || ""}`,
            `billing_email=${req.user.email || ""}`,
            `billing_tel=${req.user.phone || ""}`,
            `merchant_param1=${req.user.id}`,
            `merchant_param2=${purpose || "wallet_topup"}`
        ].join("&");

        const encRequest = encrypt(params, workingKey);
        const paymentUrl = getCCAvenueBaseUrl(mode);

        res.json({ encRequest, accessCode, paymentUrl, orderId });
    } catch (error) {
        console.error("[CCAVENUE_INITIATE]", error);
        res.status(500).json({ error: error.message });
    }
});

// ─── CCAVENUE: Payment Callback (server-to-server) ────────────────────────
router.post("/ccavenue/callback", async (req, res) => {
    try {
        const { encResp } = req.body;
        if (!encResp) return res.status(400).send("Missing encResp");

        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const { workingKey } = getCCAvenueCreds(settings);
        const frontendUrl = process.env.FRONTEND_URL || "https://roots-astro.web.app";

        const decrypted = decrypt(encResp, workingKey);
        const params = Object.fromEntries(new URLSearchParams(decrypted));

        const { order_status, amount, order_id, tracking_id, merchant_param1: userId } = params;

        if (order_status === "Success" && userId) {
            const parsedUserId = parseInt(userId);
            const parsedAmount = parseFloat(amount);

            let wallet = await prisma.wallet.findUnique({ where: { userId: parsedUserId } });
            if (!wallet) wallet = await prisma.wallet.create({ data: { userId: parsedUserId, balance: 0 } });

            await prisma.$transaction([
                prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: parsedAmount } }
                }),
                prisma.transaction.create({
                    data: {
                        walletId: wallet.id,
                        amount: parsedAmount,
                        type: "CREDIT",
                        category: "TOPUP",
                        status: "COMPLETED",
                        description: `CCAvenue payment - Order ${order_id}`,
                        reference: tracking_id || order_id
                    }
                })
            ]);

            return res.redirect(`${frontendUrl}/client/dashboard?paymentStatus=success&amount=${parsedAmount}`);
        }

        res.redirect(`${frontendUrl}/client/dashboard?paymentStatus=failed`);
    } catch (error) {
        console.error("[CCAVENUE_CALLBACK]", error);
        res.redirect(`${process.env.FRONTEND_URL || "https://roots-astro.web.app"}/client/dashboard?paymentStatus=error`);
    }
});

// ─── PDF: Astrologer Payout Invoice ───────────────────────────────────────
router.get("/admin/invoice/:astrologerId/:month", authMiddleware, roleMiddleware(["ADMIN"]), async (req, res) => {
    const { astrologerId, month } = req.params;
    try {
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } }) || {};
        const astrologer = await prisma.user.findUnique({
            where: { id: parseInt(astrologerId) },
            include: { astrologerProfile: true }
        });
        if (!astrologer) return res.status(404).json({ error: "Astrologer not found" });

        // Get all released bookings in the month
        const [year, mon] = month.split("-").map(Number);
        const startDate = new Date(year, mon - 1, 1);
        const cutoffDate = new Date(year, mon - 1, 25, 23, 59, 59); // earnings up to 25th
        const bookings = await prisma.booking.findMany({
            where: {
                astrologerId: parseInt(astrologerId),
                paymentStatus: { in: ["RELEASED", "HELD"] },
                scheduledAt: { gte: startDate, lte: cutoffDate }
            }
        });

        const commissionRate = settings.commissionRate ?? 0.20;
        const tdsRate = settings.tdsRate ?? 0.10;
        const baseTotal = bookings.reduce((s, b) => s + (b.baseAmount || 0), 0);
        const commission = baseTotal * commissionRate;
        const gross = baseTotal - commission;
        const tds = gross * tdsRate;
        const net = gross - tds;

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=invoice_${astrologerId}_${month}.pdf`);
        doc.pipe(res);

        // Header
        doc.fontSize(22).fillColor("#2D1E4D").text("ROOTS ASTRO", { align: "center" });
        doc.fontSize(12).fillColor("#555").text("Astrologer Payout Invoice", { align: "center" });
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#D4AF37");
        doc.moveDown();

        // Invoice details
        doc.fontSize(11).fillColor("#000");
        doc.text(`Invoice For: ${astrologer.firstName} ${astrologer.lastName}`);
        doc.text(`Email: ${astrologer.email}`);
        doc.text(`Month: ${month}`);
        doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`);
        doc.moveDown();

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#ccc");
        doc.moveDown();

        // Breakdown table
        const addRow = (label, value, bold = false) => {
            doc.fontSize(bold ? 12 : 11)
               .fillColor(bold ? "#2D1E4D" : "#333")
               .text(label, 50, doc.y, { continued: true, width: 300 })
               .fillColor(bold ? "#D4AF37" : "#000")
               .text(`₹ ${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, { align: "right" });
        };

        addRow("Total Session Base Amount", baseTotal);
        addRow(`Platform Commission (${(commissionRate * 100).toFixed(0)}%)`, commission);
        addRow("Astrologer Gross Earnings", gross);
        addRow(`TDS Withheld (${(tdsRate * 100).toFixed(0)}% of Gross)`, tds);
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#D4AF37");
        doc.moveDown(0.5);
        addRow("NET PAYOUT TO ASTROLOGER", net, true);
        doc.moveDown();

        // Payout schedule note
        doc.fontSize(9).fillColor("#777")
           .text("Note: Payment will be transferred between the 25th–31st of the month from the platform bank account. TDS certificate will be issued at year end.", { align: "center" });

        doc.end();
    } catch (error) {
        console.error("[INVOICE_PDF]", error);
        res.status(500).json({ error: error.message });
    }
});

// ─── PDF: Monthly Platform Profit Report ──────────────────────────────────
router.get("/admin/monthly-report/:month", authMiddleware, roleMiddleware(["ADMIN"]), async (req, res) => {
    const { month } = req.params;
    try {
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } }) || {};
        const [year, mon] = month.split("-").map(Number);
        const startDate = new Date(year, mon - 1, 1);
        const endDate = new Date(year, mon, 0, 23, 59, 59);

        const bookings = await prisma.booking.findMany({
            where: {
                scheduledAt: { gte: startDate, lte: endDate },
                paymentStatus: { in: ["HELD", "RELEASED"] }
            },
            include: {
                astrologer: { select: { firstName: true, lastName: true } },
                client: { select: { firstName: true, lastName: true } }
            }
        });

        const commissionRate = settings.commissionRate ?? 0.20;
        const tdsRate = settings.tdsRate ?? 0.10;
        const totalVolume = bookings.reduce((s, b) => s + (b.totalPaidAmount || 0), 0);
        const totalBase = bookings.reduce((s, b) => s + (b.baseAmount || 0), 0);
        const totalGst = bookings.reduce((s, b) => s + (b.gstAmount || 0), 0);
        const totalConv = bookings.reduce((s, b) => s + (b.convenienceAmount || 0), 0);
        const totalPlatformProfit = (totalBase * commissionRate) + totalConv;
        const totalAstroGross = totalBase * (1 - commissionRate);
        const totalTds = totalAstroGross * tdsRate;
        const totalNetPayout = totalAstroGross - totalTds;

        const doc = new PDFDocument({ margin: 50, size: "A4" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=monthly_report_${month}.pdf`);
        doc.pipe(res);

        // Header
        doc.fontSize(22).fillColor("#2D1E4D").text("ROOTS ASTRO", { align: "center" });
        doc.fontSize(13).fillColor("#555").text(`Monthly Platform Report — ${month}`, { align: "center" });
        doc.fontSize(10).fillColor("#999").text(`Generated on ${new Date().toLocaleDateString("en-IN")} at ${new Date().toLocaleTimeString("en-IN")}`, { align: "center" });
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(2).stroke("#D4AF37");
        doc.moveDown();

        // Summary
        doc.fontSize(13).fillColor("#2D1E4D").text("Financial Summary", { underline: true });
        doc.moveDown(0.5);
        const sum = (label, val, color = "#000") =>
            doc.fontSize(11).fillColor("#444").text(label, 50, doc.y, { continued: true, width: 320 })
               .fillColor(color).text(`₹ ${val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, { align: "right" });

        sum("Total Customer Payments (incl. GST)", totalVolume);
        sum("GST Collected (18%)", totalGst, "#E91E63");
        sum("Total Base Service Revenue", totalBase);
        sum(`Platform Commission (${(commissionRate * 100).toFixed(0)}%)`, totalBase * commissionRate, "#4CAF50");
        sum("Convenience Fees Collected", totalConv, "#4CAF50");
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke("#D4AF37");
        doc.moveDown(0.3);
        doc.fontSize(13).fillColor("#2D1E4D").text("PLATFORM NET PROFIT", 50, doc.y, { continued: true, width: 320 })
           .fillColor("#D4AF37").text(`₹ ${totalPlatformProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, { align: "right" });
        doc.moveDown();
        sum(`Total TDS Withheld (${(tdsRate * 100).toFixed(0)}%)`, totalTds, "#FF5722");
        sum("Total Net Astrologer Payouts Due", totalNetPayout, "#2196F3");

        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke("#ccc");
        doc.moveDown();

        // Transaction table
        doc.fontSize(13).fillColor("#2D1E4D").text(`Booking Ledger (${bookings.length} transactions)`, { underline: true });
        doc.moveDown(0.5);

        // Table header
        const cols = [50, 140, 230, 320, 400, 480];
        doc.fontSize(9).fillColor("#fff")
           .rect(50, doc.y, 495, 16).fill("#2D1E4D");
        const rowY = doc.y - 14;
        doc.fillColor("#fff")
           .text("#", cols[0], rowY, { width: 80 })
           .text("Client", cols[1], rowY, { width: 90 })
           .text("Astrologer", cols[2], rowY, { width: 90 })
           .text("Base (₹)", cols[3], rowY, { width: 75 })
           .text("GST (₹)", cols[4], rowY, { width: 75 })
           .text("Total (₹)", cols[5], rowY, { width: 75 });
        doc.moveDown();

        bookings.slice(0, 50).forEach((b, i) => {
            const y = doc.y;
            if (i % 2 === 0) doc.rect(50, y - 2, 495, 14).fill("#f9f6ff");
            doc.fillColor("#333")
               .text(String(b.id), cols[0], y, { width: 80 })
               .text(`${b.client.firstName}`, cols[1], y, { width: 90 })
               .text(`${b.astrologer.firstName}`, cols[2], y, { width: 90 })
               .text(`${(b.baseAmount || 0).toFixed(0)}`, cols[3], y, { width: 75 })
               .text(`${(b.gstAmount || 0).toFixed(0)}`, cols[4], y, { width: 75 })
               .text(`${(b.totalPaidAmount || 0).toFixed(0)}`, cols[5], y, { width: 75 });
            doc.moveDown(0.8);
        });

        doc.end();
    } catch (error) {
        console.error("[MONTHLY_REPORT_PDF]", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
