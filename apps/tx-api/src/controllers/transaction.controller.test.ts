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
    transaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
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

describe('Transaction Controller', () => {
  beforeEach(() => {
    // Mock Redis connections
    (RedisConnection.testConnection as jest.Mock).mockResolvedValue(true);
    (RedisConnection.getInstance as jest.Mock).mockResolvedValue(mockRedis);
    (RedisConnection.get as jest.Mock).mockResolvedValue(null);
    (RedisConnection.set as jest.Mock).mockResolvedValue(true);

    // Mock Prisma
    mockPrisma.$connect.mockResolvedValue();
    mockPrisma.$disconnect.mockResolvedValue();

    // Mock Prisma methods with default empty responses
    (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.transaction.count as jest.Mock).mockResolvedValue(0);
    mockPrisma.$queryRaw.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/transactions', () => {
    it('should return paginated transactions list', async () => {
      const mockTransactions = [
        {
          id: 1n,
          hash: '0x123...',
          blockNumber: 123456n,
          fromAddress: '0xabc...',
          toAddress: '0xdef...',
          tokenSymbol: 'MSQ',
          value: 1000000000000000000n,
          timestamp: new Date('2023-01-01T00:00:00.000Z'),
          anomalyScore: 0,
          isAnomaly: false,
          createdAt: new Date('2023-01-01T00:00:00.000Z'),
          updatedAt: new Date('2023-01-01T00:00:00.000Z'),
          token: {
            symbol: 'MSQ',
            name: 'MSQ Token',
            decimals: 18,
          },
        },
      ];

      // Mock count and findMany queries
      (mockPrisma.transaction.count as jest.Mock).mockResolvedValueOnce(1);
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValueOnce(
        mockTransactions
      );

      const response = await request(app)
        .get('/api/v1/transactions')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total', 1);
      expect(response.body.pagination).toHaveProperty('page', 1);
    });

    it('should handle pagination parameters', async () => {
      (mockPrisma.transaction.count as jest.Mock).mockResolvedValueOnce(50);
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/v1/transactions?page=2&limit=10')
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should handle filtering by token', async () => {
      (mockPrisma.transaction.count as jest.Mock).mockResolvedValueOnce(0);
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValueOnce([]);

      await request(app).get('/api/v1/transactions?token=MSQ').expect(200);

      // Verify that Prisma findMany was called
      expect(mockPrisma.transaction.findMany).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/transactions/:hash', () => {
    it('should return transaction by valid hash', async () => {
      const mockTransaction = {
        id: 1,
        hash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        block_number: 123456,
        from_address: '0x1234567890123456789012345678901234567890',
        to_address: '0x0987654321098765432109876543210987654321',
        token_symbol: 'MSQ',
        amount: '1000000000000000000',
        timestamp: '2023-01-01T00:00:00.000Z',
        anomaly_score: 0,
        anomaly_flags: '[]',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      (mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockTransaction,
        id: 1n,
        blockNumber: 123456n,
        fromAddress: mockTransaction.from_address,
        toAddress: mockTransaction.to_address,
        tokenSymbol: mockTransaction.token_symbol,
        value: 1000000000000000000n,
        timestamp: new Date(mockTransaction.timestamp),
        anomalyScore: mockTransaction.anomaly_score,
        isAnomaly: false,
        createdAt: new Date(mockTransaction.created_at),
        updatedAt: new Date(mockTransaction.updated_at),
        token: { symbol: 'MSQ', name: 'MSQ Token', decimals: 18 },
        anomalies: [],
      });

      const response = await request(app)
        .get(
          '/api/v1/transactions/0x1234567890123456789012345678901234567890123456789012345678901234'
        )
        .expect(200);

      expect(response.body.data).toHaveProperty('hash', mockTransaction.hash);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return 400 for invalid hash format', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/invalid-hash')
        .expect(400);

      expect(response.body.error.message).toBe(
        'Invalid transaction hash format'
      );
    });

    it('should return 404 for non-existent transaction', async () => {
      (mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValueOnce(
        null
      );

      const response = await request(app)
        .get(
          '/api/v1/transactions/0x1234567890123456789012345678901234567890123456789012345678901234'
        )
        .expect(404);

      expect(response.body.error.message).toBe('Transaction not found');
    });
  });

  describe('GET /api/v1/transactions/address/:address', () => {
    it('should return transactions for valid address', async () => {
      (mockPrisma.transaction.count as jest.Mock).mockResolvedValueOnce(1);
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValueOnce([]);

      const response = await request(app)
        .get(
          '/api/v1/transactions/address/0x1234567890123456789012345678901234567890'
        )
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should return 400 for invalid address format', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/address/invalid-address')
        .expect(400);

      expect(response.body.error.message).toBe('Invalid address format');
    });
  });

  describe('GET /api/v1/transactions/address/:address/summary', () => {
    it('should return address summary for valid address', async () => {
      const mockSummary = {
        address: '0x1234567890123456789012345678901234567890',
        total_transactions: 10,
        total_sent: '5000000000000000000',
        total_received: '3000000000000000000',
        first_transaction_date: '2023-01-01T00:00:00.000Z',
        last_transaction_date: '2023-01-02T00:00:00.000Z',
      };

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockSummary])
        .mockResolvedValueOnce([]);

      const response = await request(app)
        .get(
          '/api/v1/transactions/address/0x1234567890123456789012345678901234567890/summary'
        )
        .expect(200);

      expect(response.body.data).toHaveProperty('address');
      expect(response.body.data).toHaveProperty('total_transactions');
    });

    it('should return 404 for address with no transactions', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const response = await request(app)
        .get(
          '/api/v1/transactions/address/0x1234567890123456789012345678901234567890/summary'
        )
        .expect(404);

      expect(response.body.error.message).toBe(
        'No transactions found for address'
      );
    });
  });
});
