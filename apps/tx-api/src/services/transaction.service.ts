import { Prisma } from '@msq-tx-monitor/database';
import prisma from '../lib/prisma';
import {
  TransactionFilters,
  PaginationParams,
  TransactionListResponse,
  CursorPaginationParams,
  CursorTransactionListResponse,
  AddressTransactionSummary,
} from '../types/transaction.types';
import { RedisConnection } from '../cache/redis';

// Database query result interfaces
interface TransactionStatsQueryResult {
  total_transactions: number;
  total_sent: string;
  total_received: string;
  first_transaction_date: Date;
  last_transaction_date: Date;
}

interface TokenBreakdownQueryResult {
  tokenSymbol: string;
  sent: string;
  received: string;
  transaction_count: number;
}

interface TransactionWithIncludes {
  id: bigint;
  hash: string;
  blockNumber: bigint;
  transactionIndex: number;
  fromAddress: string;
  toAddress: string;
  value: Prisma.Decimal;
  tokenAddress: string;
  tokenSymbol: string;
  gasUsed: bigint | null;
  gasPrice: bigint | null;
  timestamp: Date;
  anomalyScore: Prisma.Decimal;
  isAnomaly: boolean;
  createdAt: Date;
  updatedAt: Date;
  token?: {
    symbol: string;
    name: string;
    decimals: number;
  };
  anomalies?: Array<{
    id: bigint;
    anomalyType: string;
    severity: string;
    score: Prisma.Decimal;
    description: string | null;
    detectedAt: Date;
  }>;
}

interface TransactionResponse {
  id: number;
  hash: string;
  block_number: number;
  from_address: string;
  to_address: string;
  token_address: string;
  token_symbol: string;
  amount: string;
  amount_raw: string;
  timestamp: Date;
  gas_used?: number;
  gas_price?: string;
  anomaly_score: number;
  anomaly_flags: string[];
  created_at: Date;
  updated_at: Date;
}

export class TransactionService {
  /**
   * Get transactions with filtering and pagination
   */
  async getTransactions(
    filters: TransactionFilters = {},
    pagination: PaginationParams
  ): Promise<TransactionListResponse> {
    const cacheKey = `transactions:${JSON.stringify({ filters, pagination })}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for transactions:', error);
    }

    // Build Prisma where clause
    const where = this.buildPrismaWhereClause(filters);

    // Get total count for pagination
    const total = await prisma.transaction.count({ where });

    // Get paginated results
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      skip: pagination.offset,
      take: pagination.limit,
    });

    // Note: Token information is already included in transaction records
    // Additional token metadata could be fetched here if needed

    const totalPages = Math.ceil(total / pagination.limit);

    const response: TransactionListResponse = {
      data: transactions.map(this.transformTransactionResponse),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
      filters,
    };

    // Cache the response for 60 seconds
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(response), 60);
    } catch (error) {
      console.warn('Failed to cache transactions:', error);
    }

    return response;
  }

  /**
   * Get transactions with cursor-based pagination
   */
  async getTransactionsCursor(
    filters: TransactionFilters = {},
    pagination: CursorPaginationParams
  ): Promise<CursorTransactionListResponse> {
    const cacheKey = `transactions_cursor:${JSON.stringify({ filters, pagination })}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for cursor transactions:', error);
    }

    // Build Prisma where clause
    const where = this.buildPrismaWhereClause(filters);

    // Get total count for initial requests (when no cursor is provided)
    let total: number | undefined;
    if (!pagination.afterId && !pagination.beforeId) {
      total = await prisma.transaction.count({ where });
    }

    // Add cursor conditions
    if (pagination.afterId) {
      where.id = { lt: BigInt(pagination.afterId) };
    } else if (pagination.beforeId) {
      where.id = { gt: BigInt(pagination.beforeId) };
    }

    // Get one extra record to determine if there are more results
    const limit = pagination.limit + 1;

    // Get results with cursor-based ordering
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: [{ id: 'desc' }], // Use ID for consistent cursor ordering
      take: limit,
    });

    // Check if there are more results
    const hasMore = transactions.length > pagination.limit;
    const actualTransactions = hasMore
      ? transactions.slice(0, pagination.limit)
      : transactions;

    // Determine cursor values
    let nextId: number | undefined;
    let prevId: number | undefined;
    let hasPrev = false;

    if (actualTransactions.length > 0) {
      if (pagination.afterId) {
        // Going forward (older records)
        nextId = hasMore ? Number(actualTransactions[actualTransactions.length - 1].id) : undefined;
        prevId = Number(actualTransactions[0].id);
        hasPrev = true;
      } else if (pagination.beforeId) {
        // Going backward (newer records)
        nextId = Number(actualTransactions[actualTransactions.length - 1].id);
        prevId = hasMore ? Number(actualTransactions[0].id) : undefined;
        hasPrev = hasMore;
      } else {
        // Initial request (most recent records)
        nextId = hasMore ? Number(actualTransactions[actualTransactions.length - 1].id) : undefined;
        prevId = undefined;
        hasPrev = false;
      }
    }

    const response: CursorTransactionListResponse = {
      data: actualTransactions.map(this.transformTransactionResponse),
      cursor: {
        limit: pagination.limit,
        hasNext: !!nextId,
        hasPrev,
        nextId,
        prevId,
        total,
      },
      filters,
    };

    // Cache the response for 30 seconds (shorter than offset pagination due to real-time nature)
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(response), 30);
    } catch (error) {
      console.warn('Failed to cache cursor transactions:', error);
    }

    return response;
  }

  /**
   * Get a single transaction by hash
   */
  async getTransactionByHash(
    hash: string
  ): Promise<TransactionResponse | null> {
    const cacheKey = `transaction:${hash}`;

    // Try cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for transaction:', error);
    }

    const transaction = await prisma.transaction.findUnique({
      where: { hash },
    });

    if (!transaction) {
      return null;
    }

    // Note: Token information is already included in transaction record
    // Additional token metadata could be fetched here if needed

    // Note: Anomaly information is already included via isAnomaly and anomalyScore
    // Additional anomaly details could be fetched here if needed

    const result = this.transformTransactionResponse(transaction);

    // Cache for 5 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(result), 300);
    } catch (error) {
      console.warn('Failed to cache transaction:', error);
    }

    return result;
  }

  /**
   * Get transactions for a specific address
   */
  async getTransactionsByAddress(
    address: string,
    filters: TransactionFilters = {},
    pagination: PaginationParams
  ): Promise<TransactionListResponse> {
    const addressFilters = {
      ...filters,
      address_involved: address,
    };

    return this.getTransactions(addressFilters, pagination);
  }

  /**
   * Get address transaction summary
   */
  async getAddressTransactionSummary(
    address: string
  ): Promise<AddressTransactionSummary | null> {
    const cacheKey = `address_summary:${address}`;

    // Try cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for address summary:', error);
    }

    // Get basic transaction stats
    const [transactionStats] = await prisma.$queryRaw<
      TransactionStatsQueryResult[]
    >`
      SELECT
        COUNT(*) as total_transactions,
        SUM(CASE WHEN fromAddress = ${address} THEN value ELSE 0 END) as total_sent,
        SUM(CASE WHEN toAddress = ${address} THEN value ELSE 0 END) as total_received,
        MIN(timestamp) as first_transaction_date,
        MAX(timestamp) as last_transaction_date
      FROM transactions
      WHERE fromAddress = ${address} OR toAddress = ${address}
    `;

    if (!transactionStats || transactionStats.total_transactions === 0) {
      return null;
    }

    // Get token breakdown
    const tokenBreakdown = await prisma.$queryRaw<TokenBreakdownQueryResult[]>`
      SELECT
        tokenSymbol,
        SUM(CASE WHEN fromAddress = ${address} THEN value ELSE 0 END) as sent,
        SUM(CASE WHEN toAddress = ${address} THEN value ELSE 0 END) as received,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE fromAddress = ${address} OR toAddress = ${address}
      GROUP BY tokenSymbol
    `;

    const tokens: {
      [key: string]: {
        sent: string;
        received: string;
        volume: string;
        transaction_count: number;
      };
    } = {};
    tokenBreakdown.forEach(row => {
      tokens[row.tokenSymbol] = {
        sent: row.sent.toString(),
        received: row.received.toString(),
        volume: (BigInt(row.sent) + BigInt(row.received)).toString(),
        transaction_count: Number(row.transaction_count),
      };
    });

    const summary: AddressTransactionSummary = {
      address,
      total_transactions: Number(transactionStats.total_transactions),
      total_sent: transactionStats.total_sent.toString(),
      total_received: transactionStats.total_received.toString(),
      first_transaction_date: new Date(transactionStats.first_transaction_date),
      last_transaction_date: new Date(transactionStats.last_transaction_date),
      tokens,
    };

    // Cache for 2 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(summary), 120);
    } catch (error) {
      console.warn('Failed to cache address summary:', error);
    }

    return summary;
  }

  /**
   * Build Prisma where clause for filtering
   */
  private buildPrismaWhereClause(
    filters: TransactionFilters
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {};

    if (filters.token) {
      where.tokenSymbol = filters.token;
    }

    if (filters.from_address) {
      where.fromAddress = filters.from_address;
    }

    if (filters.to_address) {
      where.toAddress = filters.to_address;
    }

    // Special case for address involved (either from or to)
    if (
      (filters as TransactionFilters & { address_involved?: string })
        .address_involved
    ) {
      where.OR = [
        {
          fromAddress: (
            filters as TransactionFilters & { address_involved: string }
          ).address_involved,
        },
        {
          toAddress: (
            filters as TransactionFilters & { address_involved: string }
          ).address_involved,
        },
      ];
    }

    if (filters.min_amount) {
      if (!where.value) where.value = {};
      (where.value as { gte?: bigint; lte?: bigint }).gte = BigInt(
        filters.min_amount
      );
    }

    if (filters.max_amount) {
      if (!where.value) where.value = {};
      (where.value as { gte?: bigint; lte?: bigint }).lte = BigInt(
        filters.max_amount
      );
    }

    if (filters.start_date) {
      if (!where.timestamp) where.timestamp = {};
      (where.timestamp as { gte?: Date; lte?: Date }).gte = new Date(
        filters.start_date
      );
    }

    if (filters.end_date) {
      if (!where.timestamp) where.timestamp = {};
      (where.timestamp as { gte?: Date; lte?: Date }).lte = new Date(
        filters.end_date
      );
    }

    if (filters.anomaly_threshold !== undefined) {
      where.anomalyScore = {
        gte: filters.anomaly_threshold,
      };
    }

    if (filters.has_anomaly !== undefined) {
      if (filters.has_anomaly) {
        where.isAnomaly = true;
      } else {
        where.isAnomaly = false;
      }
    }

    return where;
  }

  /**
   * Transform Prisma transaction response to match API types
   */
  private transformTransactionResponse(
    transaction: TransactionWithIncludes
  ): TransactionResponse {
    return {
      id: Number(transaction.id),
      hash: transaction.hash,
      block_number: Number(transaction.blockNumber),
      from_address: transaction.fromAddress,
      to_address: transaction.toAddress,
      token_address: transaction.tokenAddress,
      token_symbol: transaction.tokenSymbol,
      amount: transaction.value.toString(),
      amount_raw: transaction.value.toString(),
      timestamp: transaction.timestamp,
      gas_used: transaction.gasUsed ? Number(transaction.gasUsed) : undefined,
      gas_price: transaction.gasPrice
        ? transaction.gasPrice.toString()
        : undefined,
      anomaly_score: Number(transaction.anomalyScore),
      anomaly_flags: transaction.isAnomaly ? ['suspicious_pattern'] : [],
      created_at: transaction.createdAt,
      updated_at: transaction.updatedAt,
    };
  }
}
