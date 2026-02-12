require('dotenv').config();
const { uploadToCloudinary } = require('./src/utils/cloudinary');

async function test() {
    try {
        console.log('Testing Cloudinary upload...');
        console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);

        // Tiny black pixel in base64
        const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        const url = await uploadToCloudinary(base64Image);
        console.log('Upload Successful! URL:', url);
    } catch (error) {
        console.error('Upload Failed:', error);
    }
}

test();
