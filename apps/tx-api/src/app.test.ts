import request from 'supertest';
import { app } from './app';
import { RedisConnection } from './cache/redis';
import prisma from './lib/prisma';

// Mock database connections
jest.mock('./lib/prisma', () => ({
  $queryRaw: jest.fn(),
}));
jest.mock('./cache/redis');

describe('TX API App', () => {
  beforeEach(() => {
    // Mock successful database connections
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);
    (RedisConnection.testConnection as jest.Mock).mockResolvedValue(true);
    (RedisConnection.getInstance as jest.Mock).mockResolvedValue({
      ping: jest.fn().mockResolvedValue('PONG'),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return healthy status when services are available', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
    });

    it('should return degraded status when services are unavailable', async () => {
      // Mock failed connections
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );
      (RedisConnection.testConnection as jest.Mock).mockResolvedValue(false);

      const response = await request(app).get('/health').expect(503);

      expect(response.body).toHaveProperty('status', 'degraded');
      expect(response.body.services.database.status).toBe('unhealthy');
      expect(response.body.services.redis.status).toBe('unhealthy');
    });
  });

  describe('API Status', () => {
    it('should return API status on /api/v1/status', async () => {
      const response = await request(app).get('/api/v1/status').expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 404);
      expect(response.body.error).toHaveProperty(
        'message',
        'Resource not found'
      );
    });
  });
});
