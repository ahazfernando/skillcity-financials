import { v2 as cloudinary } from 'cloudinary';

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dxyojnh09',
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '668775781557975',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'WogpqYld57ANZiVC-eDuFXDLB98',
  secure: true,
});

export const CLOUDINARY_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || 'finance-chat';

export default cloudinary;


