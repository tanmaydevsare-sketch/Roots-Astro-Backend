const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const prisma = require('./prisma');
const fs = require('fs');
const path = require('path');

/**
 * Storage Utility to handle multi-provider file uploads
 * Supports: Local, AWS S3, Wasabi (S3 Compatible)
 */
class StorageService {
    static async getSettings() {
        return await prisma.globalSettings.findUnique({ where: { id: 1 } });
    }

    static async uploadFile({ file, folder = 'general' }) {
        const settings = await this.getSettings();
        const fileName = `${Date.now()}-${file.originalname}`;
        const key = `${folder}/${fileName}`;

        // Option 1: Cloud Storage (AWS/Wasabi)
        if (settings && (settings.activeStorage === 'aws' || settings.activeStorage === 'wasabi')) {
            const s3Client = new S3Client({
                region: settings.storageRegion || 'us-east-1',
                credentials: {
                    accessKeyId: settings.storageAccessKey,
                    secretAccessKey: settings.storageSecretKey,
                },
                endpoint: settings.storageEndpoint || undefined,
                forcePathStyle: settings.activeStorage === 'wasabi' // Wasabi usually needs this
            });

            try {
                const upload = new Upload({
                    client: s3Client,
                    params: {
                        Bucket: settings.storageBucket,
                        Key: key,
                        Body: file.buffer,
                        ContentType: file.mimetype,
                        // ACL: 'public-read' // Optional: depends on bucket policy
                    },
                });

                await upload.done();
                
                // Construct URL
                // AWS: https://bucket.s3.region.amazonaws.com/key
                // Wasabi: https://bucket.s3.wasabisys.com/key
                let url = '';
                if (settings.activeStorage === 'aws') {
                    url = `https://${settings.storageBucket}.s3.${settings.storageRegion}.amazonaws.com/${key}`;
                } else if (settings.storageEndpoint) {
                    url = `${settings.storageEndpoint.replace(/\/$/, '')}/${settings.storageBucket}/${key}`;
                }
                
                return { url, key, provider: settings.activeStorage };
            } catch (error) {
                console.error('Cloud upload failed:', error);
                throw new Error('Storage upload failed: ' + error.message);
            }
        }

        // Option 2: Local Storage
        const uploadDir = path.join(__dirname, '../uploads', folder);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, file.buffer);
        
        const publicUrl = `/uploads/${folder}/${fileName}`;
        return { url: publicUrl, key, provider: 'local' };
    }
}

module.exports = StorageService;
