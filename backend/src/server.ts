import { config } from './config/config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';
import app from './app';

async function bootstrap() {
  try {
    await connectDatabase();

    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on http://localhost:${config.port}`);
      logger.info(`📚 API Docs: http://localhost:${config.port}/api/docs`);
      logger.info(`🌍 Environment: ${config.env}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Server shut down.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
