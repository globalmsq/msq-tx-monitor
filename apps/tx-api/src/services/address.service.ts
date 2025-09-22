import { Prisma } from '@msq-tx-monitor/database';
import prisma from '../lib/prisma';
import {
  AddressRanking,
  AddressSearch,
  AddressRankingFilters,
  TopAddressesResponse,
} from '../types/address.types';

import { RedisConnection } from '../cache/redis';

// Database query result interfaces
interface AddressRankingQueryResult {
  address: string;
  total_volume: bigint;
  transaction_count: bigint;
  first_seen: Date;
  last_seen: Date;
  rank: bigint;
}

interface AddressSearchQueryResult {
  address: string;
  total_volume: bigint;
  transaction_count: bigint;
  last_activity: Date;
}

interface AddressStatsQueryResult {
  address: string;
  total_sent: bigint;
  total_received: bigint;
  total_sent_transactions: bigint;
  total_received_transactions: bigint;
  first_transaction_date: Date;
  last_transaction_date: Date;
  token_breakdown: string;
}

interface TokenBreakdownQueryResult {
  tokenSymbol: string;
  sent: bigint;
  received: bigint;
  sent_count: bigint;
  received_count: bigint;
}

export class AddressService {
  /**
   * Get top addresses by volume or frequency
   */
  async getTopAddresses(
    filters: AddressRankingFilters = {},
    limit: number = 50
  ): Promise<TopAddressesResponse> {
    const cacheKey = `top_addresses:${JSON.stringify({ filters, limit })}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for top addresses:', error);
    }

    // Build time period filter
    const { start_date, end_date } = this.getTimePeriod(
      filters.time_period || 'all'
    );

    // Build Prisma where clause
    const where = this.buildPrismaWhereClause(filters, start_date, end_date);

    // Use raw query for complex aggregation across fromAddress and toAddress
    const rankings = await prisma.$queryRaw<AddressRankingQueryResult[]>`
      SELECT
        address,
        SUM(total_volume) as total_volume,
        SUM(transaction_count) as transaction_count,
        MIN(first_seen) as first_seen,
        MAX(last_seen) as last_seen,
        ROW_NUMBER() OVER (ORDER BY SUM(total_volume) DESC) as rank
      FROM (
        SELECT
          fromAddress as address,
          SUM(value) as total_volume,
          COUNT(*) as transaction_count,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen
        FROM transactions
        WHERE ${this.buildSqlWhere(where)}
        GROUP BY fromAddress

        UNION ALL

        SELECT
          toAddress as address,
          SUM(value) as total_volume,
          COUNT(*) as transaction_count,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen
        FROM transactions
        WHERE ${this.buildSqlWhere(where)}
        GROUP BY toAddress
      ) as combined_transactions
      WHERE address IS NOT NULL
      GROUP BY address
      HAVING SUM(total_volume) > ${BigInt(filters.min_volume || '0')}
        AND SUM(transaction_count) >= ${filters.min_transactions || 1}
      ORDER BY total_volume DESC
      LIMIT ${limit}
    `;

    const formattedRankings = rankings.map((row, index) => ({
      address: row.address,
      total_volume: row.total_volume.toString(),
      transaction_count: Number(row.transaction_count),
      first_seen: new Date(row.first_seen),
      last_seen: new Date(row.last_seen),
      rank: index + 1,
    })) as AddressRanking[];

    const response: TopAddressesResponse = {
      data: formattedRankings,
      filters,
      period: {
        start_date,
        end_date,
      },
      timestamp: new Date(),
    };

    // Cache the response for 5 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(response), 300);
    } catch (error) {
      console.warn('Failed to cache top addresses:', error);
    }

    return response;
  }

  /**
   * Search addresses with autocomplete functionality
   */
  async searchAddresses(
    query: string,
    limit: number = 10
  ): Promise<AddressSearch[]> {
    const cacheKey = `address_search:${query}:${limit}`;

    // Try cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for address search:', error);
    }

    // Use raw query for address search across both from and to addresses
    const searchPattern = `${query}%`;
    const results = await prisma.$queryRaw<AddressSearchQueryResult[]>`
      SELECT
        address,
        SUM(total_volume) as total_volume,
        SUM(transaction_count) as transaction_count,
        MAX(last_activity) as last_activity
      FROM (
        SELECT
          fromAddress as address,
          SUM(value) as total_volume,
          COUNT(*) as transaction_count,
          MAX(timestamp) as last_activity
        FROM transactions
        WHERE fromAddress LIKE ${searchPattern}
        GROUP BY fromAddress

        UNION ALL

        SELECT
          toAddress as address,
          SUM(value) as total_volume,
          COUNT(*) as transaction_count,
          MAX(timestamp) as last_activity
        FROM transactions
        WHERE toAddress LIKE ${searchPattern}
        GROUP BY toAddress
      ) as combined_addresses
      WHERE address IS NOT NULL
      GROUP BY address
      ORDER BY transaction_count DESC, total_volume DESC
      LIMIT ${limit}
    `;

    const formattedResults = results.map(row => ({
      address: row.address,
      transaction_count: Number(row.transaction_count),
      total_volume: row.total_volume.toString(),
      last_activity: new Date(row.last_activity),
    })) as AddressSearch[];

    // Cache for 2 minutes
    try {
      await RedisConnection.set(
        cacheKey,
        JSON.stringify(formattedResults),
        120
      );
    } catch (error) {
      console.warn('Failed to cache address search:', error);
    }

    return formattedResults;
  }

  /**
   * Get addresses ranked by frequency (most active)
   */
  async getTopAddressesByFrequency(
    filters: AddressRankingFilters = {},
    limit: number = 50
  ): Promise<TopAddressesResponse> {
    const cacheKey = `top_addresses_frequency:${JSON.stringify({ filters, limit })}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for top addresses by frequency:', error);
    }

    // Build time period filter
    const { start_date, end_date } = this.getTimePeriod(
      filters.time_period || 'all'
    );

    // Build Prisma where clause
    const where = this.buildPrismaWhereClause(filters, start_date, end_date);

    // Use raw query for complex aggregation ordered by frequency
    const rankings = await prisma.$queryRaw<AddressRankingQueryResult[]>`
      SELECT
        address,
        SUM(total_volume) as total_volume,
        SUM(transaction_count) as transaction_count,
        MIN(first_seen) as first_seen,
        MAX(last_seen) as last_seen
      FROM (
        SELECT
          fromAddress as address,
          SUM(value) as total_volume,
          COUNT(*) as transaction_count,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen
        FROM transactions
        WHERE ${this.buildSqlWhere(where)}
        GROUP BY fromAddress

        UNION ALL

        SELECT
          toAddress as address,
          SUM(value) as total_volume,
          COUNT(*) as transaction_count,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen
        FROM transactions
        WHERE ${this.buildSqlWhere(where)}
        GROUP BY toAddress
      ) as combined_transactions
      WHERE address IS NOT NULL
      GROUP BY address
      HAVING SUM(transaction_count) >= ${filters.min_transactions || 1}
        AND SUM(total_volume) > ${BigInt(filters.min_volume || '0')}
      ORDER BY transaction_count DESC, total_volume DESC
      LIMIT ${limit}
    `;

    const formattedRankings = rankings.map((row, index) => ({
      address: row.address,
      total_volume: row.total_volume.toString(),
      transaction_count: Number(row.transaction_count),
      first_seen: new Date(row.first_seen),
      last_seen: new Date(row.last_seen),
      rank: index + 1,
    })) as AddressRanking[];

    const response: TopAddressesResponse = {
      data: formattedRankings,
      filters,
      period: {
        start_date,
        end_date,
      },
      timestamp: new Date(),
    };

    // Cache the response for 5 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(response), 300);
    } catch (error) {
      console.warn('Failed to cache top addresses by frequency:', error);
    }

    return response;
  }

  /**
   * Get detailed statistics for a specific address
   */
  async getAddressStatistics(address: string): Promise<{
    address: string;
    total_transactions: number;
    total_sent: string;
    total_received: string;
    total_volume: string;
    total_sent_transactions: number;
    total_received_transactions: number;
    first_transaction_date: Date | null;
    last_transaction_date: Date | null;
    token_breakdown: Record<
      string,
      {
        sent: string;
        received: string;
        volume: string;
        transaction_count: number;
      }
    >;
    anomaly_statistics: {
      total_anomalies: number;
      avg_anomaly_score: number | null;
      max_anomaly_score: number | null;
    };
    calculation_method: string;
  } | null> {
    const cacheKey = `address_stats:${address}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for address statistics:', error);
    }

    // Check if we have address statistics in the address_statistics table first
    const existingStats = await prisma.addressStatistics.findMany({
      where: { address },
    });

    // Get token information separately
    const tokenAddresses = [
      ...new Set(existingStats.map(stat => stat.tokenAddress)),
    ];
    const addressTokens = await prisma.token.findMany({
      where: { address: { in: tokenAddresses } },
      select: { address: true, symbol: true, name: true, decimals: true },
    });
    const tokenMap = new Map(
      addressTokens.map(token => [token.address, token])
    );

    if (existingStats.length > 0) {
      // Use existing address statistics
      const totalSent = existingStats.reduce(
        (sum, stat) => sum + BigInt(stat.totalSent.toString()),
        BigInt(0)
      );
      const totalReceived = existingStats.reduce(
        (sum, stat) => sum + BigInt(stat.totalReceived.toString()),
        BigInt(0)
      );
      const totalTxSent = existingStats.reduce(
        (sum, stat) => sum + stat.transactionCountSent,
        0
      );
      const totalTxReceived = existingStats.reduce(
        (sum, stat) => sum + stat.transactionCountReceived,
        0
      );

      const tokenBreakdown: {
        [key: string]: {
          sent: string;
          received: string;
          volume: string;
          transaction_count: number;
        };
      } = {};
      existingStats.forEach(stat => {
        const token = tokenMap.get(stat.tokenAddress);
        if (!token) return;

        tokenBreakdown[token.symbol] = {
          sent: stat.totalSent.toString(),
          received: stat.totalReceived.toString(),
          volume: (
            stat.totalSent.toNumber() + stat.totalReceived.toNumber()
          ).toString(),
          transaction_count:
            stat.transactionCountSent + stat.transactionCountReceived,
        };
      });

      // Get anomaly statistics
      const anomalyStats = await prisma.transaction.aggregate({
        where: {
          OR: [{ fromAddress: address }, { toAddress: address }],
          anomalyScore: { gt: 0 },
        },
        _count: true,
        _avg: { anomalyScore: true },
        _max: { anomalyScore: true },
      });

      const totalTransactions = totalTxSent + totalTxReceived;

      const result = {
        address,
        total_transactions: totalTransactions,
        total_sent: totalSent.toString(),
        total_received: totalReceived.toString(),
        total_volume: (totalSent + totalReceived).toString(),
        total_sent_transactions: totalTxSent,
        total_received_transactions: totalTxReceived,
        first_transaction_date: existingStats.reduce(
          (earliest, stat) =>
            stat.firstSeen && (!earliest || stat.firstSeen < earliest)
              ? stat.firstSeen
              : earliest,
          null as Date | null
        ),
        last_transaction_date: existingStats.reduce(
          (latest, stat) =>
            stat.lastSeen && (!latest || stat.lastSeen > latest)
              ? stat.lastSeen
              : latest,
          null as Date | null
        ),
        token_breakdown: tokenBreakdown,
        anomaly_statistics: {
          total_anomalies: anomalyStats._count || 0,
          avg_anomaly_score: Number(anomalyStats._avg.anomalyScore || 0),
          max_anomaly_score: Number(anomalyStats._max.anomalyScore || 0),
          anomaly_rate:
            totalTransactions > 0
              ? (anomalyStats._count || 0) / totalTransactions
              : 0,
        },
        calculation_method: 'cached_aggregation',
        calculated_at: new Date(),
      };

      // Cache for 5 minutes
      try {
        await RedisConnection.set(cacheKey, JSON.stringify(result), 300);
      } catch (error) {
        console.warn('Failed to cache address statistics:', error);
      }

      return result;
    }

    // Fallback: calculate statistics from transaction table directly
    const stats = await prisma.$queryRaw<AddressStatsQueryResult[]>`
      SELECT
        ${address} as address,
        SUM(CASE WHEN fromAddress = ${address} THEN value ELSE 0 END) as total_sent,
        SUM(CASE WHEN toAddress = ${address} THEN value ELSE 0 END) as total_received,
        SUM(CASE WHEN fromAddress = ${address} THEN 1 ELSE 0 END) as total_sent_transactions,
        SUM(CASE WHEN toAddress = ${address} THEN 1 ELSE 0 END) as total_received_transactions,
        MIN(timestamp) as first_transaction_date,
        MAX(timestamp) as last_transaction_date
      FROM transactions
      WHERE fromAddress = ${address} OR toAddress = ${address}
    `;

    if (
      !stats.length ||
      Number(stats[0].total_sent_transactions) +
        Number(stats[0].total_received_transactions) ===
        0
    ) {
      return null;
    }

    const stat = stats[0];
    const totalTransactions =
      Number(stat.total_sent_transactions) +
      Number(stat.total_received_transactions);

    // Get token breakdown
    const tokenBreakdown = await prisma.$queryRaw<TokenBreakdownQueryResult[]>`
      SELECT
        tokenSymbol,
        SUM(CASE WHEN fromAddress = ${address} THEN value ELSE 0 END) as sent,
        SUM(CASE WHEN toAddress = ${address} THEN value ELSE 0 END) as received,
        SUM(CASE WHEN fromAddress = ${address} THEN 1 ELSE 0 END) as sent_count,
        SUM(CASE WHEN toAddress = ${address} THEN 1 ELSE 0 END) as received_count
      FROM transactions
      WHERE fromAddress = ${address} OR toAddress = ${address}
      GROUP BY tokenSymbol
    `;

    const tokenBreakdownMap: {
      [key: string]: {
        sent: string;
        received: string;
        volume: string;
        transaction_count: number;
      };
    } = {};
    tokenBreakdown.forEach(row => {
      tokenBreakdownMap[row.tokenSymbol] = {
        sent: row.sent.toString(),
        received: row.received.toString(),
        volume: (BigInt(row.sent) + BigInt(row.received)).toString(),
        transaction_count: Number(row.sent_count) + Number(row.received_count),
      };
    });

    // Get anomaly statistics
    const anomalyStats = await prisma.transaction.aggregate({
      where: {
        OR: [{ fromAddress: address }, { toAddress: address }],
        anomalyScore: { gt: 0 },
      },
      _count: true,
      _avg: { anomalyScore: true },
      _max: { anomalyScore: true },
    });

    const result = {
      address,
      total_transactions: totalTransactions,
      total_sent: stat.total_sent.toString(),
      total_received: stat.total_received.toString(),
      total_volume: (stat.total_sent + stat.total_received).toString(),
      total_sent_transactions: Number(stat.total_sent_transactions),
      total_received_transactions: Number(stat.total_received_transactions),
      first_transaction_date: stat.first_transaction_date
        ? new Date(stat.first_transaction_date)
        : null,
      last_transaction_date: stat.last_transaction_date
        ? new Date(stat.last_transaction_date)
        : null,
      token_breakdown: tokenBreakdownMap,
      anomaly_statistics: {
        total_anomalies: anomalyStats._count || 0,
        avg_anomaly_score: Number(anomalyStats._avg.anomalyScore || 0),
        max_anomaly_score: Number(anomalyStats._max.anomalyScore || 0),
        anomaly_rate:
          totalTransactions > 0
            ? (anomalyStats._count || 0) / totalTransactions
            : 0,
      },
      calculation_method: 'direct_query',
      calculated_at: new Date(),
    };

    // Cache for 5 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(result), 300);
    } catch (error) {
      console.warn('Failed to cache address statistics:', error);
    }

    return result;
  }

  /**
   * Build Prisma where clause for address filtering
   */
  private buildPrismaWhereClause(
    filters: AddressRankingFilters,
    start_date: Date,
    end_date: Date
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {};

    if (filters.token) {
      where.tokenSymbol = filters.token;
    }

    if (filters.time_period && filters.time_period !== 'all') {
      where.timestamp = {
        gte: start_date,
        lte: end_date,
      };
    }

    return where;
  }

  /**
   * Convert Prisma where clause to SQL string for raw queries
   */
  private buildSqlWhere(where: Prisma.TransactionWhereInput): string {
    const conditions: string[] = [];

    if (where.tokenSymbol) {
      conditions.push(`tokenSymbol = '${where.tokenSymbol}'`);
    }

    if (where.timestamp && typeof where.timestamp === 'object') {
      if ((where.timestamp as { gte?: Date; lte?: Date }).gte) {
        conditions.push(
          `timestamp >= '${(where.timestamp as { gte: Date }).gte.toISOString()}'`
        );
      }
      if ((where.timestamp as { gte?: Date; lte?: Date }).lte) {
        conditions.push(
          `timestamp <= '${(where.timestamp as { lte: Date }).lte.toISOString()}'`
        );
      }
    }

    return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
  }

  /**
   * Get time period dates based on filter
   */
  private getTimePeriod(period: 'day' | 'week' | 'month' | 'all'): {
    start_date: Date;
    end_date: Date;
  } {
    const end_date = new Date();
    let start_date = new Date();

    switch (period) {
      case 'day':
        start_date.setDate(end_date.getDate() - 1);
        break;
      case 'week':
        start_date.setDate(end_date.getDate() - 7);
        break;
      case 'month':
        start_date.setMonth(end_date.getMonth() - 1);
        break;
      case 'all':
      default:
        start_date = new Date('2020-01-01'); // Far back start date
        break;
    }

    return { start_date, end_date };
  }
}
