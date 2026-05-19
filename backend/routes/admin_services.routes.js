const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

/**
 * CATEGORIES
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await prisma.serviceCategory.findMany({
            include: { masterServices: true },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/categories', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const category = await prisma.serviceCategory.create({ data: req.body });
        res.status(201).json(category);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.patch('/categories/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const category = await prisma.serviceCategory.update({
            where: { id: parseInt(req.params.id) },
            data: req.body
        });
        res.json(category);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/categories/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        await prisma.serviceCategory.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Category deleted' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

/**
 * MASTER SERVICES
 */
router.get('/master-services', async (req, res) => {
    try {
        const services = await prisma.masterService.findMany({
            include: { category: true },
            orderBy: { name: 'asc' }
        });
        res.json(services);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/master-services', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const service = await prisma.masterService.create({ data: req.body });
        res.status(201).json(service);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.patch('/master-services/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const service = await prisma.masterService.update({
            where: { id: parseInt(req.params.id) },
            data: req.body
        });
        res.json(service);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/master-services/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        await prisma.masterService.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Master service deleted' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
