const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const DISPUTE_REASONS = ['DISSATISFIED', 'ABUSIVE', 'MISCONDUCT', 'NO_SHOW', 'WRONG_ADVICE', 'OTHER'];

// POST /api/disputes/:bookingId — Client raises a dispute
router.post('/:bookingId', authMiddleware, roleMiddleware(['CLIENT']), async (req, res) => {
    const { bookingId } = req.params;
    const { reason, description, evidenceUrls = [] } = req.body;
    try {
        if (!DISPUTE_REASONS.includes(reason)) {
            return res.status(400).json({ error: `Invalid reason. Must be one of: ${DISPUTE_REASONS.join(', ')}` });
        }
        if (!description || description.trim().length < 20) {
            return res.status(400).json({ error: 'Description must be at least 20 characters.' });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(bookingId) },
            include: { disputes: true }
        });

        if (!booking) return res.status(404).json({ error: 'Booking not found.' });
        if (booking.clientId !== req.user.id) return res.status(403).json({ error: 'You can only dispute your own bookings.' });

        const completedStatuses = ['COMPLETED', 'COMPLETED_BY_ADMIN'];
        if (!completedStatuses.includes(booking.status)) {
            return res.status(400).json({ error: 'Disputes can only be raised on completed sessions.' });
        }

        // Check dispute window
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const windowDays = settings?.disputeWindowDays || 7;
        const completionTime = booking.updatedAt;
        const deadlineMs = completionTime.getTime() + windowDays * 24 * 60 * 60 * 1000;
        if (Date.now() > deadlineMs) {
            return res.status(400).json({ error: `Dispute window has expired. You had ${windowDays} days after session completion to raise a dispute.` });
        }

        // Only one dispute per booking
        const existingDispute = booking.disputes.find(d => d.clientId === req.user.id);
        if (existingDispute) {
            return res.status(409).json({ error: 'A dispute has already been raised for this booking.', dispute: existingDispute });
        }

        const dispute = await prisma.disputeClaim.create({
            data: {
                bookingId: parseInt(bookingId),
                clientId: req.user.id,
                reason,
                description: description.trim(),
                evidenceUrls: JSON.stringify(Array.isArray(evidenceUrls) ? evidenceUrls : []),
                status: 'OPEN'
            }
        });

        // Log audit
        await prisma.auditLog.create({
            data: {
                action: 'DISPUTE_RAISED',
                details: `Client ${req.user.id} raised dispute for booking #${bookingId}: ${reason}`,
                userId: req.user.id,
                ipAddress: req.ip
            }
        });

        res.status(201).json({ message: 'Dispute raised successfully. Our team will review it within 48 hours.', dispute });
    } catch (error) {
        console.error('[DISPUTE] Create error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/disputes — List disputes (admin sees all, client sees own)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const where = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN'
            ? {}
            : { clientId: req.user.id };

        const disputes = await prisma.disputeClaim.findMany({
            where,
            include: {
                booking: {
                    include: {
                        client: { select: { firstName: true, lastName: true, email: true, phone: true } },
                        astrologer: { select: { firstName: true, lastName: true, email: true } },
                        service: { select: { title: true, price: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(disputes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/disputes/:id/review — Admin puts dispute under review
router.patch('/:id/review', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const dispute = await prisma.disputeClaim.update({
            where: { id: parseInt(req.params.id) },
            data: { status: 'UNDER_REVIEW' }
        });
        res.json({ message: 'Dispute is now under review.', dispute });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/disputes/:id/resolve — Admin resolves with decision
router.patch('/:id/resolve', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    const { decision, adminNotes } = req.body; // decision: REFUND | REJECT
    try {
        if (!['REFUND', 'REJECT'].includes(decision)) {
            return res.status(400).json({ error: 'Decision must be REFUND or REJECT' });
        }

        const dispute = await prisma.disputeClaim.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { booking: true }
        });

        if (!dispute) return res.status(404).json({ error: 'Dispute not found.' });

        const newStatus = decision === 'REFUND' ? 'RESOLVED_REFUND' : 'RESOLVED_REJECTED';

        // If refunding, credit client wallet and mark booking refunded
        if (decision === 'REFUND') {
            const clientWallet = await prisma.wallet.findUnique({ where: { userId: dispute.clientId } })
                || await prisma.wallet.create({ data: { userId: dispute.clientId, balance: 0 } });

            await prisma.$transaction(async (tx) => {
                // Credit full amount back to client
                await tx.wallet.update({
                    where: { id: clientWallet.id },
                    data: { balance: { increment: dispute.booking.totalPaidAmount || dispute.booking.amount } }
                });

                await tx.transaction.create({
                    data: {
                        walletId: clientWallet.id,
                        amount: dispute.booking.totalPaidAmount || dispute.booking.amount,
                        type: 'CREDIT',
                        category: 'REFUND',
                        status: 'COMPLETED',
                        description: `Full refund for dispute #${dispute.id} on booking #${dispute.bookingId}`,
                        reference: `DISP-REF-${dispute.id}-${Date.now()}`
                    }
                });

                await tx.booking.update({
                    where: { id: dispute.bookingId },
                    data: { paymentStatus: 'REFUNDED', status: 'REFUNDED_BY_ADMIN' }
                });

                await tx.disputeClaim.update({
                    where: { id: dispute.id },
                    data: { status: newStatus, adminNotes, resolvedAt: new Date() }
                });
            });
        } else {
            await prisma.disputeClaim.update({
                where: { id: dispute.id },
                data: { status: newStatus, adminNotes, resolvedAt: new Date() }
            });
        }

        await prisma.auditLog.create({
            data: {
                action: `DISPUTE_${decision}ED`,
                details: `Admin ${req.user.id} resolved dispute #${dispute.id} as ${decision}`,
                userId: req.user.id
            }
        });

        res.json({ message: `Dispute resolved: ${decision}`, disputeId: dispute.id });
    } catch (error) {
        console.error('[DISPUTE] Resolve error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
