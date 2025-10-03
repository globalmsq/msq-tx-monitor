import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import {
  AddressRanking,
  AddressSearch,
  AddressRankingFilters,
  TopAddressesResponse,
  AddressProfile,
  AddressStatisticsDetail,
  AddressListResponse,
  BehavioralCategory,
} from '../types/address.types';

import { RedisConnection } from '../cache/redis';
import { apiLogger } from '@msq-tx-monitor/msq-common';

// Database query result interfaces
interface AddressRankingQueryResult {
  address: string;
  total_volume: bigint;
  total_sent: bigint;
  total_received: bigint;
  transaction_count: bigint;
  first_seen: Date;
  last_seen: Date;
  address_rank: bigint;
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
   * Known token addresses mapping (for quick lookup)
   */
  private readonly KNOWN_TOKENS: Record<
    string,
    { address: string; symbol: string; decimals: number; name: string }
  > = {
    MSQ: {
      address: '0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499',
      symbol: 'MSQ',
      decimals: 18,
      name: 'MSQUARE',
    },
    KWT: {
      address: '0x435001Af7fC65B621B0043df99810B2f30860c5d',
      symbol: 'KWT',
      decimals: 6,
      name: 'Korean Won Token',
    },
    SUT: {
      address: '0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55',
      symbol: 'SUT',
      decimals: 18,
      name: 'SUPER TRUST',
    },
    P2UC: {
      address: '0x8B3C6ff5911392dECB5B08611822280dEe0E4f64',
      symbol: 'P2UC',
      decimals: 18,
      name: 'Point to You Coin',
    },
  };

  /**
   * Convert token symbol to token address
   */
  private async getTokenAddress(
    tokenSymbol?: string
  ): Promise<string | undefined> {
    if (!tokenSymbol) return undefined;

    // Check known tokens first (fast path)
    if (this.KNOWN_TOKENS[tokenSymbol.toUpperCase()]) {
      return this.KNOWN_TOKENS[tokenSymbol.toUpperCase()].address;
    }

    // Fallback to database lookup
    const token = await prisma.token.findFirst({
      where: { symbol: tokenSymbol },
      select: { address: true },
    });

    return token?.address;
  }

  /**
   * Get top addresses by volume or frequency
   */
  async getTopAddresses(
    filters: AddressRankingFilters = {},
    limit: number = 50,
    hours?: number
  ): Promise<TopAddressesResponse> {
    const cacheKey = `top_addresses:${JSON.stringify({ filters, limit, hours })}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      apiLogger.warn('Cache miss for top addresses', error);
    }

    // Build time period filter - prioritize hours over time_period
    let start_date: Date;
    let end_date: Date;

    if (hours !== undefined) {
      // Use hours-based filtering
      end_date = new Date();
      start_date = new Date(Date.now() - hours * 60 * 60 * 1000);
    } else {
      // Fallback to time_period-based filtering
      const period = this.getTimePeriod(filters.time_period || 'all');
      start_date = period.start_date;
      end_date = period.end_date;
    }

    // Build Prisma where clause
    const where = this.buildPrismaWhereClause(filters, start_date, end_date);

    // Use raw query for complex aggregation across fromAddress and toAddress
    const rankings = await prisma.$queryRaw<AddressRankingQueryResult[]>`
      SELECT
        address,
        SUM(total_volume) as total_volume,
        SUM(total_sent) as total_sent,
        SUM(total_received) as total_received,
        SUM(transaction_count) as transaction_count,
        MIN(first_seen) as first_seen,
        MAX(last_seen) as last_seen,
        ROW_NUMBER() OVER (ORDER BY SUM(total_volume) DESC) as address_rank
      FROM (
        SELECT
          fromAddress as address,
          SUM(value) as total_volume,
          SUM(value) as total_sent,
          0 as total_received,
          COUNT(*) as transaction_count,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen
        FROM transactions
        WHERE ${Prisma.raw(this.buildSqlWhere(where))}
        GROUP BY fromAddress

        UNION ALL

        SELECT
          toAddress as address,
          SUM(value) as total_volume,
          0 as total_sent,
          SUM(value) as total_received,
          COUNT(*) as transaction_count,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen
        FROM transactions
        WHERE ${Prisma.raw(this.buildSqlWhere(where))}
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
      total_sent: row.total_sent.toString(),
      total_received: row.total_received.toString(),
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
      apiLogger.warn('Failed to cache top addresses', error);
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
      apiLogger.warn('Cache miss for address search', error);
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
      apiLogger.warn('Failed to cache address search', error);
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
      apiLogger.warn('Cache miss for top addresses by frequency', error);
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
        SUM(total_sent) as total_sent,
        SUM(total_received) as total_received,
        SUM(transaction_count) as transaction_count,
        MIN(first_seen) as first_seen,
        MAX(last_seen) as last_seen,
        ROW_NUMBER() OVER (ORDER BY SUM(transaction_count) DESC, SUM(total_volume) DESC) as address_rank
      FROM (
        SELECT
          fromAddress as address,
          SUM(value) as total_volume,
          SUM(value) as total_sent,
          0 as total_received,
          COUNT(*) as transaction_count,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen
        FROM transactions
        WHERE ${Prisma.raw(this.buildSqlWhere(where))}
        GROUP BY fromAddress

        UNION ALL

        SELECT
          toAddress as address,
          SUM(value) as total_volume,
          0 as total_sent,
          SUM(value) as total_received,
          COUNT(*) as transaction_count,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen
        FROM transactions
        WHERE ${Prisma.raw(this.buildSqlWhere(where))}
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
      total_sent: row.total_sent.toString(),
      total_received: row.total_received.toString(),
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
      apiLogger.warn('Failed to cache top addresses by frequency', error);
    }

    return response;
  }

  /**
   * Get detailed statistics for a specific address
   * @param address - The address to get statistics for
   * @param hours - Optional time range in hours to filter transactions
   */
  async getAddressStatistics(
    address: string,
    hours?: number,
    tokenSymbol?: string
  ): Promise<{
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
    const cacheKey = `address_stats:${address}:${hours || 'all'}:${tokenSymbol || 'all'}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      apiLogger.warn('Cache miss for address statistics', error);
    }

    // Check if we have address statistics in the address_statistics table first
    // Skip address_statistics table if hours is provided (it doesn't support time filtering)
    const existingStats = hours
      ? []
      : await prisma.addressStatistics.findMany({
          where: { address },
        });

    // Get token information - tokenAddress in addressStatistics might not match tokens table
    // So we'll create a map from known token addresses
    const knownTokens: Record<
      string,
      { symbol: string; decimals: number; name: string }
    > = {
      '0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499': {
        symbol: 'MSQ',
        decimals: 18,
        name: 'MSQUARE',
      },
      '0x435001Af7fC65B621B0043df99810B2f30860c5d': {
        symbol: 'KWT',
        decimals: 6,
        name: 'Korean Won Token',
      },
      '0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55': {
        symbol: 'SUT',
        decimals: 18,
        name: 'SUPER TRUST',
      },
      '0x8B3C6ff5911392dECB5B08611822280dEe0E4f64': {
        symbol: 'P2UC',
        decimals: 18,
        name: 'Point to You Coin',
      },
    };

    // Try to get from database first, fallback to known tokens
    const tokenAddresses = [
      ...new Set(existingStats.map(stat => stat.tokenAddress)),
    ];
    const addressTokens = await prisma.token.findMany({
      where: { address: { in: tokenAddresses } },
      select: { address: true, symbol: true, name: true, decimals: true },
    });

    // Create token map with fallback to known tokens
    const tokenMap = new Map();
    tokenAddresses.forEach(addr => {
      const dbToken = addressTokens.find(
        t => t.address.toLowerCase() === addr.toLowerCase()
      );
      if (dbToken) {
        tokenMap.set(addr, dbToken);
      } else if (knownTokens[addr]) {
        tokenMap.set(addr, { address: addr, ...knownTokens[addr] });
      }
    });

    if (existingStats.length > 0) {
      // Use existing address statistics
      const totalSent = existingStats.reduce(
        (sum, stat) => sum + BigInt(stat.totalSent.toFixed(0)),
        BigInt(0)
      );
      const totalReceived = existingStats.reduce(
        (sum, stat) => sum + BigInt(stat.totalReceived.toFixed(0)),
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
            BigInt(stat.totalSent.toFixed(0)) +
            BigInt(stat.totalReceived.toFixed(0))
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
        apiLogger.warn('Failed to cache address statistics', error);
      }

      return result;
    }

    // Fallback: calculate statistics from transaction table directly
    // Get token address from symbol if provided (consistent with Analytics API)
    let tokenAddress: string | undefined;
    if (tokenSymbol) {
      const token = await prisma.token.findFirst({
        where: { symbol: tokenSymbol },
        select: { address: true },
      });
      tokenAddress = token?.address;
      if (!tokenAddress) {
        apiLogger.warn(
          `Token not found for symbol: ${tokenSymbol} in getAddressStatistics`
        );
        return null;
      }
    }

    // Build time filter if hours is provided
    const cutoffDate = hours
      ? new Date(Date.now() - hours * 60 * 60 * 1000)
      : null;

    const statsQuery = cutoffDate
      ? `
        SELECT
          '${address}' as address,
          CAST(SUM(CASE WHEN fromAddress = '${address}' THEN value ELSE 0 END) AS CHAR) as total_sent,
          CAST(SUM(CASE WHEN toAddress = '${address}' THEN value ELSE 0 END) AS CHAR) as total_received,
          SUM(CASE WHEN fromAddress = '${address}' THEN 1 ELSE 0 END) as total_sent_transactions,
          SUM(CASE WHEN toAddress = '${address}' THEN 1 ELSE 0 END) as total_received_transactions,
          MIN(timestamp) as first_transaction_date,
          MAX(timestamp) as last_transaction_date
        FROM transactions
        WHERE (fromAddress = '${address}' OR toAddress = '${address}')
          AND timestamp >= '${cutoffDate.toISOString()}'
          ${tokenAddress ? `AND tokenAddress = '${tokenAddress}'` : ''}
      `
      : `
        SELECT
          '${address}' as address,
          CAST(SUM(CASE WHEN fromAddress = '${address}' THEN value ELSE 0 END) AS CHAR) as total_sent,
          CAST(SUM(CASE WHEN toAddress = '${address}' THEN value ELSE 0 END) AS CHAR) as total_received,
          SUM(CASE WHEN fromAddress = '${address}' THEN 1 ELSE 0 END) as total_sent_transactions,
          SUM(CASE WHEN toAddress = '${address}' THEN 1 ELSE 0 END) as total_received_transactions,
          MIN(timestamp) as first_transaction_date,
          MAX(timestamp) as last_transaction_date
        FROM transactions
        WHERE (fromAddress = '${address}' OR toAddress = '${address}')
          ${tokenAddress ? `AND tokenAddress = '${tokenAddress}'` : ''}
      `;

    const stats =
      await prisma.$queryRawUnsafe<AddressStatsQueryResult[]>(statsQuery);

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
    const tokenBreakdownQuery = cutoffDate
      ? `
        SELECT
          tokenSymbol,
          CAST(SUM(CASE WHEN fromAddress = '${address}' THEN value ELSE 0 END) AS CHAR) as sent,
          CAST(SUM(CASE WHEN toAddress = '${address}' THEN value ELSE 0 END) AS CHAR) as received,
          SUM(CASE WHEN fromAddress = '${address}' THEN 1 ELSE 0 END) as sent_count,
          SUM(CASE WHEN toAddress = '${address}' THEN 1 ELSE 0 END) as received_count
        FROM transactions
        WHERE (fromAddress = '${address}' OR toAddress = '${address}')
          AND timestamp >= '${cutoffDate.toISOString()}'
          ${tokenAddress ? `AND tokenAddress = '${tokenAddress}'` : ''}
        GROUP BY tokenSymbol
      `
      : `
        SELECT
          tokenSymbol,
          CAST(SUM(CASE WHEN fromAddress = '${address}' THEN value ELSE 0 END) AS CHAR) as sent,
          CAST(SUM(CASE WHEN toAddress = '${address}' THEN value ELSE 0 END) AS CHAR) as received,
          SUM(CASE WHEN fromAddress = '${address}' THEN 1 ELSE 0 END) as sent_count,
          SUM(CASE WHEN toAddress = '${address}' THEN 1 ELSE 0 END) as received_count
        FROM transactions
        WHERE (fromAddress = '${address}' OR toAddress = '${address}')
          ${tokenAddress ? `AND tokenAddress = '${tokenAddress}'` : ''}
        GROUP BY tokenSymbol
      `;

    const tokenBreakdown =
      await prisma.$queryRawUnsafe<TokenBreakdownQueryResult[]>(
        tokenBreakdownQuery
      );

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
    const anomalyWhere: any = {
      OR: [{ fromAddress: address }, { toAddress: address }],
      anomalyScore: { gt: 0 },
    };

    if (hours) {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      anomalyWhere.timestamp = { gte: cutoffDate };
    }

    if (tokenSymbol) {
      anomalyWhere.tokenSymbol = tokenSymbol;
    }

    const anomalyStats = await prisma.transaction.aggregate({
      where: anomalyWhere,
      _count: true,
      _avg: { anomalyScore: true },
      _max: { anomalyScore: true },
    });

    const result = {
      address,
      total_transactions: totalTransactions,
      total_sent: stat.total_sent.toString(),
      total_received: stat.total_received.toString(),
      total_volume: (
        BigInt(stat.total_sent) + BigInt(stat.total_received)
      ).toString(),
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
      apiLogger.warn('Failed to cache address statistics', error);
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

    // Apply timestamp filter if time_period is specified OR if dates are meaningful
    if (filters.time_period && filters.time_period !== 'all') {
      where.timestamp = {
        gte: start_date,
        lte: end_date,
      };
    } else if (
      start_date &&
      end_date &&
      start_date.getTime() !== end_date.getTime()
    ) {
      // Also apply filter if start_date and end_date are different (hours parameter was provided)
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

  /**
   * Get detailed behavioral profile for a specific address
   */
  async getAddressProfile(
    address: string,
    tokenAddress?: string
  ): Promise<AddressProfile | null> {
    const cacheKey = `address_profile:${address}:${tokenAddress || 'all'}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      apiLogger.warn('Cache miss for address profile', error);
    }

    // Get address statistics from the AddressStatistics table
    const whereClause = tokenAddress ? { address, tokenAddress } : { address };

    const addressStats = await prisma.addressStatistics.findMany({
      where: whereClause,
      orderBy: [{ totalSent: 'desc' }, { totalReceived: 'desc' }],
    });

    if (addressStats.length === 0) {
      return null;
    }

    // Calculate composite statistics across all tokens for this address
    const totalVolume = addressStats.reduce(
      (sum, stat) =>
        sum +
        BigInt(stat.totalSent.toFixed(0)) +
        BigInt(stat.totalReceived.toFixed(0)),
      BigInt(0)
    );

    const totalTransactions = addressStats.reduce(
      (sum, stat) =>
        sum + stat.transactionCountSent + stat.transactionCountReceived,
      0
    );

    const primaryStat = addressStats[0]; // Use the highest volume token for primary analysis

    // Calculate percentile scores
    const volumeScore = await this.calculateVolumePercentile(
      Number(totalVolume)
    );
    const frequencyScore =
      await this.calculateFrequencyPercentile(totalTransactions);

    // Calculate recency score
    const daysSinceLastActivity = primaryStat.lastSeen
      ? Math.floor(
          (Date.now() - primaryStat.lastSeen.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;
    const recencyScore = Math.max(0, 100 - daysSinceLastActivity);

    // Use stored diversity score
    const diversityScore = Number(primaryStat.diversityScore) * 100;

    // Calculate composite score with standard weights
    const compositeScore =
      volumeScore * 0.4 +
      frequencyScore * 0.3 +
      recencyScore * 0.2 +
      diversityScore * 0.1;

    // Determine behavioral category
    const category: BehavioralCategory = {
      whale: volumeScore >= 99, // Top 1%
      activeTrader: totalTransactions >= 50,
      dormantAccount: daysSinceLastActivity >= 30,
      suspiciousPattern: Number(primaryStat.riskScore) >= 0.8,
      highRisk: Number(primaryStat.riskScore) >= 0.7,
    };

    // Generate label
    let label = '👤 Regular';
    if (category.whale) label = '🐋 Whale';
    else if (category.suspiciousPattern) label = '⚠️ Suspicious';
    else if (category.highRisk) label = '🚨 High Risk';
    else if (category.activeTrader) label = '⚡ Active Trader';
    else if (category.dormantAccount) label = '😴 Dormant';

    const daysSinceFirstSeen = primaryStat.firstSeen
      ? Math.floor(
          (Date.now() - primaryStat.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;

    // Calculate rank based on composite score
    const rank = await this.calculateAddressRank(compositeScore, tokenAddress);

    const profile: AddressProfile = {
      address,
      tokenAddress,
      rank,
      percentile: volumeScore,
      category,
      scores: {
        volume: volumeScore,
        frequency: frequencyScore,
        recency: recencyScore,
        diversity: diversityScore,
        composite: compositeScore,
      },
      label,
      metadata: {
        totalVolume: totalVolume.toString(),
        transactionCount: totalTransactions,
        lastActivity: primaryStat.lastSeen || new Date(0),
        daysSinceFirstSeen,
      },
    };

    // Cache for 5 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(profile), 300);
    } catch (error) {
      apiLogger.warn('Failed to cache address profile', error);
    }

    return profile;
  }

  /**
   * Get whale addresses (top 1% by volume)
   */
  async getWhaleAddresses(
    tokenAddress?: string,
    tokenSymbol?: string,
    limit: number = 50,
    hours?: number
  ): Promise<AddressListResponse<AddressProfile>> {
    // Convert token symbol to address if provided
    const resolvedTokenAddress =
      tokenAddress || (await this.getTokenAddress(tokenSymbol));

    const cacheKey = `whale_addresses:${resolvedTokenAddress || 'all'}:${limit}:${hours || 'all'}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      apiLogger.warn('Cache miss for whale addresses', error);
    }

    // Build where clause with time filtering if hours is provided
    const whereClause: any = resolvedTokenAddress
      ? { tokenAddress: resolvedTokenAddress, isWhale: true }
      : { isWhale: true };

    // Add time-based filtering if hours is provided
    if (hours !== undefined) {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      whereClause.lastSeen = { gte: cutoffDate };
    }

    const whaleStats = await prisma.addressStatistics.findMany({
      where: whereClause,
      orderBy: [{ totalSent: 'desc' }, { totalReceived: 'desc' }],
      take: limit,
    });

    const profiles: AddressProfile[] = await Promise.all(
      whaleStats.map(async (stat, index) => {
        const totalVolume =
          BigInt(stat.totalSent.toFixed(0)) +
          BigInt(stat.totalReceived.toFixed(0));
        const totalTransactions =
          stat.transactionCountSent + stat.transactionCountReceived;

        const daysSinceLastActivity = stat.lastSeen
          ? Math.floor(
              (Date.now() - stat.lastSeen.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 999;

        const category: BehavioralCategory = {
          whale: true,
          activeTrader: totalTransactions >= 50,
          dormantAccount: daysSinceLastActivity >= 30,
          suspiciousPattern: Number(stat.riskScore) >= 0.8,
          highRisk: Number(stat.riskScore) >= 0.7,
        };

        const daysSinceFirstSeen = stat.firstSeen
          ? Math.floor(
              (Date.now() - stat.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        return {
          address: stat.address,
          tokenAddress: stat.tokenAddress,
          rank: index + 1,
          percentile: 99, // All whales are in top 1%
          category,
          scores: {
            volume: 99,
            frequency: Number(stat.velocityScore) * 100,
            recency: Math.max(0, 100 - daysSinceLastActivity),
            diversity: Number(stat.diversityScore) * 100,
            composite: 95, // High composite for whales
          },
          label: '🐋 Whale',
          metadata: {
            totalVolume: totalVolume.toString(),
            transactionCount: totalTransactions,
            lastActivity: stat.lastSeen || new Date(0),
            daysSinceFirstSeen,
          },
        };
      })
    );

    const response: AddressListResponse<AddressProfile> = {
      data: profiles,
      filters: {
        tokenAddress: resolvedTokenAddress,
        limit,
        hours,
      },
      timestamp: new Date(),
    };

    // Cache for 10 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(response), 600);
    } catch (error) {
      apiLogger.warn('Failed to cache whale addresses', error);
    }

    return response;
  }

  /**
   * Get active trader addresses (high frequency)
   */
  async getActiveTraders(
    tokenAddress?: string,
    tokenSymbol?: string,
    limit: number = 50,
    minTransactions: number = 50,
    hours?: number
  ): Promise<AddressListResponse<AddressProfile>> {
    // Convert token symbol to address if provided
    const resolvedTokenAddress =
      tokenAddress || (await this.getTokenAddress(tokenSymbol));

    const cacheKey = `active_traders:${resolvedTokenAddress || 'all'}:${limit}:${minTransactions}:${hours || 'all'}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      apiLogger.warn('Cache miss for active traders', error);
    }

    // Build where clause
    const whereClause: any = {
      ...(resolvedTokenAddress && { tokenAddress: resolvedTokenAddress }),
      OR: [
        { transactionCountSent: { gte: minTransactions } },
        { transactionCountReceived: { gte: minTransactions } },
      ],
      isActive: true,
    };

    // Add time-based filtering if hours is provided
    if (hours !== undefined) {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      whereClause.lastSeen = { gte: cutoffDate };
    }

    const activeTraders = await prisma.addressStatistics.findMany({
      where: whereClause,
      orderBy: [
        { velocityScore: 'desc' },
        { transactionCountSent: 'desc' },
        { transactionCountReceived: 'desc' },
      ],
      take: limit,
    });

    const profiles: AddressProfile[] = await Promise.all(
      activeTraders.map(async (stat, index) => {
        const totalVolume =
          BigInt(stat.totalSent.toFixed(0)) +
          BigInt(stat.totalReceived.toFixed(0));
        const totalTransactions =
          stat.transactionCountSent + stat.transactionCountReceived;

        const daysSinceLastActivity = stat.lastSeen
          ? Math.floor(
              (Date.now() - stat.lastSeen.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 999;

        const category: BehavioralCategory = {
          whale: stat.isWhale,
          activeTrader: true,
          dormantAccount: daysSinceLastActivity >= 30,
          suspiciousPattern: Number(stat.riskScore) >= 0.8,
          highRisk: Number(stat.riskScore) >= 0.7,
        };

        const daysSinceFirstSeen = stat.firstSeen
          ? Math.floor(
              (Date.now() - stat.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        return {
          address: stat.address,
          tokenAddress: stat.tokenAddress,
          rank: index + 1,
          percentile: Math.max(80, Number(stat.velocityScore) * 100), // Active traders are high percentile
          category,
          scores: {
            volume: await this.calculateVolumePercentile(Number(totalVolume)),
            frequency: Number(stat.velocityScore) * 100,
            recency: Math.max(0, 100 - daysSinceLastActivity),
            diversity: Number(stat.diversityScore) * 100,
            composite: Number(stat.velocityScore) * 90, // Weight heavily on velocity for active traders
          },
          label: '⚡ Active Trader',
          metadata: {
            totalVolume: totalVolume.toString(),
            transactionCount: totalTransactions,
            lastActivity: stat.lastSeen || new Date(0),
            daysSinceFirstSeen,
          },
        };
      })
    );

    const response: AddressListResponse<AddressProfile> = {
      data: profiles,
      filters: {
        tokenAddress: resolvedTokenAddress,
        limit,
        minTransactions,
        hours,
      },
      timestamp: new Date(),
    };

    // Cache for 10 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(response), 600);
    } catch (error) {
      apiLogger.warn('Failed to cache active traders', error);
    }

    return response;
  }

  /**
   * Get suspicious addresses (high risk score)
   */
  async getSuspiciousAddresses(
    tokenAddress?: string,
    tokenSymbol?: string,
    limit: number = 50,
    minRiskScore: number = 0.7,
    hours?: number
  ): Promise<AddressListResponse<AddressProfile>> {
    // Convert token symbol to address if provided
    const resolvedTokenAddress =
      tokenAddress || (await this.getTokenAddress(tokenSymbol));

    const cacheKey = `suspicious_addresses:${resolvedTokenAddress || 'all'}:${limit}:${minRiskScore}:${hours || 'all'}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      apiLogger.warn('Cache miss for suspicious addresses', error);
    }

    // Build where clause
    const whereClause: any = {
      ...(resolvedTokenAddress && { tokenAddress: resolvedTokenAddress }),
      OR: [{ riskScore: { gte: minRiskScore } }, { isSuspicious: true }],
    };

    // Add time-based filtering if hours is provided
    if (hours !== undefined) {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      whereClause.lastSeen = { gte: cutoffDate };
    }

    const suspiciousAddresses = await prisma.addressStatistics.findMany({
      where: whereClause,
      orderBy: [
        { riskScore: 'desc' },
        { totalSent: 'desc' },
        { totalReceived: 'desc' },
      ],
      take: limit,
    });

    const profiles: AddressProfile[] = await Promise.all(
      suspiciousAddresses.map(async (stat, index) => {
        const totalVolume =
          BigInt(stat.totalSent.toFixed(0)) +
          BigInt(stat.totalReceived.toFixed(0));
        const totalTransactions =
          stat.transactionCountSent + stat.transactionCountReceived;

        const daysSinceLastActivity = stat.lastSeen
          ? Math.floor(
              (Date.now() - stat.lastSeen.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 999;

        const riskScore = Number(stat.riskScore);
        const category: BehavioralCategory = {
          whale: stat.isWhale,
          activeTrader: totalTransactions >= 50,
          dormantAccount: daysSinceLastActivity >= 30,
          suspiciousPattern: riskScore >= 0.8,
          highRisk: riskScore >= 0.7,
        };

        const daysSinceFirstSeen = stat.firstSeen
          ? Math.floor(
              (Date.now() - stat.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        let label = '🚨 High Risk';
        if (category.suspiciousPattern) label = '⚠️ Suspicious';

        return {
          address: stat.address,
          tokenAddress: stat.tokenAddress,
          rank: index + 1,
          percentile: riskScore * 100, // Risk score as percentile
          category,
          scores: {
            volume: await this.calculateVolumePercentile(Number(totalVolume)),
            frequency: Number(stat.velocityScore) * 100,
            recency: Math.max(0, 100 - daysSinceLastActivity),
            diversity: Number(stat.diversityScore) * 100,
            composite: riskScore * 100, // Risk score drives composite for suspicious addresses
          },
          label,
          metadata: {
            totalVolume: totalVolume.toString(),
            transactionCount: totalTransactions,
            lastActivity: stat.lastSeen || new Date(0),
            daysSinceFirstSeen,
          },
        };
      })
    );

    const response: AddressListResponse<AddressProfile> = {
      data: profiles,
      filters: {
        tokenAddress: resolvedTokenAddress,
        limit,
        minRiskScore,
        hours,
      },
      timestamp: new Date(),
    };

    // Cache for 5 minutes (shorter cache for suspicious addresses)
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(response), 300);
    } catch (error) {
      apiLogger.warn('Failed to cache suspicious addresses', error);
    }

    return response;
  }

  /**
   * Get detailed address statistics from AddressStatistics table
   */
  async getAddressStatisticsDetail(
    address: string,
    tokenAddress?: string
  ): Promise<AddressStatisticsDetail[]> {
    const cacheKey = `address_stats_detail:${address}:${tokenAddress || 'all'}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      apiLogger.warn('Cache miss for address statistics detail', error);
    }

    const whereClause = tokenAddress ? { address, tokenAddress } : { address };

    const stats = await prisma.addressStatistics.findMany({
      where: whereClause,
      orderBy: [{ totalSent: 'desc' }, { totalReceived: 'desc' }],
    });

    const detailedStats: AddressStatisticsDetail[] = stats.map(stat => ({
      address: stat.address,
      tokenAddress: stat.tokenAddress,
      totalSent: stat.totalSent.toString(),
      totalReceived: stat.totalReceived.toString(),
      transactionCountSent: stat.transactionCountSent,
      transactionCountReceived: stat.transactionCountReceived,
      firstSeen: stat.firstSeen,
      lastSeen: stat.lastSeen,
      avgTransactionSize: stat.avgTransactionSize.toString(),
      avgTransactionSizeSent: stat.avgTransactionSizeSent.toString(),
      avgTransactionSizeReceived: stat.avgTransactionSizeReceived.toString(),
      maxTransactionSize: stat.maxTransactionSize.toString(),
      maxTransactionSizeSent: stat.maxTransactionSizeSent.toString(),
      maxTransactionSizeReceived: stat.maxTransactionSizeReceived.toString(),
      riskScore: stat.riskScore.toString(),
      isWhale: stat.isWhale,
      isSuspicious: stat.isSuspicious,
      isActive: stat.isActive,
      behavioralFlags: stat.behavioralFlags as Record<string, unknown> | null,
      lastActivityType: stat.lastActivityType,
      addressLabel: stat.addressLabel,
      dormancyPeriod: stat.dormancyPeriod,
      velocityScore: stat.velocityScore.toString(),
      diversityScore: stat.diversityScore.toString(),
    }));

    // Cache for 5 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(detailedStats), 300);
    } catch (error) {
      apiLogger.warn('Failed to cache address statistics detail', error);
    }

    return detailedStats;
  }

  // Helper methods for percentile calculations
  private async calculateVolumePercentile(volume: number): Promise<number> {
    try {
      const result = await prisma.$queryRaw<[{ percentile: number }]>`
        SELECT
          (COUNT(CASE WHEN (totalSent + totalReceived) <= ${volume} THEN 1 END) * 100.0 / COUNT(*)) as percentile
        FROM address_statistics
      `;
      return Math.min(100, Math.max(0, result[0]?.percentile || 0));
    } catch (error) {
      apiLogger.warn('Failed to calculate volume percentile', error);
      return 50; // Default to median
    }
  }

  private async calculateFrequencyPercentile(
    transactions: number
  ): Promise<number> {
    try {
      const result = await prisma.$queryRaw<[{ percentile: number }]>`
        SELECT
          (COUNT(CASE WHEN (transactionCountSent + transactionCountReceived) <= ${transactions} THEN 1 END) * 100.0 / COUNT(*)) as percentile
        FROM address_statistics
      `;
      return Math.min(100, Math.max(0, result[0]?.percentile || 0));
    } catch (error) {
      apiLogger.warn('Failed to calculate frequency percentile', error);
      return 50; // Default to median
    }
  }

  private async calculateAddressRank(
    compositeScore: number,
    tokenAddress?: string
  ): Promise<number> {
    try {
      if (tokenAddress) {
        const result = await prisma.$queryRaw<[{ rank: number }]>`
          SELECT
            (COUNT(*) + 1) as rank
          FROM address_statistics
          WHERE tokenAddress = ${tokenAddress}
          AND (
            (totalSent + totalReceived) * 0.4 +
            velocityScore * 30 +
            diversityScore * 10
          ) > ${compositeScore}
        `;
        return result[0]?.rank || 1;
      } else {
        const result = await prisma.$queryRaw<[{ rank: number }]>`
          SELECT
            (COUNT(*) + 1) as rank
          FROM address_statistics
          WHERE (
            (totalSent + totalReceived) * 0.4 +
            velocityScore * 30 +
            diversityScore * 10
          ) > ${compositeScore}
        `;
        return result[0]?.rank || 1;
      }
    } catch (error) {
      apiLogger.warn('Failed to calculate address rank', error);
      return 1; // Default to top rank
    }
  }

  /**
   * Get address transaction trends over time
   * Returns hourly or daily aggregated transaction data for an address
   */
  async getAddressTrends(
    address: string,
    hours?: number,
    tokenSymbol?: string,
    interval: 'hourly' | 'daily' = 'hourly'
  ): Promise<{
    trends: Array<{
      timestamp: string;
      transactionCount: number;
      volume: string;
      sentCount: number;
      receivedCount: number;
      sentVolume: string;
      receivedVolume: string;
      avgAnomalyScore: number;
    }>;
    summary: {
      totalTransactions: number;
      totalVolume: string;
      peakHour: string;
      avgTransactionsPerHour: number;
      growthRate: number;
    };
  }> {
    const cacheKey = `address_trends:${address}:${hours ?? 'all'}:${tokenSymbol || 'all'}:${interval}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      apiLogger.warn('Cache miss for address trends', error);
    }

    const cutoffDate = hours
      ? new Date(Date.now() - hours * 60 * 60 * 1000)
      : undefined;

    // Determine date format based on interval and hours
    let dateFormat: string;
    if (!hours) {
      // All Time uses monthly aggregation
      dateFormat = '%Y-%m';
    } else if (interval === 'hourly') {
      dateFormat = '%Y-%m-%d %H:00:00';
    } else {
      dateFormat = '%Y-%m-%d 00:00:00';
    }

    // Build the DATE_FORMAT expression
    const dateFormatExpression = `DATE_FORMAT(timestamp, '${dateFormat}')`;

    // Build query with Prisma.$queryRaw - 4 variations based on tokenSymbol and cutoffDate
    const trends = tokenSymbol
      ? cutoffDate
        ? await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateFormatExpression)} as hour,
              COUNT(*) as transactionCount,
              CAST(SUM(value) AS CHAR) as volume,
              SUM(CASE WHEN fromAddress = ${address} THEN 1 ELSE 0 END) as sentCount,
              SUM(CASE WHEN toAddress = ${address} THEN 1 ELSE 0 END) as receivedCount,
              CAST(SUM(CASE WHEN fromAddress = ${address} THEN value ELSE 0 END) AS CHAR) as sentVolume,
              CAST(SUM(CASE WHEN toAddress = ${address} THEN value ELSE 0 END) AS CHAR) as receivedVolume,
              AVG(anomalyScore) as avgAnomalyScore
            FROM transactions
            WHERE (fromAddress = ${address} OR toAddress = ${address})
              AND timestamp >= ${cutoffDate}
              AND tokenSymbol = ${tokenSymbol}
            GROUP BY hour
            ORDER BY hour ASC
          `
        : await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateFormatExpression)} as hour,
              COUNT(*) as transactionCount,
              CAST(SUM(value) AS CHAR) as volume,
              SUM(CASE WHEN fromAddress = ${address} THEN 1 ELSE 0 END) as sentCount,
              SUM(CASE WHEN toAddress = ${address} THEN 1 ELSE 0 END) as receivedCount,
              CAST(SUM(CASE WHEN fromAddress = ${address} THEN value ELSE 0 END) AS CHAR) as sentVolume,
              CAST(SUM(CASE WHEN toAddress = ${address} THEN value ELSE 0 END) AS CHAR) as receivedVolume,
              AVG(anomalyScore) as avgAnomalyScore
            FROM transactions
            WHERE (fromAddress = ${address} OR toAddress = ${address})
              AND tokenSymbol = ${tokenSymbol}
            GROUP BY hour
            ORDER BY hour ASC
          `
      : cutoffDate
        ? await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateFormatExpression)} as hour,
              COUNT(*) as transactionCount,
              CAST(SUM(value) AS CHAR) as volume,
              SUM(CASE WHEN fromAddress = ${address} THEN 1 ELSE 0 END) as sentCount,
              SUM(CASE WHEN toAddress = ${address} THEN 1 ELSE 0 END) as receivedCount,
              CAST(SUM(CASE WHEN fromAddress = ${address} THEN value ELSE 0 END) AS CHAR) as sentVolume,
              CAST(SUM(CASE WHEN toAddress = ${address} THEN value ELSE 0 END) AS CHAR) as receivedVolume,
              AVG(anomalyScore) as avgAnomalyScore
            FROM transactions
            WHERE (fromAddress = ${address} OR toAddress = ${address})
              AND timestamp >= ${cutoffDate}
            GROUP BY hour
            ORDER BY hour ASC
          `
        : await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateFormatExpression)} as hour,
              COUNT(*) as transactionCount,
              CAST(SUM(value) AS CHAR) as volume,
              SUM(CASE WHEN fromAddress = ${address} THEN 1 ELSE 0 END) as sentCount,
              SUM(CASE WHEN toAddress = ${address} THEN 1 ELSE 0 END) as receivedCount,
              CAST(SUM(CASE WHEN fromAddress = ${address} THEN value ELSE 0 END) AS CHAR) as sentVolume,
              CAST(SUM(CASE WHEN toAddress = ${address} THEN value ELSE 0 END) AS CHAR) as receivedVolume,
              AVG(anomalyScore) as avgAnomalyScore
            FROM transactions
            WHERE (fromAddress = ${address} OR toAddress = ${address})
            GROUP BY hour
            ORDER BY hour ASC
          `;

    // Transform trends data
    const trendsData = trends.map(row => ({
      timestamp: !hours ? row.hour : `${row.hour}Z`, // Monthly format for All Time, otherwise ISO format
      transactionCount: parseInt(row.transactionCount.toString()),
      volume: row.volume.toString(),
      sentCount: parseInt(row.sentCount.toString()),
      receivedCount: parseInt(row.receivedCount.toString()),
      sentVolume: row.sentVolume.toString(),
      receivedVolume: row.receivedVolume.toString(),
      avgAnomalyScore: parseFloat(row.avgAnomalyScore?.toString() || '0'),
    }));

    // Calculate summary statistics
    const totalTransactions = trendsData.reduce(
      (sum, t) => sum + t.transactionCount,
      0
    );
    const totalVolume = trendsData
      .reduce((sum, t) => sum + BigInt(t.volume || 0), BigInt(0))
      .toString();

    // Find peak hour (highest transaction count)
    const peakHour =
      trendsData.length > 0
        ? trendsData.reduce((peak, current) =>
            current.transactionCount > peak.transactionCount ? current : peak
          ).timestamp
        : '';

    // Calculate average transactions per hour
    const avgTransactionsPerHour =
      trendsData.length > 0 ? totalTransactions / trendsData.length : 0;

    // Calculate growth rate (comparing last 25% vs first 25% of data)
    let growthRate = 0;
    if (trendsData.length >= 4) {
      const quarterSize = Math.floor(trendsData.length / 4);
      const firstQuarter = trendsData.slice(0, quarterSize);
      const lastQuarter = trendsData.slice(-quarterSize);

      const firstQuarterAvg =
        firstQuarter.reduce((sum, t) => sum + t.transactionCount, 0) /
        firstQuarter.length;
      const lastQuarterAvg =
        lastQuarter.reduce((sum, t) => sum + t.transactionCount, 0) /
        lastQuarter.length;

      if (firstQuarterAvg > 0) {
        growthRate =
          ((lastQuarterAvg - firstQuarterAvg) / firstQuarterAvg) * 100;
      }
    }

    const result = {
      trends: trendsData,
      summary: {
        totalTransactions,
        totalVolume,
        peakHour,
        avgTransactionsPerHour: parseFloat(avgTransactionsPerHour.toFixed(2)),
        growthRate: parseFloat(growthRate.toFixed(2)),
      },
    };

    // Cache for 5 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(result), 300);
    } catch (error) {
      apiLogger.warn('Failed to cache address trends', error);
    }

    return result;
  }
}
