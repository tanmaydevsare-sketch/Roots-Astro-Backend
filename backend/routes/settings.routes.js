const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

/**
 * @swagger
 * /api/settings/public/global:
 *   get:
 *     tags: [Settings]
 *     description: Publicly accessible site metadata and CMS content
 */
router.get('/public/global', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        // Strip sensitive data (keys/secrets) before returning public settings
        if (settings) {
            const { razorpayKeySecret, paypalClientSecret, zoomClientSecret, meetClientSecret, ...publicSettings } = settings;
            res.json(publicSettings);
        } else {
            // Return defaults if none found
            res.json({ platformName: 'Roots Astro' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


/**
 * @swagger
 * /api/settings/astrologer/gateways:
 *   get:
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 */
router.get('/astrologer/gateways', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    try {
        const profile = await prisma.astrologerProfile.findUnique({ where: { userId: req.user.id } });
        res.json({
            razorpay: { keyId: profile?.razorpayId, connected: profile?.razorpayConnected },
            paypal: { email: profile?.paypalEmail, connected: profile?.paypalConnected },
            upiId: profile?.upiId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/settings/astrologer/gateways/razorpay:
 *   post:
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 */
router.post('/astrologer/gateways/razorpay', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    const { id, connected } = req.body;
    try {
        await prisma.astrologerProfile.update({
            where: { userId: req.user.id },
            data: { razorpayId: id, razorpayConnected: connected }
        });
        res.json({ message: 'Razorpay updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/settings/admin/global:
 *   patch:
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/global', authMiddleware, roleMiddleware(['SUPERADMIN', 'ADMIN']), async (req, res) => {
    try {
        // Both SUPERADMIN and ADMIN can update sensitive fields (like storage and payment gateway keys)
        const isSuperAdmin = req.user.role === 'SUPERADMIN' || req.user.role === 'ADMIN';
        
        const superOnlyFields = [
            'activeStorage', 'storageBucket', 'storageRegion', 'storageEndpoint', 'storageAccessKey', 'storageSecretKey',
            'razorpayKeyId', 'razorpayKeySecret', 'paypalClientId', 'paypalClientSecret',
            'zoomAccountId', 'zoomClientId', 'zoomClientSecret'
        ];

        const allowedFields = [
            'platformName', 'supportEmail', 'contactPhone', 'systemCurrency',
            'maintenanceMode', 'allowNewRegistrations', 'commissionRate',
            'apiLockdown', 'allowUpi', 'allowCard', 'allowNetBanking',
            'recordSessions', 'overallRecordingGovernance', 'recordingRetentionDays',
            'autoShareRecordings', 'maxRecordingSizeMB', 
            'adminBankName', 'adminAccountNo', 'adminIfsc', 'activeGateway', 'razorpayMode',
            'paypalMode', 'activeVideoProvider', 'heroTitle', 'heroSubtitle', 
            'feature1Title', 'feature1Desc', 'feature2Title', 'feature2Desc', 'feature3Title', 'feature3Desc',
            'aboutUsContent', 'contactContent', 'privacyPolicy', 'termsOfService',
            'refundPolicy', 'shippingPolicy', 'blogContent', 'legalContent', 'sitePrimaryColor',
            'siteSecondaryColor', 'siteAccentColor', 'siteLogo'
        ];

        // Add super-only fields if user is SUPERADMIN
        const finalAllowedFields = isSuperAdmin ? [...allowedFields, ...superOnlyFields] : allowedFields;

        console.log("DEBUG SETTINGS: user =", req.user);
        console.log("DEBUG SETTINGS: isSuperAdmin =", isSuperAdmin);
        console.log("DEBUG SETTINGS: finalAllowedFields includes razorpayKeyId =", finalAllowedFields.includes('razorpayKeyId'));

        const sanitizedData = {};
        finalAllowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                sanitizedData[field] = req.body[field];
            }
        });

        console.log("DEBUG SETTINGS: sanitizedData =", sanitizedData);

        // If not superadmin and trying to update super-only fields, ignore them (sanitized already)
        if (!isSuperAdmin) {
             const overlapping = superOnlyFields.filter(f => req.body[f] !== undefined);
             if (overlapping.length > 0 && req.user.role === 'ADMIN') {
                 // We just silent-drop them or we could error. 
                 // The sanitizedData already excludes them.
             }
        }

        const settings = await prisma.globalSettings.upsert({
            where: { id: 1 },
            update: sanitizedData,
            create: { id: 1, ...sanitizedData }
        });
        res.json({ message: 'Success', settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/settings/admin/zoom/verify:
 *   post:
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 */
router.post('/admin/zoom/verify', authMiddleware, roleMiddleware(['SUPERADMIN', 'ADMIN']), async (req, res) => {
    const { accountId, clientId, clientSecret } = req.body;
    if (!accountId || !clientId || !clientSecret) {
        return res.status(400).json({ verified: false, error: 'Account ID, Client ID, and Client Secret are required' });
    }
    try {
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
                res.json({ verified: true, message: 'Successfully connected to Zoom API' });
            } else {
                res.status(400).json({ verified: false, error: 'Failed to retrieve access token' });
            }
        } else {
            res.status(400).json({ verified: false, error: `Invalid credentials: ${response.statusText}` });
        }
    } catch (error) {
        res.status(500).json({ verified: false, error: error.message });
    }
});

/**
 * @swagger
 * /api/settings/admin/bank:
 *   patch:
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *   description: Legacy endpoint, redirects to global
 */
router.patch('/admin/bank', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), async (req, res) => {
    try {
        const settings = await prisma.globalSettings.upsert({
            where: { id: 1 },
            update: req.body,
            create: { id: 1, ...req.body }
        });
        res.json({ message: 'Success', settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/settings/admin/gateways:
 *   get:
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/gateways', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        res.json(settings || { activeGateway: 'razorpay' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/settings/admin/services:
 *   get:
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/services', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const services = await prisma.masterService.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/settings/admin/services:
 *   post:
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post('/admin/services', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const service = await prisma.masterService.create({ data: req.body });
        res.status(201).json(service);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/settings/admin/services/{id}:
 *   patch:
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/services/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const service = await prisma.masterService.update({
            where: { id: parseInt(req.params.id) },
            data: req.body
        });
        res.json(service);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/settings/admin/services/{id}:
 *   delete:
 *     tags: [Admin]
 */
router.delete('/admin/services/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        await prisma.masterService.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Service deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
