import 'dotenv/config';
// import cron from 'node-cron';
import { createApp } from './app.js';
import { redisService } from './services/redis.service.js';
// import { aggregationService } from './services/aggregation.service.js';
import { config } from './config.js';
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

    // Hourly aggregation cron job disabled - using direct queries instead
    // cron.schedule('0 * * * *', async () => {
    //   logger.info('⏰ Running hourly aggregation cron job');
    //   try {
    //     await aggregationService.aggregateLastHour();
    //   } catch (error) {
    //     logger.error('Error in hourly aggregation cron job:', error);
    //   }
    // });

    // logger.info('⏰ Hourly aggregation cron job scheduled');
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
