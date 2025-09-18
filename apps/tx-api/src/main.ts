import { app } from './app';
import {
  initializeConnections,
  closeConnections,
} from './middleware/database.middleware';

const port = process.env.PORT || 8000;

async function startServer() {
  try {
    // Initialize database connections
    await initializeConnections();

    // Start the server
    const server = app.listen(port, () => {
      console.log(`🚀 TX API Server is running on port ${port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('📴 SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await closeConnections();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('📴 SIGINT received, shutting down gracefully...');
      server.close(async () => {
        await closeConnections();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
