import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  database: {
    url: process.env.DATABASE_URL as string,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    path: process.env.UPLOAD_PATH || './uploads',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@recruit.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456',
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  n8n: {
    webhookInterviewScheduled:
      process.env.N8N_WEBHOOK_INTERVIEW_SCHEDULED || 'http://localhost:5678/webhook/interview-scheduled',
    webhookInterviewDecision:
      process.env.N8N_INTERVIEW_DECISION_URL || '',
  },
};
