import { app } from './app';
import {
  initializeConnections,
  closeConnections,
} from './middleware/database.middleware';
import { logger } from '@msq-tx-monitor/msq-common';

const port = process.env.PORT || 8000;

async function startServer() {
  try {
    // Initialize database connections
    await initializeConnections();

    // Start the server
    const server = app.listen(port, () => {
      logger.info(`🚀 TX API Server is running on port ${port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('📴 SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await closeConnections();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('📴 SIGINT received, shutting down gracefully...');
      server.close(async () => {
        await closeConnections();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.fatal('❌ Failed to start server', error);
    process.exit(1);
  }
}

startServer();
