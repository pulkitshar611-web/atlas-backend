const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
} else {
    console.error('Cloudinary credentials missing in .env');
}

/**
 * Uploads a base64 image or file path to Cloudinary using binary stream
 * @param {string} fileStr - base64 string or file path
 * @param {string} folder - target folder in Cloudinary
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
const uploadToCloudinary = (fileStr, folder = 'atlas-products') => {
    return new Promise((resolve, reject) => {
        if (!fileStr) return resolve(null);

        // If it's already a URL (e.g. from a previous upload), return it
        if (fileStr.startsWith('http')) return resolve(fileStr);

        let buffer;
        if (fileStr.startsWith('data:')) {
            const b64Data = fileStr.split(',')[1];
            buffer = Buffer.from(b64Data, 'base64');
        } else {
            // Assume it's already a base64 string or local path
            buffer = Buffer.from(fileStr, 'base64');
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return reject(new Error('Image upload failed'));
                }
                resolve(result.secure_url);
            }
        );

        uploadStream.end(buffer);
    });
};

module.exports = {
    cloudinary,
    uploadToCloudinary
};
