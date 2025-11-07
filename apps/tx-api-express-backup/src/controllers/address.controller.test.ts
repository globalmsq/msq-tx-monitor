import request from 'supertest';
import { app } from '../app';
import { RedisConnection } from '../cache/redis';
import prisma from '../lib/prisma';

// Mock Prisma and Redis
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    addressStatistics: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    transaction: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));
jest.mock('../cache/redis');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG'),
};

describe('Address Controller', () => {
  beforeEach(() => {
    // Clear all mocks first to ensure clean state
    jest.clearAllMocks();

    // Mock Redis connections
    (RedisConnection.testConnection as jest.Mock).mockResolvedValue(true);
    (RedisConnection.getInstance as jest.Mock).mockResolvedValue(mockRedis);
    (RedisConnection.get as jest.Mock).mockResolvedValue(null);
    (RedisConnection.set as jest.Mock).mockResolvedValue(true);

    // Mock Prisma
    mockPrisma.$connect.mockResolvedValue();
    mockPrisma.$disconnect.mockResolvedValue();

    // Mock Prisma methods with defaults
    (mockPrisma.addressStatistics.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.transaction.aggregate as jest.Mock).mockResolvedValue({
      _count: { id: 0 },
      _avg: { anomalyScore: null },
      _max: { anomalyScore: null },
    });
    mockPrisma.$queryRaw.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/addresses/rankings', () => {
    it('should return top addresses by volume', async () => {
      const mockRankings = [
        {
          address: '0x1234567890123456789012345678901234567890',
          total_volume: 1000000000000000000000n,
          transaction_count: 100n,
          first_seen: new Date('2023-01-01T00:00:00.000Z'),
          last_seen: new Date('2023-01-02T00:00:00.000Z'),
          rank: 1n,
        },
      ];

      mockPrisma.$queryRaw.mockResolvedValueOnce(mockRankings);

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
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/v1/addresses/rankings?token=MSQ')
        .expect(200);

      // Verify that Prisma query was called
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should handle time period filtering', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/v1/addresses/rankings?time_period=week')
        .expect(200);

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return 400 for invalid time period', async () => {
      const response = await request(app)
        .get('/api/v1/addresses/rankings?time_period=invalid')
        .expect(400);

      expect(response.body.error.message).toBe('Invalid time_period');
    });

    it('should limit results to maximum allowed', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/v1/addresses/rankings?limit=200')
        .expect(200);

      // Verify Prisma query was called
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/addresses/rankings/frequency', () => {
    it('should return top addresses by frequency', async () => {
      const mockRankings = [
        {
          address: '0x1234567890123456789012345678901234567890',
          total_volume: 500000000000000000000n,
          transaction_count: 500n,
          first_seen: new Date('2023-01-01T00:00:00.000Z'),
          last_seen: new Date('2023-01-02T00:00:00.000Z'),
          rank: 1n,
        },
      ];

      mockPrisma.$queryRaw.mockResolvedValueOnce(mockRankings);

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
          transaction_count: 50n,
          total_volume: 100000000000000000000n,
          last_activity: new Date('2023-01-01T00:00:00.000Z'),
        },
      ];

      mockPrisma.$queryRaw.mockResolvedValueOnce(mockResults);

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
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/v1/addresses/search?q=0x1234&limit=50')
        .expect(200);

      // Verify Prisma query was called
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/addresses/stats/:address', () => {
    it('should return detailed statistics for a valid address', async () => {
      const mockStats = {
        address: '0x1234567890123456789012345678901234567890',
        total_sent: 50000000000000000000n,
        total_received: 75000000000000000000n,
        total_sent_transactions: 60n,
        total_received_transactions: 90n,
        first_transaction_date: new Date('2023-01-01T00:00:00.000Z'),
        last_transaction_date: new Date('2023-01-02T00:00:00.000Z'),
        token_breakdown:
          '{"MSQ":{"sent":"30000000000000000000","received":"40000000000000000000","sent_count":30,"received_count":45}}',
      };

      const mockAnomalyStats = {
        total_anomalies: 5n,
        avg_anomaly_score: 2.5,
        max_anomaly_score: 8.0,
      };

      // Mock the address statistics cache check first (returns empty)
      (
        mockPrisma.addressStatistics.findMany as jest.Mock
      ).mockResolvedValueOnce([]);

      // Mock the Prisma calls - first call returns stats, second returns token breakdown, third returns anomaly stats
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockStats]) // Address stats query
        .mockResolvedValueOnce([]) // Token breakdown query
        .mockResolvedValueOnce([mockAnomalyStats]); // Anomaly aggregate query

      // Mock the transaction aggregate for anomaly stats
      (mockPrisma.transaction.aggregate as jest.Mock).mockResolvedValueOnce({
        _count: { id: 5 },
        _avg: { anomalyScore: 2.5 },
        _max: { anomalyScore: 8.0 },
      });

      const response = await request(app)
        .get(
          '/api/v1/addresses/stats/0x1234567890123456789012345678901234567890'
        )
        .expect(200);

      expect(response.body.data).toHaveProperty('address');
      expect(response.body.data).toHaveProperty('total_transactions');
      expect(response.body.data).toHaveProperty('total_volume');
      expect(response.body.data).toHaveProperty('token_breakdown');
      expect(response.body.data).toHaveProperty('anomaly_statistics');
    });

    it('should return 400 for invalid address format', async () => {
      const response = await request(app)
        .get('/api/v1/addresses/stats/invalid-address')
        .expect(400);

      expect(response.body.error.message).toBe('Invalid address format');
    });
  });
});
