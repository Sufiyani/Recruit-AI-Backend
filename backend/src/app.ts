import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

import authRoutes from './routes/v1/auth.routes';
import jobRoutes from './routes/v1/job.routes';
import applicationRoutes from './routes/v1/application.routes';
import interviewRoutes from './routes/v1/interview.routes';
import candidateRoutes from './routes/v1/candidate.routes';
import miscRoutes from './routes/v1/misc.routes';

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: config.env === 'development' ? 1000 : 20,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'development' ? 5000 : 200,
});

app.use('/api/v1/auth', authLimiter);
app.use('/api', generalLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) },
}));

// ─── Static Files (uploads) ───────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Swagger API Docs ─────────────────────────────────────────────────────────
const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Recruitment SaaS API',
      version: '1.0.0',
      description: 'Production-ready API for AI Recruitment & Interview Automation SaaS (Phase 1)',
    },
    servers: [{ url: `/api/v1`, description: 'API v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/v1/*.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Recruit SaaS API Docs',
}));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1', miscRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.env,
  });
});

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
