const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

/**
 * @swagger
 * /api/finance/stats:
 *   get:
 *     tags: [Finance]
 *     summary: Get balance and transactions for the authenticated user.
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        let wallet = await prisma.wallet.findUnique({
            where: { userId: req.user.id },
            include: { 
                transactions: { 
                    orderBy: { createdAt: 'desc' }, 
                    take: 50 
                } 
            }
        });

        if (!wallet) {
            wallet = await prisma.wallet.create({
                data: { userId: req.user.id, balance: 0 },
                include: { transactions: true }
            });
        }

        const withdrawals = await prisma.withdrawal.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            balance: wallet.balance,
            withdrawals,
            transactions: wallet.transactions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/finance/topup:
 *   post:
 *     tags: [Finance]
 *     summary: Add funds to the authenticated user's wallet.
 *     security:
 *       - bearerAuth: []
 */
router.post('/topup', authMiddleware, async (req, res) => {
    const { amount, method } = req.body;
    try {
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

        let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
        if (!wallet) {
            wallet = await prisma.wallet.create({ data: { userId: req.user.id, balance: 0 } });
        }

        const updated = await prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: parseFloat(amount) } }
        });

        // Log Transaction
        const transaction = await prisma.transaction.create({
            data: {
                walletId: wallet.id,
                amount: parseFloat(amount),
                type: 'CREDIT',
                category: 'TOPUP',
                status: 'COMPLETED',
                description: `Wallet Top-up via ${method || 'External Gateway'}`,
                reference: `TOP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
            }
        });

        res.json({ message: 'Funds added successfully', balance: updated.balance, transaction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/finance/razorpay/order:
 *   post:
 *     tags: [Finance]
 *     summary: Create a Razorpay order for top-up.
 *     security:
 *       - bearerAuth: []
 */
router.post('/razorpay/order', authMiddleware, async (req, res) => {
    const { amount } = req.body;
    try {
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

        // Load active configuration keys dynamically from database in real-time
        const RazorpayPackage = require('razorpay');
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const currencyCode = settings?.systemCurrency || "USD";

        const options = {
            amount: Math.round(amount * 100), // amount in the smallest currency unit
            currency: currencyCode,
            receipt: `receipt_${Date.now()}`,
        };

        const keyId = settings?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxxxxx';
        const keySecret = settings?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || 'xxxxxxx';
        
        const dynamicRazorpay = new RazorpayPackage({
            key_id: keyId,
            key_secret: keySecret
        });

        const order = await dynamicRazorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/finance/razorpay/verify:
 *   post:
 *     tags: [Finance]
 *     summary: Verify Razorpay payment and credit wallet.
 *     security:
 *       - bearerAuth: []
 */
router.post('/razorpay/verify', authMiddleware, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    try {
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        
        // Load active configuration keys dynamically from database in real-time
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const secret = settings?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || 'xxxxxxx';

        const expectedSign = crypto
            .createHmac("sha256", secret)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Payment verified
            let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
            if (!wallet) {
                wallet = await prisma.wallet.create({ data: { userId: req.user.id, balance: 0 } });
            }

            const updated = await prisma.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: parseFloat(amount) } }
            });

            const transaction = await prisma.transaction.create({
                data: {
                    walletId: wallet.id,
                    amount: parseFloat(amount),
                    type: 'CREDIT',
                    category: 'TOPUP',
                    status: 'COMPLETED',
                    description: `Wallet Top-up via Razorpay (${razorpay_payment_id})`,
                    reference: razorpay_payment_id
                }
            });

            return res.json({ message: "Payment verified successfully", balance: updated.balance, transaction });
        } else {
            return res.status(400).json({ error: "Invalid signature" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/finance/withdraw:
 *   post:
 *     tags: [Finance]
 *     summary: Request a withdrawal with flexible methods.
 *     security:
 *       - bearerAuth: []
 */
router.post('/withdraw', authMiddleware, async (req, res) => {
    const { amount, method, details } = req.body; // method: BANK, UPI, PAYPAL, RAZORPAY
    try {
        const wallet = await prisma.wallet.findUnique({
            where: { userId: req.user.id }
        });

        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Security Check: Max withdrawal limit for demo
        if (amount > 10000) {
            return res.status(400).json({ error: 'Withdrawal amount exceeds daily limit' });
        }

        const withdrawal = await prisma.withdrawal.create({
            data: {
                userId: req.user.id,
                amount,
                method,
                details: typeof details === 'string' ? details : JSON.stringify(details),
                reference: `WDRL-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
                status: 'PENDING'
            }
        });

        // Dedact balance immediately to prevent double-spending
        await prisma.wallet.update({
            where: { userId: req.user.id },
            data: { balance: { decrement: amount } }
        });

        // Log Transaction for reconciliation
        await prisma.transaction.create({
            data: {
                walletId: wallet.id,
                amount: -amount,
                type: 'DEBIT',
                category: 'WITHDRAWAL',
                status: 'PENDING',
                description: `Withdrawal via ${method}`,
                reference: withdrawal.reference,
                withdrawalId: withdrawal.id
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                action: 'WITHDRAWAL_REQUESTED',
                details: `User ${req.user.id} requested ${amount} via ${method}`,
                userId: req.user.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        });

        res.status(201).json({ message: 'Withdrawal request created', withdrawal });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/finance/admin/dashboard:
 *   get:
 *     tags: [Admin Finance]
 *     summary: Comprehensive Platform Finance Dashboard.
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/dashboard', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const totalRevenue = await prisma.booking.aggregate({
            where: {
                status: {
                    in: ['COMPLETED', 'COMPLETED_BY_ADMIN', 'completed']
                }
            },
            _sum: { amount: true }
        });

        const pendingWithdrawals = await prisma.withdrawal.findMany({
            where: { status: 'PENDING' },
            include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const recentTransactions = await prisma.transaction.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { wallet: { include: { user: true } } }
        });

        const settings = await prisma.globalSettings.findFirst() || {};

        res.json({
            totalVolume: totalRevenue._sum.amount || 0,
            platformShare: (totalRevenue._sum.amount || 0) * settings.commissionRate,
            pendingWithdrawals,
            recentTransactions,
            auditLogs: await prisma.auditLog.findMany({ take: 20, orderBy: { createdAt: 'desc' } })
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/finance/admin/payouts/{id}:
 *   patch:
 *     tags: [Admin Finance]
 *     summary: Approve or reject a payout.
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/payouts/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes, rejectionReason } = req.body; // APPROVED, REJECTED, COMPLETED

    try {
        const withdrawal = await prisma.withdrawal.findUnique({
            where: { id: parseInt(id) },
            include: { user: { include: { wallet: true } } }
        });

        if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });

        if (status === 'REJECTED') {
            // Refund the user's wallet
            await prisma.wallet.update({
                where: { id: withdrawal.user.wallet.id },
                data: { balance: { increment: withdrawal.amount } }
            });

            // Log Refund Transaction
            await prisma.transaction.create({
                data: {
                    walletId: withdrawal.user.wallet.id,
                    amount: withdrawal.amount,
                    type: 'CREDIT',
                    category: 'REFUND',
                    status: 'COMPLETED',
                    description: `Refund for rejected withdrawal ${withdrawal.reference}`,
                    reference: `REF-${withdrawal.reference}`
                }
            });
        }

        const updated = await prisma.withdrawal.update({
            where: { id: parseInt(id) },
            data: { 
                status, 
                adminNotes, 
                rejectionReason,
                processedAt: status === 'COMPLETED' ? new Date() : null
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                action: `WITHDRAWAL_${status}`,
                details: `Withdrawal ${withdrawal.reference} marked as ${status} by admin ${req.user.id}`,
                userId: req.user.id
            }
        });

        res.json({ message: `Withdrawal ${status}`, withdrawal: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
