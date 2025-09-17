import { Request, Response, NextFunction } from 'express';
import { DatabaseConnection } from '../database/connection';
import { RedisConnection } from '../cache/redis';

// Extend Request type to include database connection
declare global {
  namespace Express {
    interface Request {
      db: import('mysql2/promise').Pool;
      redis: import('redis').RedisClientType;
    }
  }
}

export const databaseMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Add database pool to request object
    req.db = DatabaseConnection.getInstance();

    // Add Redis client to request object
    req.redis = await RedisConnection.getInstance();

    next();
  } catch (error) {
    console.error('❌ Database middleware error:', error);
    res.status(503).json({
      error: {
        code: 503,
        message: 'Database service unavailable',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const initializeConnections = async (): Promise<void> => {
  console.log('🔄 Initializing database connections...');

  try {
    // Test database connection
    const dbConnected = await DatabaseConnection.testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to MySQL database');
    }

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
    await DatabaseConnection.closeConnection();
    await RedisConnection.closeConnection();
    console.log('✅ Database connections closed successfully');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};