import { prisma } from '@msq-tx-monitor/database';
import {
  TransactionSummary,
  TrendData,
  TokenAnalytics,
  VolumeAnalysis,
  AnalyticsFilters,
} from '../types/analyze.types';
import { RedisConnection } from '../cache/redis';
import { apiLogger } from '@msq-tx-monitor/msq-common';
import { config } from '../config';

export class AnalyzeService {
  /**
   * Get overall transaction summary statistics
   */
  async getTransactionSummary(
    filters: AnalyticsFilters = {}
  ): Promise<TransactionSummary> {
    // Check cache first if Redis is enabled
    if (config.redis.enabled) {
      const cacheKey = this.generateCacheKey('summary', filters);
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (error) {
          apiLogger.warn('Failed to parse cached summary', error);
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    if (filters.startDate) {
      whereClause.timestamp = {
        ...whereClause.timestamp,
        gte: new Date(filters.startDate),
      };
    }
    if (filters.endDate) {
      whereClause.timestamp = {
        ...whereClause.timestamp,
        lte: new Date(filters.endDate),
      };
    }
    if (filters.tokenAddress) {
      whereClause.tokenAddress = filters.tokenAddress;
    }

    const [
      totalTransactions,
      totalVolumeResult,
      uniqueAddresses,
      activeTokens,
      dateRange,
    ] = await Promise.all([
      // Total transaction count
      prisma.transaction.count({ where: whereClause }),

      // Total volume (sum of values)
      prisma.transaction.aggregate({
        where: whereClause,
        _sum: { value: true },
        _avg: { value: true },
      }),

      // Unique addresses (both from and to)
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT address) as count FROM (
          SELECT fromAddress as address FROM transactions ${this.buildWhereClauseRaw(whereClause)}
          UNION
          SELECT toAddress as address FROM transactions ${this.buildWhereClauseRaw(whereClause)}
        ) as unique_addresses
      `,

      // Active tokens count
      prisma.transaction.groupBy({
        by: ['tokenAddress'],
        where: whereClause,
      }),

      // Date range
      prisma.transaction.aggregate({
        where: whereClause,
        _min: { timestamp: true },
        _max: { timestamp: true },
      }),
    ]);

    const result = {
      totalTransactions,
      totalVolume: totalVolumeResult._sum.value?.toString() || '0',
      averageTransactionSize: totalVolumeResult._avg.value?.toString() || '0',
      uniqueAddresses: Number(uniqueAddresses[0]?.count || 0),
      activeTokens: activeTokens.length,
      timeRange: {
        start: dateRange._min.timestamp || new Date(),
        end: dateRange._max.timestamp || new Date(),
      },
    };

    // Cache the result for 5 minutes if Redis is enabled
    if (config.redis.enabled) {
      const cacheKey = this.generateCacheKey('summary', filters);
      await RedisConnection.set(cacheKey, JSON.stringify(result), 300);
    }

    return result;
  }

  /**
   * Get transaction trends by time frame
   */
  async getTrends(
    timeFrame: 'hour' | 'day' | 'week',
    filters: AnalyticsFilters = {}
  ): Promise<TrendData[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    if (filters.startDate) {
      whereClause.timestamp = {
        ...whereClause.timestamp,
        gte: new Date(filters.startDate),
      };
    }
    if (filters.endDate) {
      whereClause.timestamp = {
        ...whereClause.timestamp,
        lte: new Date(filters.endDate),
      };
    }
    if (filters.tokenAddress) {
      whereClause.tokenAddress = filters.tokenAddress;
    }

    const dateFormat = this.getDateFormat(timeFrame);
    const limit = filters.limit || 24; // Default to 24 periods

    const trends = await prisma.$queryRaw<
      Array<{
        period: string;
        transactionCount: bigint;
        volume: string;
        averageSize: string;
        uniqueAddresses: bigint;
      }>
    >`
      SELECT
        DATE_FORMAT(timestamp, ${dateFormat}) as period,
        COUNT(*) as transactionCount,
        SUM(value) as volume,
        AVG(value) as averageSize,
        COUNT(DISTINCT CONCAT(fromAddress, toAddress)) as uniqueAddresses
      FROM transactions
      ${this.buildWhereClauseRaw(whereClause)}
      GROUP BY period
      ORDER BY period DESC
      LIMIT ${limit}
    `;

    return trends.map(trend => ({
      timestamp: new Date(trend.period),
      transactionCount: Number(trend.transactionCount),
      volume: trend.volume,
      averageSize: trend.averageSize,
      uniqueAddresses: Number(trend.uniqueAddresses),
    }));
  }

  /**
   * Get analytics by token
   */
  async getTokenAnalytics(
    filters: AnalyticsFilters = {}
  ): Promise<TokenAnalytics[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    if (filters.startDate) {
      whereClause.timestamp = {
        ...whereClause.timestamp,
        gte: new Date(filters.startDate),
      };
    }
    if (filters.endDate) {
      whereClause.timestamp = {
        ...whereClause.timestamp,
        lte: new Date(filters.endDate),
      };
    }

    const tokenStats = await prisma.transaction.groupBy({
      by: ['tokenAddress'],
      where: whereClause,
      _count: true,
      _sum: { value: true },
      _avg: { value: true },
      orderBy: { _sum: { value: 'desc' } },
      take: filters.limit || 10,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalVolume = tokenStats.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, stat: any) => sum + Number(stat._sum.value || 0),
      0
    );

    const results: TokenAnalytics[] = [];

    for (const stat of tokenStats) {
      // Get unique addresses for this token
      const uniqueAddresses = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT address) as count FROM (
          SELECT fromAddress as address FROM transactions WHERE tokenAddress = ${stat.tokenAddress} ${this.buildWhereClauseRaw(whereClause, false)}
          UNION
          SELECT toAddress as address FROM transactions WHERE tokenAddress = ${stat.tokenAddress} ${this.buildWhereClauseRaw(whereClause, false)}
        ) as unique_addresses
      `;

      results.push({
        tokenAddress: stat.tokenAddress,
        tokenSymbol: this.getTokenSymbol(stat.tokenAddress),
        totalTransactions: stat._count,
        totalVolume: stat._sum.value?.toString() || '0',
        averageTransactionSize: stat._avg.value?.toString() || '0',
        uniqueAddresses: Number(uniqueAddresses[0]?.count || 0),
        marketShare:
          totalVolume > 0
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (Number((stat as any)._sum.value || 0) / totalVolume) * 100
            : 0,
      });
    }

    return results;
  }

  /**
   * Get volume analysis
   */
  async getVolumeAnalysis(
    filters: AnalyticsFilters = {}
  ): Promise<VolumeAnalysis> {
    const [
      summary,
      tokenAnalytics,
      hourlyTrends,
      dailyTrends,
      weeklyTrends,
      topAddresses,
    ] = await Promise.all([
      this.getTransactionSummary(filters),
      this.getTokenAnalytics(filters),
      this.getTrends('hour', { ...filters, limit: 24 }),
      this.getTrends('day', { ...filters, limit: 7 }),
      this.getTrends('week', { ...filters, limit: 4 }),
      this.getTopAddressesByVolume(filters),
    ]);

    return {
      totalVolume: summary.totalVolume,
      volumeByToken: tokenAnalytics,
      volumeByTimeFrame: {
        hour: hourlyTrends,
        day: dailyTrends,
        week: weeklyTrends,
      },
      topAddressesByVolume: topAddresses,
    };
  }

  /**
   * Get top addresses by volume
   */
  private async getTopAddressesByVolume(filters: AnalyticsFilters) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    if (filters.startDate) {
      whereClause.timestamp = {
        ...whereClause.timestamp,
        gte: new Date(filters.startDate),
      };
    }
    if (filters.endDate) {
      whereClause.timestamp = {
        ...whereClause.timestamp,
        lte: new Date(filters.endDate),
      };
    }
    if (filters.tokenAddress) {
      whereClause.tokenAddress = filters.tokenAddress;
    }

    const topSenders = await prisma.transaction.groupBy({
      by: ['fromAddress'],
      where: whereClause,
      _count: true,
      _sum: { value: true },
      orderBy: { _sum: { value: 'desc' } },
      take: filters.limit || 10,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return topSenders.map((sender: any) => ({
      address: sender.fromAddress,
      volume: sender._sum.value?.toString() || '0',
      transactionCount: sender._count,
    }));
  }

  /**
   * Helper methods
   */
  private getDateFormat(timeFrame: 'hour' | 'day' | 'week'): string {
    switch (timeFrame) {
      case 'hour':
        return '%Y-%m-%d %H:00:00';
      case 'day':
        return '%Y-%m-%d';
      case 'week':
        return '%Y-%u';
      default:
        return '%Y-%m-%d';
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildWhereClauseRaw(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    whereClause: any,
    includeWhere: boolean = true
  ): string {
    const conditions: string[] = [];

    if (whereClause.timestamp?.gte) {
      conditions.push(
        `timestamp >= '${whereClause.timestamp.gte.toISOString()}'`
      );
    }
    if (whereClause.timestamp?.lte) {
      conditions.push(
        `timestamp <= '${whereClause.timestamp.lte.toISOString()}'`
      );
    }
    if (whereClause.tokenAddress) {
      conditions.push(`tokenAddress = '${whereClause.tokenAddress}'`);
    }

    if (conditions.length === 0) {
      return '';
    }

    return (includeWhere ? 'WHERE ' : 'AND ') + conditions.join(' AND ');
  }

  private getTokenSymbol(tokenAddress: string): string {
    // Map known token addresses to symbols
    const tokenMap: Record<string, string> = {
      '0x98965474ecbec2f532f1f780ee37b0b05f77ca55': 'MSQ',
      '0x435001af7fc65b621b0043df99810b2f30860c5d': 'SUT',
      '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': 'KWT',
      '0x4da48bdd97c5ece9ab95c6f1c01af0ef30e14fe3': 'P2UC',
    };

    return tokenMap[tokenAddress.toLowerCase()] || tokenAddress.slice(0, 8) + '...';
  }

  private generateCacheKey(
    prefix: string,
    filters: AnalyticsFilters
  ): string {
    const parts = [prefix];
    if (filters.startDate) parts.push(filters.startDate);
    if (filters.endDate) parts.push(filters.endDate);
    if (filters.tokenAddress) parts.push(filters.tokenAddress);
    if (filters.limit) parts.push(filters.limit.toString());
    return parts.join(':');
  }
}
