import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from './config';
import { logger } from '../utils/logger';

const connectionString = config.database.url;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected via Prisma ORM');
  } catch (error) {
    logger.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect();
  await pool.end();
  logger.info('🔌 Database disconnected');
};

export default prisma;
