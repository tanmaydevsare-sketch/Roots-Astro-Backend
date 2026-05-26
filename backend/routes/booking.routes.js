const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: Get all bookings for the authenticated user (client or astrologer).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of bookings }
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: req.user.role === 'ASTROLOGER' ? { astrologerId: req.user.id } : { clientId: req.user.id },
            include: {
                client: { select: { firstName: true, lastName: true, email: true } },
                astrologer: { 
                    select: { 
                        firstName: true, 
                        lastName: true, 
                        email: true,
                        astrologerProfile: true
                    } 
                },
                service: true
            }
        });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/bookings/create:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a new booking (requires payment processing).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [astrologerId, serviceId, scheduledAt, amount]
 *             properties:
 *               astrologerId: { type: integer }
 *               serviceId: { type: integer }
 *               scheduledAt: { type: string, format: "date-time" }
 *               amount: { type: number }
 *     responses:
 *       201: { description: Booking created }
 */
router.post('/create', authMiddleware, roleMiddleware(['CLIENT']), async (req, res) => {
    const { astrologerId, serviceId, scheduledAt, amount, paymentMethod } = req.body;
    try {
        // If paying with wallet
        if (paymentMethod === 'WALLET') {
            const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
            if (!wallet || wallet.balance < amount) {
                return res.status(400).json({ error: 'Insufficient wallet balance' });
            }

            // Transactional update: Deduct from wallet + Create booking + Create Transaction
            const result = await prisma.$transaction(async (tx) => {
                // 1. Deduct from client wallet
                const updatedWallet = await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: parseFloat(amount) } }
                });

                // 2. Create Booking
                const booking = await tx.booking.create({
                    data: {
                        clientId: req.user.id,
                        astrologerId: parseInt(astrologerId),
                        serviceId: parseInt(serviceId),
                        scheduledAt: new Date(scheduledAt),
                        amount: parseFloat(amount),
                        status: 'UPCOMING', // Paid instantly
                        zoomMeetingUrl: `https://zoom.us/j/${Math.floor(Math.random() * 9000000000) + 1000000000}` // Mock Zoom Link
                    }
                });

                // 3. Create Wallet Transaction
                await tx.transaction.create({
                    data: {
                        walletId: wallet.id,
                        amount: -parseFloat(amount),
                        type: 'DEBIT',
                        category: 'BOOKING',
                        status: 'COMPLETED',
                        description: `Booking ID #${booking.id} Payment`,
                        reference: `BK-${booking.id}-${Date.now().toString().slice(-4)}`
                    }
                });

                return { booking, balance: updatedWallet.balance };
            });

            return res.status(201).json({ 
                message: 'Booking confirmed and paid via wallet.',
                booking: result.booking,
                newBalance: result.balance
            });
        }

        // Fallback: External Payment initiated
        const booking = await prisma.booking.create({
            data: {
                clientId: req.user.id,
                astrologerId: parseInt(astrologerId),
                serviceId: parseInt(serviceId),
                scheduledAt: new Date(scheduledAt),
                amount: parseFloat(amount),
                status: 'UPCOMING',
                zoomMeetingUrl: `https://zoom.us/j/${Math.floor(Math.random() * 9000000000) + 1000000000}`
            }
        });
        
        const paymentLink = `https://mock-stripe-checkout.com/pay/${booking.id}`;

        res.status(201).json({ 
            message: 'Booking confirmed successfully.',
            bookingId: booking.id,
            booking: booking,
            paymentUrl: paymentLink
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/bookings/admin/all:
 *   get:
 *     tags: [Admin]
 *     summary: List all bookings across the platform.
 */
router.get('/admin/all', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            include: {
                client: { select: { firstName: true, lastName: true, email: true } },
                astrologer: { select: { firstName: true, lastName: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/bookings/admin/cancel/{id}:
 *   patch:
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/cancel/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const booking = await prisma.booking.update({
            where: { id: parseInt(req.params.id) },
            data: { status: 'CANCELLED_BY_ADMIN' }
        });
        res.json({ message: 'Booking cancelled by admin', booking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/bookings/admin/reschedule/{id}:
 *   patch:
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/reschedule/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    const { newDate } = req.body;
    try {
        const booking = await prisma.booking.update({
            where: { id: parseInt(req.params.id) },
            data: { scheduledAt: new Date(newDate), status: 'RESCHEDULED_BY_ADMIN' }
        });
        res.json({ message: 'Booking rescheduled by admin', booking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/bookings/admin/complete/{id}:
 *   patch:
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/complete/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const booking = await prisma.booking.update({
            where: { id: parseInt(req.params.id) },
            data: { status: 'COMPLETED_BY_ADMIN' }
        });
        res.json({ message: 'Booking marked complete by admin', booking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/bookings/admin/refund/{id}:
 *   patch:
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/refund/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const booking = await prisma.booking.update({
            where: { id: parseInt(req.params.id) },
            data: { status: 'REFUNDED_BY_ADMIN' }
        });
        res.json({ message: 'Booking refunded by admin', booking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/bookings/astrologer/start/{id}:
 *   patch:
 *     tags: [Bookings]
 *     summary: Astrologer starts a session and provides a meeting link.
 *     security:
 *       - bearerAuth: []
 */
router.patch('/astrologer/start/:id', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    const { zoomMeetingUrl } = req.body;
    try {
        const booking = await prisma.booking.update({
            where: { id: parseInt(req.params.id), astrologerId: req.user.id },
            data: { status: 'IN_PROGRESS', zoomMeetingUrl }
        });
        res.json({ message: 'Session started', booking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/bookings/astrologer/reschedule/{id}:
 *   patch:
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/astrologer/reschedule/:id', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    const { newDate } = req.body;
    try {
        const booking = await prisma.booking.update({
            where: { id: parseInt(req.params.id), astrologerId: req.user.id },
            data: { scheduledAt: new Date(newDate), status: 'RESCHEDULED' }
        });
        res.json({ message: 'Reschedule request sent', booking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/bookings/astrologer/cancel/{id}:
 *   patch:
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/astrologer/cancel/:id', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    try {
        const booking = await prisma.booking.update({
            where: { id: parseInt(req.params.id), astrologerId: req.user.id },
            data: { status: 'CANCELLED' }
        });
        res.json({ message: 'Booking cancelled', booking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
