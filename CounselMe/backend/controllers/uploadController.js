const https = require('https');
const cloudinary = require('../utils/cloudinary');

const uploadImage = async (req, res) => {
    console.log('Upload request received. File:', req.file);
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Upload to cloudinary
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'alloteme/uploads', resource_type: 'auto' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        res.json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id
        });
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
};

const viewPdf = async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).send('URL is required');

        // Only allow streaming secure Cloudinary resource URLs
        if (!url.startsWith('https://res.cloudinary.com/')) {
            return res.status(403).send('Forbidden: Only Cloudinary secure URLs are allowed');
        }

        // Helper to parse Cloudinary URL
        const parseCloudinaryUrl = (urlStr) => {
            try {
                const parsed = new URL(urlStr);
                const parts = parsed.pathname.split('/').filter(Boolean);
                
                if (parts.length < 4) return null;
                
                const cloudName = parts[0];
                const resourceType = parts[1];
                const type = parts[2];
                
                let publicIdParts = parts.slice(3);
                
                // Remove version if present
                if (publicIdParts[0] && /^v\d+$/.test(publicIdParts[0])) {
                    publicIdParts = publicIdParts.slice(1);
                } else if (publicIdParts[1] && /^v\d+$/.test(publicIdParts[1])) {
                    publicIdParts = publicIdParts.slice(2);
                }
                
                const fullPath = publicIdParts.join('/');
                const lastDotIndex = fullPath.lastIndexOf('.');
                if (lastDotIndex === -1) return null;
                
                const publicId = fullPath.substring(0, lastDotIndex);
                const format = fullPath.substring(lastDotIndex + 1);
                
                return { cloudName, resourceType, type, publicId, format };
            } catch (e) {
                console.error('Error parsing Cloudinary URL:', e);
                return null;
            }
        };

        const parsedResult = parseCloudinaryUrl(url);
        let targetUrl = url;

        if (parsedResult) {
            // Generate authenticated private download URL using Cloudinary SDK
            targetUrl = cloudinary.utils.private_download_url(parsedResult.publicId, parsedResult.format, {
                resource_type: parsedResult.resourceType,
                type: parsedResult.type
            });
            console.log('Streaming authenticated PDF from Cloudinary API:', targetUrl);
        } else {
            console.log('Could not parse Cloudinary URL, attempting direct stream:', url);
        }

        https.get(targetUrl, (stream) => {
            if (stream.statusCode !== 200) {
                console.error(`Cloudinary stream error: Status ${stream.statusCode}`);
                res.status(stream.statusCode).send('Failed to fetch from Cloudinary');
                return;
            }
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
            stream.pipe(res);
        }).on('error', (err) => {
            console.error('HTTPS stream error:', err);
            res.status(500).send('Failed to stream PDF');
        });
    } catch (error) {
        console.error('PDF fetch error:', error);
        res.status(500).send('Failed to load PDF document');
    }
};

module.exports = { uploadImage, viewPdf };
