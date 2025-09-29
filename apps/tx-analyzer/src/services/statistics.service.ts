import { prisma } from '@msq-tx-monitor/database';
import { redisService } from './redis.service';
import {
  StatisticsFilters,
  RealtimeStats,
  HourlyVolumeStats,
  DailyVolumeStats,
  TokenStats,
  TopAddress,
  TopAddressFilters,
  AnomalyStats,
  NetworkStats,
  TokenDistribution,
  CACHE_KEYS,
  CACHE_TTL,
} from '../types/statistics.types';

export class StatisticsService {
  /**
   * Get real-time statistics with caching
   */
  async getRealtimeStats(): Promise<RealtimeStats> {
    const cacheKey = CACHE_KEYS.REALTIME_STATS;

    try {
      // Try to get from cache first
      const cached = await redisService.get<RealtimeStats>(cacheKey);
      if (cached) {
        return cached;
      }

      // Calculate real-time stats
      const stats = await this.calculateRealtimeStats();

      // Cache for 1 minute
      await redisService.set(cacheKey, stats, CACHE_TTL.REALTIME);

      return stats;
    } catch (error) {
      console.error('Error getting realtime stats:', error);
      // Fallback to direct calculation
      return this.calculateRealtimeStats();
    }
  }

  /**
   * Calculate real-time statistics from database
   */
  private async calculateRealtimeStats(): Promise<RealtimeStats> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Parallel queries for better performance
    const [
      totalTransactions,
      totalVolume,
      activeAddresses,
      transactionsLast24h,
      volumeLast24h,
      tokenStats,
      currentBlock,
    ] = await Promise.all([
      // Total transactions
      prisma.transaction.count(),

      // Total volume (sum all tokens in wei)
      prisma.transaction.aggregate({
        _sum: { value: true },
      }),

      // Active addresses (unique addresses in last 24h)
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT address) as count FROM (
          SELECT fromAddress as address FROM transactions WHERE timestamp >= ${yesterday}
          UNION
          SELECT toAddress as address FROM transactions WHERE timestamp >= ${yesterday}
        ) as unique_addresses
      `,

      // Transactions in last 24h
      prisma.transaction.count({
        where: { timestamp: { gte: yesterday } },
      }),

      // Volume in last 24h
      prisma.transaction.aggregate({
        where: { timestamp: { gte: yesterday } },
        _sum: { value: true },
      }),

      // Token-specific stats
      prisma.$queryRaw<any[]>`
        SELECT
          tokenSymbol,
          tokenAddress,
          COUNT(*) as transactionCount,
          SUM(value) as totalVolume,
          COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses,
          AVG(value) as averageTransactionSize
        FROM transactions
        WHERE timestamp >= ${yesterday}
        GROUP BY tokenSymbol, tokenAddress
        ORDER BY totalVolume DESC
      `,

      // Current block number
      prisma.transaction.aggregate({
        _max: { blockNumber: true },
      }),
    ]);

    const totalVolumeValue = totalVolume._sum?.value || BigInt(0);
    const averageTransactionSize =
      totalTransactions > 0 ? Number(totalVolumeValue) / totalTransactions : 0;

    return {
      totalTransactions,
      totalVolume: (totalVolume._sum?.value || BigInt(0)).toString(),
      activeAddresses: activeAddresses[0]?.count || 0,
      averageTransactionSize: averageTransactionSize.toString(),
      transactionsLast24h,
      volumeLast24h: (volumeLast24h._sum?.value || BigInt(0)).toString(),
      activeTokens: tokenStats.length,
      currentBlockNumber: Number(currentBlock._max?.blockNumber || 0),
      tokenStats: tokenStats.map(token => ({
        tokenSymbol: token.tokenSymbol,
        tokenAddress: token.tokenAddress,
        transactionCount: Number(token.transactionCount),
        volume24h: token.totalVolume?.toString() || '0',
        totalVolume: token.totalVolume?.toString() || '0',
        uniqueAddresses24h: Number(token.uniqueAddresses),
        averageTransactionSize: token.averageTransactionSize?.toString() || '0',
      })),
      lastUpdated: now,
    };
  }

  /**
   * Get hourly volume statistics
   */
  async getHourlyVolumeStats(
    filters: StatisticsFilters
  ): Promise<HourlyVolumeStats[]> {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const limit = filters.limit || 24;

    const query = `
      SELECT
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
        tokenSymbol,
        COUNT(*) as transactionCount,
        SUM(value) as volume,
        COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses,
        AVG(value) as averageTransactionSize,
        SUM(gasUsed) as gasUsed,
        SUM(CASE WHEN isAnomaly = true THEN 1 ELSE 0 END) as anomalyCount
      FROM transactions
      WHERE timestamp >= ? AND timestamp <= ?
      ${filters.tokenSymbol ? 'AND tokenSymbol = ?' : ''}
      GROUP BY hour, tokenSymbol
      ORDER BY hour DESC
      LIMIT ?
    `;

    const params: any[] = [startDate, endDate];
    if (filters.tokenSymbol) {
      params.push(filters.tokenSymbol);
    }
    params.push(limit);

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    return results.map(result => ({
      hour: result.hour,
      tokenSymbol: result.tokenSymbol,
      transactionCount: Number(result.transactionCount),
      volume: result.volume?.toString() || '0',
      uniqueAddresses: Number(result.uniqueAddresses),
      averageTransactionSize: result.averageTransactionSize?.toString() || '0',
      gasUsed: result.gasUsed?.toString() || '0',
      anomalyCount: Number(result.anomalyCount),
    }));
  }

  /**
   * Get daily volume statistics
   */
  async getDailyVolumeStats(
    filters: StatisticsFilters
  ): Promise<DailyVolumeStats[]> {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const limit = filters.limit || 30;

    const query = `
      SELECT
        DATE_FORMAT(timestamp, '%Y-%m-%d') as date,
        tokenSymbol,
        COUNT(*) as transactionCount,
        SUM(value) as volume,
        COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses,
        AVG(value) as averageTransactionSize,
        SUM(gasUsed) as gasUsed,
        SUM(CASE WHEN isAnomaly = true THEN 1 ELSE 0 END) as anomalyCount,
        MAX(value) as highestTransaction,
        HOUR(timestamp) as peakHour
      FROM transactions
      WHERE timestamp >= ? AND timestamp <= ?
      ${filters.tokenSymbol ? 'AND tokenSymbol = ?' : ''}
      GROUP BY date, tokenSymbol
      ORDER BY date DESC
      LIMIT ?
    `;

    const params: any[] = [startDate, endDate];
    if (filters.tokenSymbol) {
      params.push(filters.tokenSymbol);
    }
    params.push(limit);

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    return results.map(result => ({
      date: result.date,
      tokenSymbol: result.tokenSymbol,
      transactionCount: Number(result.transactionCount),
      volume: result.volume?.toString() || '0',
      uniqueAddresses: Number(result.uniqueAddresses),
      averageTransactionSize: result.averageTransactionSize?.toString() || '0',
      gasUsed: result.gasUsed?.toString() || '0',
      anomalyCount: Number(result.anomalyCount),
      highestTransaction: result.highestTransaction?.toString() || '0',
      peakHour: Number(result.peakHour),
    }));
  }

  /**
   * Get token-specific statistics
   */
  async getTokenStats(filters: StatisticsFilters): Promise<TokenStats[]> {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const whereClause = filters.tokenSymbol
      ? {
          timestamp: { gte: startDate, lte: endDate },
          tokenSymbol: filters.tokenSymbol,
        }
      : { timestamp: { gte: startDate, lte: endDate } };

    const tokenGroups = await prisma.transaction.groupBy({
      by: ['tokenSymbol', 'tokenAddress'],
      where: whereClause,
      _count: true,
      _sum: { value: true },
      _avg: { value: true },
      _max: { value: true },
      _min: { value: true },
    });

    return tokenGroups.map(group => ({
      tokenSymbol: group.tokenSymbol,
      tokenAddress: group.tokenAddress,
      totalTransactions: group._count,
      totalVolume: (group._sum.value || BigInt(0)).toString(),
      uniqueHolders: 0, // This would need additional calculation
      averageTransactionSize: (group._avg.value || BigInt(0)).toString(),
      medianTransactionSize: '0', // This would need additional calculation
      largestTransaction: (group._max.value || BigInt(0)).toString(),
      smallestTransaction: (group._min.value || BigInt(0)).toString(),
      transactionDistribution: [], // This would need additional calculation
      volumeTrend: [], // This would need additional calculation
      topHolders: [], // This would need additional calculation
      velocity: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        trend: 'stable' as const,
      },
    }));
  }

  /**
   * Get top addresses by various metrics
   */
  async getTopAddresses(filters: TopAddressFilters): Promise<TopAddress[]> {
    let timeFilter = '';
    const now = new Date();

    switch (filters.timeframe) {
      case '24h':
        timeFilter = `AND timestamp >= '${new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()}'`;
        break;
      case '7d':
        timeFilter = `AND timestamp >= '${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()}'`;
        break;
      case '30d':
        timeFilter = `AND timestamp >= '${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()}'`;
        break;
      default:
        timeFilter = '';
    }

    const tokenFilter = filters.tokenSymbol
      ? `AND tokenSymbol = '${filters.tokenSymbol}'`
      : '';

    let orderBy = '';
    switch (filters.metric) {
      case 'volume':
        orderBy = 'totalVolume DESC';
        break;
      case 'transactions':
        orderBy = 'transactionCount DESC';
        break;
      case 'unique_interactions':
        orderBy = 'uniqueInteractions DESC';
        break;
    }

    const query = `
      SELECT
        address,
        SUM(volume) as totalVolume,
        SUM(transactionCount) as transactionCount,
        COUNT(DISTINCT tokenSymbol) as uniqueInteractions,
        MIN(firstSeen) as firstSeen,
        MAX(lastSeen) as lastSeen
      FROM (
        SELECT
          fromAddress as address,
          SUM(value) as volume,
          COUNT(*) as transactionCount,
          tokenSymbol,
          MIN(timestamp) as firstSeen,
          MAX(timestamp) as lastSeen
        FROM transactions
        WHERE 1=1 ${timeFilter} ${tokenFilter}
        GROUP BY fromAddress, tokenSymbol
        UNION ALL
        SELECT
          toAddress as address,
          SUM(value) as volume,
          COUNT(*) as transactionCount,
          tokenSymbol,
          MIN(timestamp) as firstSeen,
          MAX(timestamp) as lastSeen
        FROM transactions
        WHERE 1=1 ${timeFilter} ${tokenFilter}
        GROUP BY toAddress, tokenSymbol
      ) as combined
      GROUP BY address
      ORDER BY ${orderBy}
      LIMIT ${filters.limit}
    `;

    const results = await prisma.$queryRawUnsafe<any[]>(query);

    return results.map(result => ({
      address: result.address,
      totalVolume: result.totalVolume?.toString() || '0',
      transactionCount: Number(result.transactionCount),
      uniqueInteractions: Number(result.uniqueInteractions),
      firstSeen: new Date(result.firstSeen),
      lastSeen: new Date(result.lastSeen),
      isWhale: false, // This would need additional logic
      isSuspicious: false, // This would need additional logic
      riskScore: 0, // This would need additional calculation
      behavioralFlags: [], // This would need additional analysis
      tokenBreakdown: [], // This would need additional query
    }));
  }

  /**
   * Get anomaly detection statistics
   */
  async getAnomalyStats(filters: StatisticsFilters): Promise<AnomalyStats> {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const whereClause = {
      timestamp: { gte: startDate, lte: endDate },
      ...(filters.tokenSymbol && { tokenSymbol: filters.tokenSymbol }),
    };

    const [totalAnomalies, riskLevels, suspiciousAddresses, hourlyTrends] =
      await Promise.all([
        prisma.transaction.count({
          where: { ...whereClause, isAnomaly: true },
        }),

        prisma.transaction.groupBy({
          by: ['isAnomaly'],
          where: whereClause,
          _count: true,
          _avg: { anomalyScore: true },
        }),

        prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT address) as count FROM (
          SELECT fromAddress as address FROM transactions
          WHERE timestamp >= ${startDate} AND timestamp <= ${endDate} AND anomalyScore > 0.7
          UNION
          SELECT toAddress as address FROM transactions
          WHERE timestamp >= ${startDate} AND timestamp <= ${endDate} AND anomalyScore > 0.7
        ) as suspicious_addresses
      `,

        (async () => {
          let query = `
          SELECT
            DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
            COUNT(CASE WHEN isAnomaly = true THEN 1 END) as anomalyCount,
            AVG(anomalyScore) as averageRiskScore,
            COUNT(CASE WHEN anomalyScore > 0.7 THEN 1 END) as highRiskCount
          FROM transactions
          WHERE timestamp >= ? AND timestamp <= ?
        `;
          const params: any[] = [startDate, endDate];

          if (filters.tokenSymbol) {
            query += ` AND tokenSymbol = ?`;
            params.push(filters.tokenSymbol);
          }

          query += `
          GROUP BY hour
          ORDER BY hour DESC
          LIMIT 24
        `;

          return await prisma.$queryRawUnsafe<any[]>(query, ...params);
        })(),
      ]);

    const averageAnomalyScore =
      riskLevels.find(r => r.isAnomaly)?._avg.anomalyScore || 0;

    return {
      totalAnomalies,
      highRiskTransactions: 0, // Calculate from riskLevels
      mediumRiskTransactions: 0, // Calculate from riskLevels
      lowRiskTransactions: 0, // Calculate from riskLevels
      averageAnomalyScore: Number(averageAnomalyScore),
      suspiciousAddresses: suspiciousAddresses[0]?.count || 0,
      anomalyTrends: hourlyTrends.map(trend => ({
        hour: trend.hour,
        anomalyCount: Number(trend.anomalyCount),
        averageRiskScore: Number(trend.averageRiskScore),
        highRiskCount: Number(trend.highRiskCount),
      })),
      riskDistribution: [], // This would need additional calculation
      flaggedPatterns: [], // This would need additional analysis
    };
  }

  /**
   * Get network health statistics
   */
  async getNetworkStats(filters: StatisticsFilters): Promise<NetworkStats> {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const [gasStats, transactionStats] = await Promise.all([
      prisma.transaction.aggregate({
        where: { timestamp: { gte: startDate, lte: endDate } },
        _avg: { gasPrice: true },
        _count: true,
      }),

      prisma.$queryRawUnsafe<any[]>(
        `
        SELECT
          DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
          AVG(gasPrice) as gasPrice,
          COUNT(*) as transactionCount,
          AVG(blockNumber) as blockNumber
        FROM transactions
        WHERE timestamp >= ? AND timestamp <= ?
        GROUP BY hour
        ORDER BY hour DESC
        LIMIT ?
      `,
        startDate,
        endDate,
        filters.limit || 24
      ),
    ]);

    return {
      averageBlockTime: 2.0, // Polygon average block time
      transactionThroughput: gasStats._count / 24, // transactions per hour
      networkCongestion: 0.5, // This would need calculation
      averageGasPrice: (gasStats._avg.gasPrice || BigInt(0)).toString(),
      gasPriceTrend: transactionStats.map(stat => ({
        timestamp: stat.hour,
        gasPrice: stat.gasPrice?.toString() || '0',
        transactionCount: Number(stat.transactionCount),
        blockNumber: Number(stat.blockNumber),
      })),
      blockUtilization: 0.8, // This would need calculation
      successfulTransactions: gasStats._count, // Assuming all stored transactions are successful
      failedTransactions: 0, // We don't store failed transactions
      successRate: 100, // Based on above assumption
      networkHealth: 'good' as const,
    };
  }

  /**
   * Get token distribution statistics
   */
  async getTokenDistribution(
    filters: StatisticsFilters
  ): Promise<TokenDistribution[]> {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const results = await prisma.transaction.groupBy({
      by: ['tokenSymbol'],
      where: { timestamp: { gte: startDate, lte: endDate } },
      _count: true,
      _sum: { value: true },
    });

    const total = results.reduce((sum, result) => sum + result._count, 0);
    const colors = ['#8b5cf6', '#06d6a0', '#f72585', '#4cc9f0', '#7209b7'];

    return results.map((result, index) => ({
      tokenSymbol: result.tokenSymbol,
      transactionCount: result._count,
      volume: (result._sum.value || BigInt(0)).toString(),
      percentage: (result._count / total) * 100,
      color: colors[index % colors.length],
    }));
  }
}
