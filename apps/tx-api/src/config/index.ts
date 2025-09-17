import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '8000', 10),
    env: process.env.NODE_ENV || 'development'
  },

  api: {
    version: process.env.API_VERSION || 'v1'
  },

  database: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    database: process.env.MYSQL_DATABASE || 'msq_monitor',
    username: process.env.MYSQL_USERNAME || 'msq_user',
    password: process.env.MYSQL_PASSWORD || 'msq_password',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '60000', 10),
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000', 10),
    timeout: parseInt(process.env.DB_TIMEOUT || '5000', 10)
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-Requested-With'
  },

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true'
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRE_IN || '1h',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)
  },

  pagination: {
    defaultLimit: parseInt(process.env.PAGINATION_DEFAULT_LIMIT || '20', 10),
    maxLimit: parseInt(process.env.PAGINATION_MAX_LIMIT || '100', 10)
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },

  healthCheck: {
    endpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health'
  }
};