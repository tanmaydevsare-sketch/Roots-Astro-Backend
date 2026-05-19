const express = require('express');
const router = express.Router();
const multer = require('multer');
const StorageService = require('../config/storage');
const { authMiddleware } = require('../middleware/auth');

// Multer setup - memory storage for easy cloud pipe
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

/**
 * @swagger
 * /api/upload:
 *   post:
 *     tags: [Upload]
 *     summary: Upload a file to active storage (Local/Cloud)
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const folder = req.body.folder || 'general';
        const result = await StorageService.uploadFile({ 
            file: req.file, 
            folder 
        });

        res.json({
            message: 'Upload successful',
            url: result.url,
            key: result.key,
            provider: result.provider
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
