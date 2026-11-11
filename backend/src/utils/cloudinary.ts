import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/config';
import { logger } from './logger';

const isCloudinaryConfigured = Boolean(
  config.cloudinary.cloudName &&
  config.cloudinary.apiKey &&
  config.cloudinary.apiSecret
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  logger.info('Cloudinary initialized for file storage');
} else {
  logger.info('Cloudinary credentials missing — using local disk storage fallback');
}

export { isCloudinaryConfigured };

export async function uploadToCloudinary(filePath: string, folder: string = 'resumes'): Promise<string | null> {
  if (!isCloudinaryConfigured) return null;
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `recruit_ai/${folder}`,
      resource_type: 'auto',
    });
    return result.secure_url;
  } catch (error) {
    logger.error('Cloudinary upload error:', error);
    return null;
  }
}
