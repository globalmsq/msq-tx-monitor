import { Request, Response, NextFunction } from 'express';
import { RedisConnection } from '../cache/redis';
import prisma from '../lib/prisma';

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
    console.error('❌ Database middleware error:', error);
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
  console.log('🔄 Initializing database connections...');

  try {
    // Test Prisma database connection
    await prisma.$connect();
    console.log('✅ Prisma database connection established');

    // Test database with a simple query
    await prisma.token.findFirst();
    console.log('✅ Database query test successful');

    // Test Redis connection
    const redisConnected = await RedisConnection.testConnection();
    if (!redisConnected) {
      console.warn('⚠️  Redis connection failed - caching will be disabled');
    }

    console.log('✅ Database connections initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database connections:', error);
    throw error;
  }
};

export const closeConnections = async (): Promise<void> => {
  console.log('🔄 Closing database connections...');

  try {
    await prisma.$disconnect();
    await RedisConnection.closeConnection();
    console.log('✅ Database connections closed successfully');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};
