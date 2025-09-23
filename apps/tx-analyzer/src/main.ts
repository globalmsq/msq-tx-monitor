import 'dotenv/config';
import { createApp } from './app';
import { redisService } from './services/redis.service';
import { config } from './config';

const PORT = config.server.port;
const NODE_ENV = config.server.env;

async function startServer() {
  try {
    // Initialize Redis connection
    await redisService.connect();

    const app = createApp();

    app.listen(PORT, () => {
      console.log(`🚀 TX Analyzer server running on port ${PORT}`);
      console.log(`📊 Environment: ${NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📖 API docs: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await redisService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await redisService.disconnect();
  process.exit(0);
});

startServer();
