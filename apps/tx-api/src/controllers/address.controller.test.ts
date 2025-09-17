import request from 'supertest';
import { app } from '../app';
import { DatabaseConnection } from '../database/connection';
import { RedisConnection } from '../cache/redis';

// Mock database connections
jest.mock('../database/connection');
jest.mock('../cache/redis');

const mockDb = {
  execute: jest.fn()
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG')
};

describe('Address Controller', () => {
  beforeEach(() => {
    // Mock successful database connections
    (DatabaseConnection.testConnection as jest.Mock).mockResolvedValue(true);
    (RedisConnection.testConnection as jest.Mock).mockResolvedValue(true);
    (RedisConnection.getInstance as jest.Mock).mockResolvedValue(mockRedis);
    (RedisConnection.get as jest.Mock).mockResolvedValue(null);
    (RedisConnection.set as jest.Mock).mockResolvedValue(true);

    // Mock database instance
    (DatabaseConnection.getInstance as jest.Mock).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/addresses/rankings', () => {
    it('should return top addresses by volume', async () => {
      const mockRankings = [
        {
          address: '0x1234567890123456789012345678901234567890',
          total_volume: '1000000000000000000000',
          transaction_count: 100,
          first_seen: '2023-01-01T00:00:00.000Z',
          last_seen: '2023-01-02T00:00:00.000Z'
        }
      ];

      mockDb.execute.mockResolvedValueOnce([mockRankings]);

      const response = await request(app)
        .get('/api/v1/addresses/rankings')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('filters');
      expect(response.body).toHaveProperty('period');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('rank', 1);
    });

    it('should handle filtering by token', async () => {
      mockDb.execute.mockResolvedValueOnce([[]]);

      await request(app)
        .get('/api/v1/addresses/rankings?token=MSQ')
        .expect(200);

      // Verify that the query includes token filter
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('token_symbol = ?'),
        expect.arrayContaining(['MSQ'])
      );
    });

    it('should handle time period filtering', async () => {
      mockDb.execute.mockResolvedValueOnce([[]]);

      await request(app)
        .get('/api/v1/addresses/rankings?time_period=week')
        .expect(200);

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should return 400 for invalid time period', async () => {
      const response = await request(app)
        .get('/api/v1/addresses/rankings?time_period=invalid')
        .expect(400);

      expect(response.body.error.message).toBe('Invalid time_period');
    });

    it('should limit results to maximum allowed', async () => {
      mockDb.execute.mockResolvedValueOnce([[]]);

      await request(app)
        .get('/api/v1/addresses/rankings?limit=200')
        .expect(200);

      // Verify limit is capped at 100
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([100])
      );
    });
  });

  describe('GET /api/v1/addresses/rankings/frequency', () => {
    it('should return top addresses by frequency', async () => {
      const mockRankings = [
        {
          address: '0x1234567890123456789012345678901234567890',
          total_volume: '500000000000000000000',
          transaction_count: 500,
          first_seen: '2023-01-01T00:00:00.000Z',
          last_seen: '2023-01-02T00:00:00.000Z'
        }
      ];

      mockDb.execute.mockResolvedValueOnce([mockRankings]);

      const response = await request(app)
        .get('/api/v1/addresses/rankings/frequency')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('transaction_count', 500);
    });

    it('should validate time_period parameter', async () => {
      const response = await request(app)
        .get('/api/v1/addresses/rankings/frequency?time_period=invalid')
        .expect(400);

      expect(response.body.error.message).toBe('Invalid time_period');
    });
  });

  describe('GET /api/v1/addresses/search', () => {
    it('should search addresses with valid query', async () => {
      const mockResults = [
        {
          address: '0x1234567890123456789012345678901234567890',
          transaction_count: 50,
          total_volume: '100000000000000000000',
          last_activity: '2023-01-01T00:00:00.000Z'
        }
      ];

      mockDb.execute.mockResolvedValueOnce([mockResults]);

      const response = await request(app)
        .get('/api/v1/addresses/search?q=0x1234')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('query', '0x1234');
      expect(response.body.data).toHaveLength(1);
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .get('/api/v1/addresses/search')
        .expect(400);

      expect(response.body.error.message).toBe('Missing search query');
    });

    it('should return 400 for invalid address format', async () => {
      const response = await request(app)
        .get('/api/v1/addresses/search?q=invalid')
        .expect(400);

      expect(response.body.error.message).toBe('Invalid address format');
    });

    it('should return 400 for query too short', async () => {
      const response = await request(app)
        .get('/api/v1/addresses/search?q=0x12')
        .expect(400);

      expect(response.body.error.message).toBe('Query too short');
    });

    it('should limit search results', async () => {
      mockDb.execute.mockResolvedValueOnce([[]]);

      await request(app)
        .get('/api/v1/addresses/search?q=0x1234&limit=50')
        .expect(200);

      // Verify limit is capped at 20 for search
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([20])
      );
    });
  });
});