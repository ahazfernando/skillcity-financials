import { v2 as cloudinary } from 'cloudinary';

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dh4k9377k',
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '319364232686134',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Z6AeIv-zLqefitc-esk3Xfc84b4',
  secure: true,
});

export const CLOUDINARY_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || 'skillcityfinancialsdb';

export default cloudinary;


