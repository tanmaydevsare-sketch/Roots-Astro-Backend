const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Helper: parse scheduledAt string in IST (+05:30)
function parseISTToUTC(scheduledAtStr) {
    if (typeof scheduledAtStr !== 'string') return new Date(scheduledAtStr);
    if (scheduledAtStr.includes('Z') || scheduledAtStr.match(/GMT|UTC|[+-]\d{2}:?\d{2}/i)) return new Date(scheduledAtStr);
    const date = new Date(`${scheduledAtStr.trim()} +05:30`);
    return isNaN(date.getTime()) ? new Date(scheduledAtStr) : date;
}

// Helper: compute tax breakdown
async function computeTaxBreakdown(baseAmount, settings) {
    const gstRate = settings?.gstRate ?? 0.18;
    const convRate = settings?.convenienceRate ?? 0.0;
    const convenienceAmount = parseFloat((baseAmount * convRate).toFixed(2));
    const gstAmount = parseFloat(((baseAmount + convenienceAmount) * gstRate).toFixed(2));
    const totalPaidAmount = parseFloat((baseAmount + convenienceAmount + gstAmount).toFixed(2));
    return { gstRate, convenienceAmount, gstAmount, totalPaidAmount };
}

// GET /api/bookings — Get bookings for logged-in user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: req.user.role === 'ASTROLOGER' ? { astrologerId: req.user.id } : { clientId: req.user.id },
            include: {
                client: { select: { firstName: true, lastName: true, email: true, country: true } },
                astrologer: { select: { firstName: true, lastName: true, email: true, astrologerProfile: true } },
                service: true,
                disputes: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(bookings);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/bookings/quote — Get tax breakdown BEFORE paying (preview)
router.post('/quote', authMiddleware, roleMiddleware(['CLIENT']), async (req, res) => {
    const { baseAmount } = req.body;
    try {
        if (!baseAmount || baseAmount <= 0) return res.status(400).json({ error: 'Invalid amount' });
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const tax = await computeTaxBreakdown(parseFloat(baseAmount), settings);
        const isInternational = req.body.isInternational || false;
        res.json({
            baseAmount: parseFloat(baseAmount),
            convenienceAmount: tax.convenienceAmount,
            gstRate: tax.gstRate,
            gstAmount: tax.gstAmount,
            totalPaidAmount: tax.totalPaidAmount,
            currency: isInternational ? 'USD' : 'INR',
            activeGateway: isInternational ? 'PAYPAL' : (settings?.activeDomesticGateway || 'razorpay')
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/bookings/create — Create booking (payment captured separately via gateway)
router.post('/create', authMiddleware, roleMiddleware(['CLIENT']), async (req, res) => {
    const { astrologerId, serviceId, scheduledAt, baseAmount, paymentMethod, gatewayOrderId, gatewayPaymentId, isInternational, currency } = req.body;
    try {
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const slotDate = parseISTToUTC(scheduledAt);

        if (slotDate.getTime() < Date.now()) {
            return res.status(400).json({ error: 'This time slot has already passed. Please select a future time.' });
        }

        const existingBooking = await prisma.booking.findFirst({
            where: {
                astrologerId: parseInt(astrologerId),
                scheduledAt: slotDate,
                status: { notIn: ['CANCELLED', 'CANCELLED_FORFEITED', 'CANCELLED_BY_ADMIN', 'REFUNDED_BY_ADMIN'] }
            }
        });
        if (existingBooking) return res.status(409).json({ error: 'This slot is already booked. Please choose another time.' });

        const intl = isInternational === true || isInternational === 'true';
        const tax = await computeTaxBreakdown(parseFloat(baseAmount), settings);
        const gateway = intl ? 'PAYPAL' : (paymentMethod === 'WALLET' ? 'WALLET' : (settings?.activeDomesticGateway?.toUpperCase() || 'RAZORPAY'));

        // WALLET payment
        if (gateway === 'WALLET') {
            const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
            if (!wallet || wallet.balance < tax.totalPaidAmount) {
                return res.status(400).json({ error: `Insufficient wallet balance. Required: ₹${tax.totalPaidAmount}` });
            }

            const result = await prisma.$transaction(async (tx) => {
                const updatedWallet = await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: tax.totalPaidAmount } }
                });

                const booking = await tx.booking.create({
                    data: {
                        clientId: req.user.id,
                        astrologerId: parseInt(astrologerId),
                        serviceId: serviceId ? parseInt(serviceId) : undefined,
                        scheduledAt: slotDate,
                        amount: tax.totalPaidAmount,
                        baseAmount: parseFloat(baseAmount),
                        convenienceAmount: tax.convenienceAmount,
                        gstAmount: tax.gstAmount,
                        totalPaidAmount: tax.totalPaidAmount,
                        paymentStatus: 'HELD',
                        paymentGateway: 'WALLET',
                        status: 'UPCOMING',
                        currency: intl ? 'USD' : 'INR',
                        isInternational: intl,
                        problemDesc: req.body.problemDesc || null,
                        zoomMeetingUrl: `https://zoom.us/j/${Math.floor(Math.random() * 9000000000) + 1000000000}`
                    }
                });

                await tx.transaction.create({
                    data: {
                        walletId: wallet.id,
                        amount: -tax.totalPaidAmount,
                        type: 'DEBIT',
                        category: 'BOOKING',
                        status: 'COMPLETED',
                        description: `Booking #${booking.id} | Base: ₹${baseAmount} + GST: ₹${tax.gstAmount} + Conv: ₹${tax.convenienceAmount}`,
                        reference: `BK-${booking.id}-${Date.now().toString().slice(-4)}`
                    }
                });

                return { booking, balance: updatedWallet.balance };
            });

            return res.status(201).json({
                message: 'Booking confirmed. Payment held in escrow until session completion.',
                booking: result.booking,
                newBalance: result.balance,
                taxBreakdown: { baseAmount: parseFloat(baseAmount), convenienceAmount: tax.convenienceAmount, gstAmount: tax.gstAmount, totalPaidAmount: tax.totalPaidAmount }
            });
        }

        // External gateway (Razorpay / Easebuzz / PayPal) — payment already captured via frontend
        const booking = await prisma.booking.create({
            data: {
                clientId: req.user.id,
                astrologerId: parseInt(astrologerId),
                serviceId: serviceId ? parseInt(serviceId) : undefined,
                scheduledAt: slotDate,
                amount: tax.totalPaidAmount,
                baseAmount: parseFloat(baseAmount),
                convenienceAmount: tax.convenienceAmount,
                gstAmount: tax.gstAmount,
                totalPaidAmount: tax.totalPaidAmount,
                paymentStatus: 'HELD',
                paymentGateway: gateway,
                gatewayOrderId: gatewayOrderId || null,
                gatewayPaymentId: gatewayPaymentId || null,
                status: 'UPCOMING',
                currency: intl ? 'USD' : 'INR',
                isInternational: intl,
                problemDesc: req.body.problemDesc || null,
                zoomMeetingUrl: `https://zoom.us/j/${Math.floor(Math.random() * 9000000000) + 1000000000}`
            }
        });

        res.status(201).json({
            message: 'Booking confirmed. Payment held in escrow until session completion.',
            booking,
            taxBreakdown: { baseAmount: parseFloat(baseAmount), convenienceAmount: tax.convenienceAmount, gstAmount: tax.gstAmount, totalPaidAmount: tax.totalPaidAmount }
        });
    } catch (error) {
        console.error('[BOOKING] Create error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/bookings/confirm/:id — Dual confirmation (CLIENT or ASTROLOGER)
router.patch('/confirm/:id', authMiddleware, async (req, res) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { astrologer: { include: { wallet: true } } }
        });
        if (!booking) return res.status(404).json({ error: 'Booking not found.' });

        const completedStatuses = ['COMPLETED', 'IN_PROGRESS', 'UPCOMING'];
        if (!completedStatuses.includes(booking.status) && booking.status !== 'COMPLETED') {
            return res.status(400).json({ error: 'Only completed or ongoing sessions can be confirmed.' });
        }

        const isClient = req.user.id === booking.clientId;
        const isAstrologer = req.user.id === booking.astrologerId;
        if (!isClient && !isAstrologer) return res.status(403).json({ error: 'Not your booking.' });

        const updateData = {};
        if (isClient && !booking.clientConfirmed) {
            updateData.clientConfirmed = true;
            updateData.clientConfirmedAt = new Date();
            updateData.status = 'COMPLETED';
        }
        if (isAstrologer && !booking.astrologerConfirmed) {
            updateData.astrologerConfirmed = true;
            updateData.astrologerConfirmedAt = new Date();
            updateData.status = 'COMPLETED';
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: booking.id },
            data: updateData
        });

        // Both confirmed → release escrow to astrologer wallet
        const bothConfirmed = updatedBooking.clientConfirmed && updatedBooking.astrologerConfirmed;
        if (bothConfirmed && updatedBooking.paymentStatus === 'HELD') {
            const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
            const commissionRate = settings?.commissionRate ?? 0.20;
            const astrologerShare = parseFloat((updatedBooking.baseAmount * (1 - commissionRate)).toFixed(2));

            let astroWallet = await prisma.wallet.findUnique({ where: { userId: booking.astrologerId } });
            if (!astroWallet) {
                astroWallet = await prisma.wallet.create({ data: { userId: booking.astrologerId, balance: 0 } });
            }

            await prisma.$transaction(async (tx) => {
                await tx.wallet.update({
                    where: { id: astroWallet.id },
                    data: { balance: { increment: astrologerShare } }
                });
                await tx.transaction.create({
                    data: {
                        walletId: astroWallet.id,
                        amount: astrologerShare,
                        type: 'CREDIT',
                        category: 'BOOKING',
                        status: 'COMPLETED',
                        description: `Session payout for booking #${booking.id} (Base: ₹${updatedBooking.baseAmount}, Commission: ${(commissionRate*100).toFixed(0)}%)`,
                        reference: `PAYOUT-BK-${booking.id}-${Date.now().toString().slice(-4)}`
                    }
                });
                await tx.booking.update({
                    where: { id: booking.id },
                    data: { paymentStatus: 'RELEASED' }
                });
            });

            return res.json({ message: 'Both parties confirmed. Escrow released to astrologer.', booking: updatedBooking, astrologerShare });
        }

        res.json({ message: `${isClient ? 'Client' : 'Astrologer'} confirmation recorded. Waiting for the other party.`, booking: updatedBooking });
    } catch (error) {
        console.error('[BOOKING] Confirm error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/bookings/cancel/:id — Client cancels (time-gated refund)
router.patch('/cancel/:id', authMiddleware, roleMiddleware(['CLIENT']), async (req, res) => {
    try {
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const cutoffMinutes = settings?.cancellationCutoffMinutes ?? 30;

        const booking = await prisma.booking.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!booking) return res.status(404).json({ error: 'Booking not found.' });
        if (booking.clientId !== req.user.id) return res.status(403).json({ error: 'Not your booking.' });
        if (!['UPCOMING', 'RESCHEDULED'].includes(booking.status)) {
            return res.status(400).json({ error: 'This booking cannot be cancelled.' });
        }

        const minutesUntilAppt = (new Date(booking.scheduledAt).getTime() - Date.now()) / (1000 * 60);
        const isEligibleForRefund = minutesUntilAppt >= cutoffMinutes;

        if (isEligibleForRefund) {
            // Full refund
            let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
            if (!wallet) wallet = await prisma.wallet.create({ data: { userId: req.user.id, balance: 0 } });

            await prisma.$transaction(async (tx) => {
                await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: booking.totalPaidAmount || booking.amount } }
                });
                await tx.transaction.create({
                    data: {
                        walletId: wallet.id,
                        amount: booking.totalPaidAmount || booking.amount,
                        type: 'CREDIT',
                        category: 'REFUND',
                        status: 'COMPLETED',
                        description: `Refund for cancelled booking #${booking.id}`,
                        reference: `CNCL-REF-${booking.id}-${Date.now().toString().slice(-4)}`
                    }
                });
                await tx.booking.update({
                    where: { id: booking.id },
                    data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' }
                });
            });

            return res.json({ message: `Booking cancelled. Full refund of ₹${booking.totalPaidAmount || booking.amount} has been credited to your wallet.`, refunded: true });
        } else {
            // No refund — forfeited
            await prisma.booking.update({
                where: { id: booking.id },
                data: { status: 'CANCELLED_FORFEITED', paymentStatus: 'FORFEITED' }
            });
            return res.json({
                message: `Booking cancelled. No refund issued — cancellations within ${cutoffMinutes} minutes of the appointment are non-refundable.`,
                refunded: false,
                minutesUntilAppt: Math.round(minutesUntilAppt)
            });
        }
    } catch (error) {
        console.error('[BOOKING] Cancel error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/bookings/admin/all
router.get('/admin/all', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            include: {
                client: { select: { firstName: true, lastName: true, email: true } },
                astrologer: { select: { firstName: true, lastName: true, email: true } },
                disputes: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(bookings);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// PATCH /api/bookings/admin/cancel/:id
router.patch('/admin/cancel/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const booking = await prisma.booking.update({
            where: { id: parseInt(req.params.id) },
            data: { status: 'CANCELLED_BY_ADMIN', paymentStatus: 'REFUNDED' }
        });
        res.json({ message: 'Booking cancelled by admin', booking });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// PATCH /api/bookings/admin/reschedule/:id
router.patch('/admin/reschedule/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    const { newDate } = req.body;
    try {
        const booking = await prisma.booking.update({
            where: { id: parseInt(req.params.id) },
            data: { scheduledAt: new Date(newDate), status: 'RESCHEDULED_BY_ADMIN' }
        });
        res.json({ message: 'Booking rescheduled by admin', booking });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// PATCH /api/bookings/admin/complete/:id
router.patch('/admin/complete/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const booking = await prisma.booking.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!booking) return res.status(404).json({ error: 'Not found' });

        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const commissionRate = settings?.commissionRate ?? 0.20;
        const astrologerShare = parseFloat((booking.baseAmount * (1 - commissionRate)).toFixed(2));

        let astroWallet = await prisma.wallet.findUnique({ where: { userId: booking.astrologerId } });
        if (!astroWallet) astroWallet = await prisma.wallet.create({ data: { userId: booking.astrologerId, balance: 0 } });

        await prisma.$transaction(async (tx) => {
            await tx.booking.update({ where: { id: booking.id }, data: { status: 'COMPLETED_BY_ADMIN', paymentStatus: 'RELEASED', clientConfirmed: true, astrologerConfirmed: true } });
            await tx.wallet.update({ where: { id: astroWallet.id }, data: { balance: { increment: astrologerShare } } });
            await tx.transaction.create({
                data: {
                    walletId: astroWallet.id, amount: astrologerShare, type: 'CREDIT', category: 'BOOKING', status: 'COMPLETED',
                    description: `Admin-completed booking #${booking.id} payout`,
                    reference: `ADMIN-PAYOUT-${booking.id}-${Date.now().toString().slice(-4)}`
                }
            });
        });

        res.json({ message: 'Booking marked complete. Escrow released to astrologer.', astrologerShare });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// PATCH /api/bookings/admin/refund/:id
router.patch('/admin/refund/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const booking = await prisma.booking.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!booking) return res.status(404).json({ error: 'Not found' });

        let clientWallet = await prisma.wallet.findUnique({ where: { userId: booking.clientId } });
        if (!clientWallet) clientWallet = await prisma.wallet.create({ data: { userId: booking.clientId, balance: 0 } });

        await prisma.$transaction(async (tx) => {
            await tx.wallet.update({ where: { id: clientWallet.id }, data: { balance: { increment: booking.totalPaidAmount || booking.amount } } });
            await tx.transaction.create({
                data: {
                    walletId: clientWallet.id, amount: booking.totalPaidAmount || booking.amount, type: 'CREDIT', category: 'REFUND', status: 'COMPLETED',
                    description: `Admin refund for booking #${booking.id}`,
                    reference: `ADMIN-REF-${booking.id}-${Date.now().toString().slice(-4)}`
                }
            });
            await tx.booking.update({ where: { id: booking.id }, data: { status: 'REFUNDED_BY_ADMIN', paymentStatus: 'REFUNDED' } });
        });

        res.json({ message: 'Booking refunded by admin', refundAmount: booking.totalPaidAmount || booking.amount });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// PATCH /api/bookings/astrologer/start/:id
router.patch('/astrologer/start/:id', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    let { zoomMeetingUrl } = req.body;
    try {
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        if (settings && settings.zoomAccountId && settings.zoomClientId && settings.zoomClientSecret) {
            try {
                const credentials = Buffer.from(`${settings.zoomClientId}:${settings.zoomClientSecret}`).toString('base64');
                const tokenRes = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${settings.zoomAccountId}`, {
                    method: 'POST', headers: { 'Authorization': `Basic ${credentials}` }
                });
                if (tokenRes.ok) {
                    const tokenData = await tokenRes.json();
                    const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ topic: 'Roots Astro Consultation', type: 1, settings: { host_video: true, participant_video: true, waiting_room: true } })
                    });
                    if (meetingRes.ok) { const md = await meetingRes.json(); zoomMeetingUrl = md.join_url; }
                }
            } catch (zoomErr) { console.error('Zoom API Error:', zoomErr); }
        }

        const booking = await prisma.booking.update({
            where: { id: parseInt(req.params.id), astrologerId: req.user.id },
            data: { status: 'IN_PROGRESS', startTime: new Date(), zoomMeetingUrl }
        });
        res.json({ message: 'Session started', booking, zoomMeetingUrl });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// PATCH /api/bookings/astrologer/reschedule/:id
router.patch('/astrologer/reschedule/:id', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    const { newDate } = req.body;
    try {
        const booking = await prisma.booking.update({
            where: { id: parseInt(req.params.id), astrologerId: req.user.id },
            data: { scheduledAt: new Date(newDate), status: 'RESCHEDULED' }
        });
        res.json({ message: 'Reschedule request sent', booking });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// PATCH /api/bookings/astrologer/cancel/:id
router.patch('/astrologer/cancel/:id', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    try {
        const booking = await prisma.booking.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!booking) return res.status(404).json({ error: 'Not found' });

        // Astrologer cancels → always refund client
        let clientWallet = await prisma.wallet.findUnique({ where: { userId: booking.clientId } });
        if (!clientWallet) clientWallet = await prisma.wallet.create({ data: { userId: booking.clientId, balance: 0 } });

        await prisma.$transaction(async (tx) => {
            if (booking.paymentStatus === 'HELD') {
                await tx.wallet.update({ where: { id: clientWallet.id }, data: { balance: { increment: booking.totalPaidAmount || booking.amount } } });
                await tx.transaction.create({
                    data: {
                        walletId: clientWallet.id, amount: booking.totalPaidAmount || booking.amount, type: 'CREDIT', category: 'REFUND', status: 'COMPLETED',
                        description: `Refund: Astrologer cancelled booking #${booking.id}`,
                        reference: `ASTRO-CNCL-REF-${booking.id}-${Date.now().toString().slice(-4)}`
                    }
                });
            }
            await tx.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' } });
        });

        res.json({ message: 'Booking cancelled by astrologer. Client has been refunded.' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
