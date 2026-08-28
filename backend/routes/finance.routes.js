const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const crypto = require("crypto");
const { authMiddleware, roleMiddleware } = require("../middleware/auth");
const { getEasebuzzCreds, computeInitiateHash, verifyResponseHash, getEasebuzzBaseUrl } = require("../config/easebuzz");

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
        const settings = await prisma.globalSettings.findFirst() || {};
        const totalRevenue = await prisma.booking.aggregate({
            where: { paymentStatus: { in: ["HELD", "RELEASED", "FORFEITED"] } }, _sum: { totalPaidAmount: true }
        });
        const totalGst = await prisma.booking.aggregate({
            where: { paymentStatus: { in: ["HELD", "RELEASED"] } }, _sum: { gstAmount: true }
        });
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
            totalVolume: totalRevenue._sum.totalPaidAmount || 0,
            platformShare: (totalRevenue._sum.totalPaidAmount || 0) * settings.commissionRate,
            totalGstCollected: totalGst._sum.gstAmount || 0,
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

module.exports = router;
