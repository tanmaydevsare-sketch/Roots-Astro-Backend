const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

/**
 * @swagger
 * /api/astrologers:
 *   get:
 *     tags: [Astrologers]
 *     summary: Get all approved astrologers with detailed profiles and availability.
 *     parameters:
 *       - in: query
 *         name: expertise
 *         schema: { type: string }
 *         description: Filter by expertise (e.g. Vedic, Tarot)
 *       - in: query
 *         name: language
 *         schema: { type: string }
 *         description: Filter by language (e.g. English, Hindi)
 *     responses:
 *       200: { description: List of astrologers }
 */
router.get('/', async (req, res) => {
    const { expertise, language } = req.query;
    try {
        const astrologers = await prisma.user.findMany({
            where: {
                role: 'ASTROLOGER',
                astrologerProfile: {
                    status: 'APPROVED',
                    expertise: expertise ? { contains: expertise, mode: 'insensitive' } : undefined,
                    languages: language ? { contains: language, mode: 'insensitive' } : undefined
                }
            },
            include: {
                astrologerProfile: {
                    include: {
                        services: true,
                        availability: true,
                        reviews: true
                    }
                }
            }
        });
        
        // Sanitize sensitive user data
        const results = astrologers.map(u => {
            const { password, ...safeUser } = u;
            return safeUser;
        });

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/astrologers/{id}:
 *   get:
 *     tags: [Astrologers]
 *     summary: Get full profile of a specific astrologer by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Astrologer profile details }
 *       404: { description: Astrologer not found }
 */
router.get('/:id', async (req, res) => {
    try {
        const astrologer = await prisma.user.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                astrologerProfile: {
                    include: {
                        services: true,
                        availability: true,
                        reviews: { include: { astrologer: true } }
                    }
                }
            }
        });
        
        if (!astrologer || astrologer.role !== 'ASTROLOGER') {
            return res.status(404).json({ error: 'Astrologer not found' });
        }

        const { password, ...safeUser } = astrologer;
        res.json(safeUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/astrologers/profile/me:
 *   get:
 *     tags: [Astrologers]
 *     summary: Get current astrologer's profile details.
 *     security:
 *       - bearerAuth: []
 */
router.get('/profile/me', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    try {
        const profile = await prisma.astrologerProfile.findUnique({
            where: { userId: req.user.id },
            include: { user: true }
        });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/astrologers/profile/update:
 *   patch:
 *     tags: [Astrologers]
 *     summary: Update current astrologer's profile details.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio: { type: string }
 *               expertise: { type: string }
 *               languages: { type: string }
 *               profileImage: { type: string }
 *     responses:
 *       200: { description: Profile updated successfully }
 */
router.patch('/profile/update', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    const { firstName, lastName, phone, city, country, dob, gender, rate, name, certifications, ...profileData } = req.body;
    try {
        let finalFirstName = firstName;
        let finalLastName = lastName;
        if (name && !firstName && !lastName) {
            const parts = name.trim().split(/\s+/);
            finalFirstName = parts[0];
            finalLastName = parts.slice(1).join(' ');
        }

        // Update user fields
        await prisma.user.update({
            where: { id: req.user.id },
            data: { 
                firstName: finalFirstName, 
                lastName: finalLastName, 
                phone, city, country, dob, gender 
            }
        });

        if (certifications !== undefined) {
            profileData.certification = certifications;
        }

        // Clean up any extra fields that might not exist on the schema
        delete profileData.id;
        delete profileData.userId;
        delete profileData.user;
        delete profileData.services;
        delete profileData.bookings;
        delete profileData.availability;
        delete profileData.reviews;

        // Update profile fields
        const updated = await prisma.astrologerProfile.update({
            where: { userId: req.user.id },
            data: profileData
        });

        // 3. Handle initial service creation if a rate was provided and they have no services
        if (rate) {
            const currentServices = await prisma.service.findMany({ where: { profileId: updated.id } });
            if (currentServices.length === 0) {
                await prisma.service.create({
                    data: {
                        title: 'Introductory Consultation',
                        description: 'Introductory astrology consultation session.',
                        price: parseFloat(rate),
                        duration: 30, // Default 30 min
                        profileId: updated.id
                    }
                });
            }
        }

        const fullUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (fullUser) delete fullUser.password;

        res.json({ message: 'Profile updated successfully', profile: updated, user: fullUser });
    } catch (error) {
        console.error('[ASTRO_PROFILE_UPDATE_ERROR]', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/astrologers/admin/pending:
 *   get:
 *     tags: [Admin]
 *     summary: List all pending astrologer applications.
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/pending', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const pending = await prisma.astrologerProfile.findMany({
            where: { status: 'PENDING_APPROVAL' },
            include: { user: true }
        });
        res.json(pending);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/astrologers/admin/approve/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Approve an astrologer application by profile id.
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/approve/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        await prisma.astrologerProfile.update({
            where: { id: parseInt(req.params.id) },
            data: { status: 'APPROVED' }
        });
        res.json({ message: 'Astrologer approved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/astrologers/admin/reject/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Reject an astrologer application by profile id.
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/reject/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        await prisma.astrologerProfile.update({
            where: { id: parseInt(req.params.id) },
            data: { status: 'REJECTED' }
        });
        res.json({ message: 'Astrologer rejected' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/astrologers/schedule/update:
 *   patch:
 *     tags: [Astrologers]
 *     summary: Update working schedule.
 *     security:
 *       - bearerAuth: []
 */
router.patch('/schedule/update', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    const { schedule } = req.body; 
    try {
        const profile = await prisma.astrologerProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        await prisma.availability.deleteMany({ where: { profileId: profile.id } });

        const records = [];
        days.forEach((day, index) => {
            const config = schedule[day];
            if (config && config.available) {
                records.push({
                    profileId: profile.id,
                    dayOfWeek: index,
                    startTime: config.start,
                    endTime: config.end
                });
            }
        });

        if (records.length > 0) {
            await prisma.availability.createMany({ data: records });
        }

        res.json({ message: 'Schedule updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/astrologers/services:
 *   get:
 *     tags: [Astrologers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/services', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    try {
        const profile = await prisma.astrologerProfile.findUnique({ where: { userId: req.user.id } });
        const services = await prisma.service.findMany({ 
            where: { profileId: profile.id },
            include: { masterService: { include: { category: true } } }
        });
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/astrologers/services:
 *   post:
 *     tags: [Astrologers]
 *     security:
 *       - bearerAuth: []
 */
router.post('/services', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    const { masterServiceId, price, duration, type } = req.body;
    try {
        const profile = await prisma.astrologerProfile.findUnique({ where: { userId: req.user.id } });
        
        // Fetch master service details
        const ms = await prisma.masterService.findUnique({ where: { id: parseInt(masterServiceId) } });
        if (!ms) return res.status(404).json({ error: 'Master service not found' });

        const service = await prisma.service.create({
            data: { 
                profileId: profile.id,
                masterServiceId: ms.id,
                title: ms.name,
                description: ms.description || '',
                price: parseFloat(price),
                duration: parseInt(duration) || 30,
                type: type || 'CHAT'
            },
            include: { masterService: true }
        });
        res.json(service);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/astrologers/services/{id}:
 *   delete:
 *     tags: [Astrologers]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/services/:id', authMiddleware, roleMiddleware(['ASTROLOGER']), async (req, res) => {
    try {
        const profile = await prisma.astrologerProfile.findUnique({ where: { userId: req.user.id } });
        await prisma.service.deleteMany({ where: { id: parseInt(req.params.id), profileId: profile.id } });
        res.json({ message: 'Service deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
