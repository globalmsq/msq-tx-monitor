import { Request, Response, NextFunction } from 'express';
import { RedisConnection } from '../cache/redis';
import prisma from '../lib/prisma';
import { logger } from '@msq-tx-monitor/msq-common';

// Extend Request type to include database connection
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      redis: import('redis').RedisClientType;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export const databaseMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Add Redis client to request object
    req.redis = await RedisConnection.getInstance();

    next();
  } catch (error) {
    logger.error('❌ Database middleware error:', error);
    res.status(503).json({
      error: {
        code: 503,
        message: 'Database service unavailable',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

export const initializeConnections = async (): Promise<void> => {
  logger.info('🔄 Initializing database connections...');

  try {
    // Test Prisma database connection
    await prisma.$connect();
    logger.info('✅ Prisma database connection established');

    // Test database with a simple query
    await prisma.token.findFirst();
    logger.info('✅ Database query test successful');

    // Test Redis connection
    const redisConnected = await RedisConnection.testConnection();
    if (!redisConnected) {
      logger.warn('⚠️  Redis connection failed - caching will be disabled');
    }

    logger.info('✅ Database connections initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize database connections:', error);
    throw error;
  }
};

export const closeConnections = async (): Promise<void> => {
  logger.info('🔄 Closing database connections...');

  try {
    await prisma.$disconnect();
    await RedisConnection.closeConnection();
    logger.info('✅ Database connections closed successfully');
  } catch (error) {
    logger.error('❌ Error closing database connections:', error);
  }
};
