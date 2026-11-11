import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/auth';
import {
  registerCompanySchema, loginSchema, candidateRegisterSchema, refreshTokenSchema
} from '../../validators/auth.validator';

const router = Router();

/**
 * @swagger
 * /auth/register-company:
 *   post:
 *     summary: Register a new company and admin user
 *     tags: [Auth]
 */
router.post('/register-company', validate(registerCompanySchema), authController.registerCompany);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register as a candidate
 *     tags: [Auth]
 */
router.post('/register', validate(candidateRegisterSchema), authController.registerCandidate);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 */
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Auth]
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/me', authenticate, authController.getMe as any);

export default router;
