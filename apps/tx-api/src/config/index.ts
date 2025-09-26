import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '8000', 10),
    env: process.env.NODE_ENV || 'development',
  },

  api: {
    version: process.env.API_VERSION || 'v1',
  },

  // Database configuration is now handled by @msq-tx-monitor/database library
  // Environment variables: MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USERNAME, MYSQL_PASSWORD

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : ['http://localhost:3000'],
    methods: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders:
      process.env.CORS_ALLOWED_HEADERS || 'Content-Type,X-Requested-With',
  },

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    skipSuccessfulRequests:
      process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
  },

  pagination: {
    defaultLimit: parseInt(process.env.PAGINATION_DEFAULT_LIMIT || '20', 10),
    maxLimit: parseInt(process.env.PAGINATION_MAX_LIMIT || '100', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },

  healthCheck: {
    endpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',
  },
};
