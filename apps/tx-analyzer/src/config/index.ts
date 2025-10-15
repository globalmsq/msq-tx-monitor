export const config = {
  server: {
    port: parseInt(process.env.PORT || '8002', 10),
    env: process.env.NODE_ENV || 'development',
  },

  // Database configuration is handled by @msq-tx-monitor/database library
  // Environment variables: MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USERNAME, MYSQL_PASSWORD

  redis: {
    enabled: process.env.REDIS_ENABLED !== 'false', // Default: true
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
};
