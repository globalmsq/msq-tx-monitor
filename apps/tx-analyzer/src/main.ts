import 'dotenv/config';
import { redisService } from './services/redis.service';
import { logger } from '@msq-tx-monitor/msq-common';

/**
 * TX Analyzer - Service Layer Only
 *
 * Note: HTTP API functionality has been migrated to tx-api service.
 * This service now provides only analytics and analysis logic that can be
 * imported and used by other services.
 *
 * If you need to run background jobs or cron tasks, add them here.
 */

async function initializeService() {
  try {
    // Initialize Redis connection for caching
    await redisService.connect();

    logger.info('✅ TX Analyzer service initialized');
    logger.info('📊 Service logic available for import by other services');
    logger.info('ℹ️  HTTP API endpoints have been migrated to tx-api');

    // Add any background jobs or cron tasks here if needed
    // Example:
    // cron.schedule('0 * * * *', async () => {
    //   logger.info('Running hourly analytics aggregation');
    //   await analyticsService.aggregateLastHour();
    // });

  } catch (error) {
    logger.error('Failed to initialize service:', error);
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

// Only initialize if running directly (not imported as module)
if (require.main === module) {
  initializeService();
}
