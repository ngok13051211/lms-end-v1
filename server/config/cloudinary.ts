import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'homitutor',
  api_key: '259464295597233',
  api_secret: 'ptYzmxwmgdQr0LbODGDv0ovxnZA',
  secure: true
});

export default cloudinary;