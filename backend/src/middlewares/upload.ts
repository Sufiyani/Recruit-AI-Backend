import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/config';
import { AppError } from '../utils/errors';

const uploadDir = config.upload.path;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const resumeDir = path.join(uploadDir, 'resumes');
const avatarDir = path.join(uploadDir, 'avatars');
const logoDir = path.join(uploadDir, 'logos');

[resumeDir, avatarDir, logoDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function createStorage(subDir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(uploadDir, subDir));
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });
}

export const resumeUpload = multer({
  storage: createStorage('resumes'),
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF and Word documents are allowed for resumes', 400));
    }
  },
});

export const avatarUpload = multer({
  storage: createStorage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed', 400));
    }
  },
});

export const logoUpload = multer({
  storage: createStorage('logos'),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed', 400));
    }
  },
});
