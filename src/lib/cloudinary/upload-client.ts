/**
 * Client-side Cloudinary upload utilities
 * This file is safe to import in client components as it doesn't use the Node.js SDK
 */

export interface UploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

/**
 * Get Cloudinary configuration from environment variables (client-safe)
 */
function getCloudinaryConfig() {
  return {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dxyojnh09',
    preset: process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || 'finance-chat',
  };
}

/**
 * Upload a file to Cloudinary using unsigned upload with preset
 * @param file - The file to upload
 * @param folder - Optional folder path in Cloudinary
 * @returns Promise with upload result containing URL and metadata
 */
export async function uploadToCloudinary(
  file: File,
  folder?: string
): Promise<UploadResult> {
  try {
    const { cloudName, preset } = getCloudinaryConfig();
    
    // Create form data for unsigned upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);
    
    if (folder) {
      formData.append('folder', folder);
    }

    // Upload to Cloudinary using unsigned upload
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();

    return {
      url: data.url,
      publicId: data.public_id,
      secureUrl: data.secure_url,
      format: data.format,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
}

/**
 * Upload an image file to Cloudinary
 * @param file - The image file to upload
 * @param folder - Optional folder path
 * @returns Promise with upload result
 */
export async function uploadImage(
  file: File,
  folder?: string
): Promise<UploadResult> {
  // Validate it's an image
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  return uploadToCloudinary(file, folder);
}

/**
 * Get optimized image URL with transformations
 * @param publicId - The public ID of the image
 * @param options - Transformation options
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  }
): string {
  const { cloudName } = getCloudinaryConfig();
  const transformations: string[] = [];
  
  if (options?.width) transformations.push(`w_${options.width}`);
  if (options?.height) transformations.push(`h_${options.height}`);
  if (options?.quality) transformations.push(`q_${options.quality}`);
  if (options?.format) transformations.push(`f_${options.format}`);

  const transformString = transformations.length > 0 
    ? transformations.join(',') + '/' 
    : '';

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}${publicId}`;
}








