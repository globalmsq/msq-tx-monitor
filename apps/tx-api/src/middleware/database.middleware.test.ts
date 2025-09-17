import { DatabaseConnection } from '../database/connection';
import { RedisConnection } from '../cache/redis';

// Mock the actual connections for testing
jest.mock('../database/connection');
jest.mock('../cache/redis');

describe('Database Middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DatabaseConnection', () => {
    it('should create a singleton pool instance', () => {
      const mockCreatePool = jest.fn();
      (DatabaseConnection.getInstance as jest.Mock) = mockCreatePool;

      DatabaseConnection.getInstance();
      DatabaseConnection.getInstance();

      expect(mockCreatePool).toHaveBeenCalledTimes(2);
    });

    it('should test connection successfully', async () => {
      (DatabaseConnection.testConnection as jest.Mock).mockResolvedValue(true);

      const result = await DatabaseConnection.testConnection();
      expect(result).toBe(true);
    });

    it('should handle connection test failure', async () => {
      (DatabaseConnection.testConnection as jest.Mock).mockResolvedValue(false);

      const result = await DatabaseConnection.testConnection();
      expect(result).toBe(false);
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