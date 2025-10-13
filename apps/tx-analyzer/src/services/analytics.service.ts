import { prisma } from '@msq-tx-monitor/database';
import { redisService } from './redis.service';
import { logger } from '@msq-tx-monitor/msq-common';
import {
  StatisticsFilters,
  RealtimeStats,
  HourlyVolumeStats,
  DailyVolumeStats,
  TokenStats,
  TopAddress,
  TopAddressFilters,
  AnomalyStats,
  AnomalyTrendPoint,
  NetworkStats,
  TokenDistribution,
  CACHE_KEYS,
  CACHE_TTL,
} from '../types/analytics.types';

export class AnalyticsService {
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
      logger.error('Error getting realtime stats:', error);
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
      totalVolume: result.volume?.toString() || '0',
      uniqueAddresses: Number(result.uniqueAddresses),
      averageVolume: result.averageTransactionSize?.toString() || '0',
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
      totalVolume: result.volume?.toString() || '0',
      uniqueAddresses: Number(result.uniqueAddresses),
      averageVolume: result.averageTransactionSize?.toString() || '0',
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
   * Get top addresses by various metrics (period-specific with transactions table)
   */
  async getTopAddresses(filters: TopAddressFilters): Promise<TopAddress[]> {
    // Generate cache key
    const cacheKey = `stats:addresses:top:${filters.metric}:${filters.timeframe}:${filters.tokenSymbol || 'all'}:${filters.limit}`;

    try {
      // Try to get from cache first (only for non-'all' timeframes)
      if (filters.timeframe !== 'all') {
        const cached = await redisService.get<TopAddress[]>(cacheKey);
        if (cached) {
          logger.info(`Cache hit for top addresses: ${cacheKey}`);
          return cached;
        }
      }

      // Calculate timestamp boundaries based on timeframe
      const now = new Date();
      let startDate: Date;

      switch (filters.timeframe) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // 'all' time
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

      // Query transactions table for period-specific data with sent/received breakdown
      const query = `
        SELECT
          combined.address,
          SUM(combined.volume) as totalVolume,
          SUM(combined.sent) as total_sent,
          SUM(combined.received) as total_received,
          SUM(combined.transactionCount) as transactionCount,
          COUNT(DISTINCT combined.tokenAddress) as uniqueInteractions,
          MIN(combined.firstSeen) as firstSeen,
          MAX(combined.lastSeen) as lastSeen
        FROM (
          SELECT
            fromAddress as address,
            SUM(value) as volume,
            SUM(value) as sent,
            0 as received,
            COUNT(*) as transactionCount,
            tokenAddress,
            MIN(timestamp) as firstSeen,
            MAX(timestamp) as lastSeen
          FROM transactions
          WHERE timestamp >= '${startDate.toISOString()}' AND timestamp <= '${now.toISOString()}' ${tokenFilter}
          GROUP BY fromAddress, tokenAddress
          UNION ALL
          SELECT
            toAddress as address,
            SUM(value) as volume,
            0 as sent,
            SUM(value) as received,
            COUNT(*) as transactionCount,
            tokenAddress,
            MIN(timestamp) as firstSeen,
            MAX(timestamp) as lastSeen
          FROM transactions
          WHERE timestamp >= '${startDate.toISOString()}' AND timestamp <= '${now.toISOString()}' ${tokenFilter}
          GROUP BY toAddress, tokenAddress
        ) as combined
        GROUP BY combined.address
        ORDER BY ${orderBy}
        LIMIT ${filters.limit}
      `;

      const results = await prisma.$queryRawUnsafe<any[]>(query);

      // Enrich with address metadata from AddressStatistics
      const addresses = results.map(r => r.address);
      const addressStats =
        addresses.length > 0
          ? await prisma.$queryRawUnsafe<any[]>(
              `SELECT address, MAX(riskScore) as riskScore, MAX(isWhale) as isWhale, MAX(isSuspicious) as isSuspicious
             FROM address_statistics
             WHERE address IN (${addresses.map(a => `'${a}'`).join(',')})
             GROUP BY address`
            )
          : [];

      const statsMap = new Map(addressStats.map(s => [s.address, s]));

      const topAddresses = results.map(result => {
        const stats = statsMap.get(result.address);
        return {
          address: result.address,
          totalVolume: result.totalVolume?.toString() || '0',
          totalSent: result.total_sent?.toString() || '0',
          totalReceived: result.total_received?.toString() || '0',
          transactionCount: Number(result.transactionCount),
          uniqueInteractions: Number(result.uniqueInteractions),
          firstSeen: new Date(result.firstSeen),
          lastSeen: new Date(result.lastSeen),
          isWhale: stats ? Boolean(stats.isWhale) : false,
          isSuspicious: stats ? Boolean(stats.isSuspicious) : false,
          riskScore: stats ? Number(stats.riskScore) : 0,
          behavioralFlags: [],
          tokenBreakdown: [],
        };
      });

      // Cache for 5 minutes (only for non-'all' timeframes)
      if (filters.timeframe !== 'all') {
        await redisService.set(cacheKey, topAddresses, CACHE_TTL.HOURLY);
      }

      return topAddresses;
    } catch (error) {
      logger.error('Error getting top addresses:', error);
      throw error;
    }
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
            DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as timestamp,
            COUNT(*) as totalTransactions,
            COUNT(CASE WHEN isAnomaly = true THEN 1 END) as anomalyCount,
            AVG(anomalyScore) as averageScore,
            AVG(anomalyScore) as averageRiskScore,
            COUNT(CASE WHEN anomalyScore > 0.7 THEN 1 END) as highRiskCount,
            ROUND((COUNT(CASE WHEN isAnomaly = true THEN 1 END) / COUNT(*) * 100), 2) as anomalyRate
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
        timestamp: trend.timestamp,
        totalTransactions: Number(trend.totalTransactions),
        anomalyCount: Number(trend.anomalyCount),
        averageScore: Number(trend.averageScore),
        averageRiskScore: Number(trend.averageRiskScore),
        highRiskCount: Number(trend.highRiskCount),
        anomalyRate: Number(trend.anomalyRate),
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

  /**
   * Get top receivers (addresses receiving the most transactions) - period-specific
   */
  async getTopReceivers(filters: TopAddressFilters): Promise<TopAddress[]> {
    // Generate cache key
    const cacheKey = `stats:addresses:receivers:${filters.timeframe}:${filters.tokenSymbol || 'all'}:${filters.limit}`;

    try {
      // Try to get from cache first (only for non-'all' timeframes)
      if (filters.timeframe !== 'all') {
        const cached = await redisService.get<TopAddress[]>(cacheKey);
        if (cached) {
          logger.info(`Cache hit for top receivers: ${cacheKey}`);
          return cached;
        }
      }

      // Calculate timestamp boundaries based on timeframe
      const now = new Date();
      let startDate: Date;

      switch (filters.timeframe) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // 'all' time
      }

      const tokenFilter = filters.tokenSymbol
        ? `AND tokenSymbol = '${filters.tokenSymbol}'`
        : '';

      // Query transactions table for period-specific receiver data
      const query = `
        SELECT
          toAddress as address,
          SUM(value) as totalVolume,
          COUNT(*) as transactionCount,
          COUNT(DISTINCT tokenAddress) as uniqueInteractions,
          MIN(timestamp) as firstSeen,
          MAX(timestamp) as lastSeen
        FROM transactions
        WHERE timestamp >= '${startDate.toISOString()}' AND timestamp <= '${now.toISOString()}' ${tokenFilter}
        GROUP BY toAddress
        ORDER BY transactionCount DESC
        LIMIT ${filters.limit}
      `;

      const results = await prisma.$queryRawUnsafe<any[]>(query);

      // Enrich with address metadata from AddressStatistics
      const addresses = results.map(r => r.address);
      const addressStats =
        addresses.length > 0
          ? await prisma.$queryRawUnsafe<any[]>(
              `SELECT address, MAX(riskScore) as riskScore, MAX(isWhale) as isWhale, MAX(isSuspicious) as isSuspicious
             FROM address_statistics
             WHERE address IN (${addresses.map(a => `'${a}'`).join(',')})
             GROUP BY address`
            )
          : [];

      const statsMap = new Map(addressStats.map(s => [s.address, s]));

      const topReceivers = results.map(result => {
        const stats = statsMap.get(result.address);
        return {
          address: result.address,
          totalVolume: result.totalVolume?.toString() || '0',
          totalSent: '0', // Receivers endpoint: sent is 0
          totalReceived: result.totalVolume?.toString() || '0', // All volume is received
          transactionCount: Number(result.transactionCount),
          uniqueInteractions: Number(result.uniqueInteractions),
          firstSeen: new Date(result.firstSeen),
          lastSeen: new Date(result.lastSeen),
          isWhale: stats ? Boolean(stats.isWhale) : false,
          isSuspicious: stats ? Boolean(stats.isSuspicious) : false,
          riskScore: stats ? Number(stats.riskScore) : 0,
          behavioralFlags: [],
          tokenBreakdown: [],
        };
      });

      // Cache for 5 minutes (only for non-'all' timeframes)
      if (filters.timeframe !== 'all') {
        await redisService.set(cacheKey, topReceivers, CACHE_TTL.HOURLY);
      }

      return topReceivers;
    } catch (error) {
      logger.error('Error getting top receivers:', error);
      throw error;
    }
  }

  /**
   * Get top senders (addresses sending the most transactions) - period-specific
   */
  async getTopSenders(filters: TopAddressFilters): Promise<TopAddress[]> {
    // Generate cache key
    const cacheKey = `stats:addresses:senders:${filters.timeframe}:${filters.tokenSymbol || 'all'}:${filters.limit}`;

    try {
      // Try to get from cache first (only for non-'all' timeframes)
      if (filters.timeframe !== 'all') {
        const cached = await redisService.get<TopAddress[]>(cacheKey);
        if (cached) {
          logger.info(`Cache hit for top senders: ${cacheKey}`);
          return cached;
        }
      }

      // Calculate timestamp boundaries based on timeframe
      const now = new Date();
      let startDate: Date;

      switch (filters.timeframe) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // 'all' time
      }

      const tokenFilter = filters.tokenSymbol
        ? `AND tokenSymbol = '${filters.tokenSymbol}'`
        : '';

      // Query transactions table for period-specific sender data
      const query = `
        SELECT
          fromAddress as address,
          SUM(value) as totalVolume,
          COUNT(*) as transactionCount,
          COUNT(DISTINCT tokenAddress) as uniqueInteractions,
          MIN(timestamp) as firstSeen,
          MAX(timestamp) as lastSeen
        FROM transactions
        WHERE timestamp >= '${startDate.toISOString()}' AND timestamp <= '${now.toISOString()}' ${tokenFilter}
        GROUP BY fromAddress
        ORDER BY transactionCount DESC
        LIMIT ${filters.limit}
      `;

      const results = await prisma.$queryRawUnsafe<any[]>(query);

      // Enrich with address metadata from AddressStatistics
      const addresses = results.map(r => r.address);
      const addressStats =
        addresses.length > 0
          ? await prisma.$queryRawUnsafe<any[]>(
              `SELECT address, MAX(riskScore) as riskScore, MAX(isWhale) as isWhale, MAX(isSuspicious) as isSuspicious
             FROM address_statistics
             WHERE address IN (${addresses.map(a => `'${a}'`).join(',')})
             GROUP BY address`
            )
          : [];

      const statsMap = new Map(addressStats.map(s => [s.address, s]));

      const topSenders = results.map(result => {
        const stats = statsMap.get(result.address);
        return {
          address: result.address,
          totalVolume: result.totalVolume?.toString() || '0',
          totalSent: result.totalVolume?.toString() || '0', // All volume is sent
          totalReceived: '0', // Senders endpoint: received is 0
          transactionCount: Number(result.transactionCount),
          uniqueInteractions: Number(result.uniqueInteractions),
          firstSeen: new Date(result.firstSeen),
          lastSeen: new Date(result.lastSeen),
          isWhale: stats ? Boolean(stats.isWhale) : false,
          isSuspicious: stats ? Boolean(stats.isSuspicious) : false,
          riskScore: stats ? Number(stats.riskScore) : 0,
          behavioralFlags: [],
          tokenBreakdown: [],
        };
      });

      // Cache for 5 minutes (only for non-'all' timeframes)
      if (filters.timeframe !== 'all') {
        await redisService.set(cacheKey, topSenders, CACHE_TTL.HOURLY);
      }

      return topSenders;
    } catch (error) {
      logger.error('Error getting top senders:', error);
      throw error;
    }
  }

  /**
   * Get anomaly time series data
   */
  async getAnomalyTimeSeries(
    filters: StatisticsFilters
  ): Promise<AnomalyTrendPoint[]> {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const limit = filters.limit || 24;

    let query = `
      SELECT
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as timestamp,
        COUNT(*) as totalTransactions,
        COUNT(CASE WHEN isAnomaly = true THEN 1 END) as anomalyCount,
        AVG(anomalyScore) as averageScore,
        COUNT(CASE WHEN anomalyScore > 0.7 THEN 1 END) as highRiskCount,
        ROUND((COUNT(CASE WHEN isAnomaly = true THEN 1 END) / COUNT(*) * 100), 2) as anomalyRate
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
      LIMIT ?
    `;
    params.push(limit);

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    return results.map(trend => ({
      hour: trend.hour,
      timestamp: trend.timestamp,
      totalTransactions: Number(trend.totalTransactions),
      anomalyCount: Number(trend.anomalyCount),
      averageScore: Number(trend.averageScore),
      averageRiskScore: Number(trend.averageScore), // Keep for backward compatibility
      highRiskCount: Number(trend.highRiskCount),
      anomalyRate: Number(trend.anomalyRate),
    }));
  }
}
