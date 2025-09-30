import 'dotenv/config';
import { createApp } from './app';
import { redisService } from './services/redis.service';
import { config } from './config';
import { logger } from '@msq-tx-monitor/msq-common';

const PORT = config.server.port;
const NODE_ENV = config.server.env;

async function startServer() {
  try {
    // Initialize Redis connection
    await redisService.connect();

    const app = createApp();

    app.listen(PORT, () => {
      logger.info(`🚀 TX Analyzer server running on port ${PORT}`);
      logger.info(`📊 Environment: ${NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`📖 API docs: http://localhost:${PORT}/`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redisService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await redisService.disconnect();
  process.exit(0);
});

startServer();
