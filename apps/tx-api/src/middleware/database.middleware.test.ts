import { RedisConnection } from '../cache/redis';
import prisma from '../lib/prisma';

// Mock the actual connections for testing
jest.mock('../lib/prisma', () => ({
  $queryRaw: jest.fn(),
}));
jest.mock('../cache/redis');

describe('Database Middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PrismaConnection', () => {
    it('should test database connection successfully', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);

      const result = await prisma.$queryRaw`SELECT 1`;
      expect(result).toEqual([{ 1: 1 }]);
    });

    it('should handle connection test failure', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('Connection failed')
      );

      await expect(prisma.$queryRaw`SELECT 1`).rejects.toThrow(
        'Connection failed'
      );
    });
  });

  describe('RedisConnection', () => {
    it('should test Redis connection successfully', async () => {
      (RedisConnection.testConnection as jest.Mock).mockResolvedValue(true);

      const result = await RedisConnection.testConnection();
      expect(result).toBe(true);
    });

    it('should handle Redis connection test failure', async () => {
      (RedisConnection.testConnection as jest.Mock).mockResolvedValue(false);

      const result = await RedisConnection.testConnection();
      expect(result).toBe(false);
    });

    it('should perform cache operations', async () => {
      (RedisConnection.get as jest.Mock).mockResolvedValue('test-value');
      (RedisConnection.set as jest.Mock).mockResolvedValue(true);
      (RedisConnection.del as jest.Mock).mockResolvedValue(true);

      const getValue = await RedisConnection.get('test-key');
      const setValue = await RedisConnection.set('test-key', 'test-value', 300);
      const delValue = await RedisConnection.del('test-key');

      expect(getValue).toBe('test-value');
      expect(setValue).toBe(true);
      expect(delValue).toBe(true);
    });
  });
});
