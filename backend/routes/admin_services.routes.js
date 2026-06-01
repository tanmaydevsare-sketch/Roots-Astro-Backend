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

/**
 * BULK OPERATIONS
 */
router.post('/categories/bulk-delete', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const categoryIds = req.body.ids;
        if (!Array.isArray(categoryIds)) return res.status(400).json({ error: 'ids must be an array' });
        
        await prisma.$transaction(async (tx) => {
            // Get master services under these categories
            const mServices = await tx.masterService.findMany({
                where: { categoryId: { in: categoryIds } },
                select: { id: true }
            });
            const mServiceIds = mServices.map(ms => ms.id);
            
            if (mServiceIds.length > 0) {
                // Nullify Service references to these MasterServices
                await tx.service.updateMany({
                    where: { masterServiceId: { in: mServiceIds } },
                    data: { masterServiceId: null }
                });
                // Delete the MasterServices
                await tx.masterService.deleteMany({
                    where: { id: { in: mServiceIds } }
                });
            }
            
            // Delete the categories
            await tx.serviceCategory.deleteMany({
                where: { id: { in: categoryIds } }
            });
        });
        
        res.json({ message: 'Categories deleted successfully' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/categories/bulk-upload', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const data = req.body.data;
        if (!Array.isArray(data)) return res.status(400).json({ error: 'data must be an array' });
        
        const formatted = data.map(item => ({
            name: item.name ? item.name.trim() : '',
            description: item.description ? item.description.trim() : null,
            active: item.active !== false
        })).filter(item => item.name);

        if (formatted.length === 0) {
            return res.status(400).json({ error: 'No valid categories to import' });
        }

        const result = await prisma.serviceCategory.createMany({
            data: formatted,
            skipDuplicates: true
        });

        res.json({ message: `${result.count} categories imported successfully.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/master-services/bulk-delete', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const serviceIds = req.body.ids;
        if (!Array.isArray(serviceIds)) return res.status(400).json({ error: 'ids must be an array' });
        
        await prisma.$transaction(async (tx) => {
            // Nullify Service references to these MasterServices
            await tx.service.updateMany({
                where: { masterServiceId: { in: serviceIds } },
                data: { masterServiceId: null }
            });
            // Delete the MasterServices
            await tx.masterService.deleteMany({
                where: { id: { in: serviceIds } }
            });
        });
        
        res.json({ message: 'Master services deleted successfully' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/master-services/bulk-upload', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const data = req.body.data;
        if (!Array.isArray(data)) return res.status(400).json({ error: 'data must be an array' });
        
        // Fetch all categories to map name to ID
        const categories = await prisma.serviceCategory.findMany({ select: { id: true, name: true } });
        const catMap = {};
        categories.forEach(c => {
            catMap[c.name.toLowerCase().trim()] = c.id;
        });

        const formatted = [];
        const skipped = [];
        for (const item of data) {
            if (!item.name) continue;
            const catName = item.categoryName ? item.categoryName.toLowerCase().trim() : '';
            const categoryId = catMap[catName];
            
            if (!categoryId) {
                skipped.push({ name: item.name, reason: `Category "${item.categoryName || 'N/A'}" not found.` });
                continue;
            }

            formatted.push({
                name: item.name.trim(),
                description: item.description ? item.description.trim() : null,
                categoryId,
                active: item.active !== false
            });
        }

        if (formatted.length === 0) {
            return res.status(400).json({ 
                error: 'No valid services to import.',
                skipped
            });
        }

        const result = await prisma.masterService.createMany({
            data: formatted,
            skipDuplicates: true
        });

        res.json({ 
            message: `${result.count} services imported successfully.`, 
            skipped 
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/categories/bulk-status', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const { ids, active } = req.body;
        if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
        if (typeof active !== 'boolean') return res.status(400).json({ error: 'active must be a boolean' });

        await prisma.serviceCategory.updateMany({
            where: { id: { in: ids } },
            data: { active }
        });

        res.json({ message: 'Categories status updated successfully' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/master-services/bulk-status', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const { ids, active } = req.body;
        if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
        if (typeof active !== 'boolean') return res.status(400).json({ error: 'active must be a boolean' });

        await prisma.masterService.updateMany({
            where: { id: { in: ids } },
            data: { active }
        });

        res.json({ message: 'Master services status updated successfully' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/master-services/bulk-category', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const { ids, categoryId } = req.body;
        if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
        if (typeof categoryId !== 'number') return res.status(400).json({ error: 'categoryId must be a number' });

        // Ensure category exists
        const categoryExists = await prisma.serviceCategory.findUnique({ where: { id: categoryId } });
        if (!categoryExists) return res.status(404).json({ error: 'Selected category does not exist' });

        await prisma.masterService.updateMany({
            where: { id: { in: ids } },
            data: { categoryId }
        });

        res.json({ message: 'Master services category updated successfully' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;


