import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.CHAIN_SCANNER_PORT || '8001', 10),
    env: process.env.NODE_ENV || 'development',
  },

  blockchain: {
    primary: {
      endpoint: process.env.PRIMARY_RPC_ENDPOINT!,
      timeout: parseInt(process.env.RPC_TIMEOUT || '10000', 10),
    },
    backup: {
      endpoint: process.env.BACKUP_RPC_ENDPOINT!,
      timeout: parseInt(process.env.RPC_TIMEOUT || '10000', 10),
    },
    reconnectInterval: parseInt(
      process.env.RPC_RECONNECT_INTERVAL || '5000',
      10
    ),
    maxReconnectAttempts: parseInt(
      process.env.RPC_MAX_RECONNECT_ATTEMPTS || '10',
      10
    ),
  },

  database: {
    // Database configuration is handled by @msq-tx-monitor/database library
    // Environment variables: MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USERNAME, MYSQL_PASSWORD
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'msq:',
    ttl: {
      // TTL values in seconds
      addressStats: parseInt(process.env.CACHE_TTL_ADDRESS_STATS || '300', 10), // 5 minutes
      whaleAddresses: parseInt(
        process.env.CACHE_TTL_WHALE_ADDRESSES || '600',
        10
      ), // 10 minutes
      riskyAddresses: parseInt(
        process.env.CACHE_TTL_RISKY_ADDRESSES || '600',
        10
      ), // 10 minutes
      rankings: parseInt(process.env.CACHE_TTL_RANKINGS || '60', 10), // 1 minute
      summary: parseInt(process.env.CACHE_TTL_SUMMARY || '30', 10), // 30 seconds
    },
  },

  monitoring: {
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
    processingInterval: parseInt(process.env.PROCESSING_INTERVAL || '1000', 10),
    confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS || '12', 10),
    ignoreZeroValueTransfers:
      process.env.IGNORE_ZERO_VALUE_TRANSFERS !== 'false',
    blockPollingInterval: parseInt(
      process.env.BLOCK_POLLING_INTERVAL || '10000',
      10
    ),
    requestDelay: parseInt(process.env.REQUEST_DELAY || '500', 10),
  },

  websocket: {
    port: parseInt(process.env.WS_SERVER_PORT || '8001', 10),
    heartbeatInterval: parseInt(
      process.env.WS_HEARTBEAT_INTERVAL || '30000',
      10
    ),
    maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '100', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableBlockchainLogs: process.env.ENABLE_BLOCKCHAIN_LOGS === 'true',
    enableDatabaseLogs: process.env.ENABLE_DATABASE_LOGS === 'true',
  },

  security: {
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};
