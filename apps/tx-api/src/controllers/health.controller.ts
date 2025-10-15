import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { RedisConnection } from '../cache/redis';
import { config } from '../config';

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check the health status of the API server and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Service is unhealthy or degraded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
export const healthCheck = async (
  req: Request,
  res: Response
): Promise<void> => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.api.version,
    environment: config.server.env,
    services: {
      database: {
        status: 'unknown',
        responseTime: 0,
      },
      redis: {
        status: 'unknown',
        responseTime: 0,
      },
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  // Test database connection
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database.status = 'healthy';
    health.services.database.responseTime = Date.now() - dbStart;
  } catch (error) {
    health.services.database.status = 'unhealthy';
    health.services.database.responseTime = Date.now() - dbStart;
  }

  // Test Redis connection only if enabled
  const redisStart = Date.now();
  if (config.redis.enabled) {
    try {
      const redisConnected = await RedisConnection.testConnection();
      health.services.redis.status = redisConnected ? 'healthy' : 'unhealthy';
      health.services.redis.responseTime = Date.now() - redisStart;
    } catch (error) {
      health.services.redis.status = 'unhealthy';
      health.services.redis.responseTime = Date.now() - redisStart;
    }
  } else {
    health.services.redis.status = 'disabled';
    health.services.redis.responseTime = 0;
  }

  // Determine overall status
  // Only check Redis health if it's enabled
  const redisHealthy =
    !config.redis.enabled || health.services.redis.status === 'healthy';
  const allServicesHealthy =
    health.services.database.status === 'healthy' && redisHealthy;

  if (!allServicesHealthy) {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
};
