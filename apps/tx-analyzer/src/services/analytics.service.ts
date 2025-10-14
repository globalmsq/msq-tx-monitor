import { prisma } from '@msq-tx-monitor/database';
import { redisService } from './redis.service';
import { logger } from '@msq-tx-monitor/msq-common';
import {
  StatisticsFilters,
  RealtimeStats,
  HourlyVolumeStats,
  DailyVolumeStats,
  WeeklyVolumeStats,
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
   * Helper: Get ISO week number for a date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return weekNo;
  }

  /**
   * Helper: Fill missing time slots with zero values for volume stats
   */
  private fillMissingTimeSlots<T extends { hour: string }>(
    data: T[],
    limit: number,
    interval: 'minute' | 'hour' | 'day' | 'week',
    tokenSymbol?: string,
    zeroTemplate?: Partial<T>
  ): T[] {
    const now = new Date();
    const filledData: T[] = [];
    const dataMap = new Map(data.map(d => [d.hour, d]));

    // Generate all expected time slots based on limit and interval
    for (let i = limit - 1; i >= 0; i--) {
      let slotDate: Date;
      let hourFormat: string;

      switch (interval) {
        case 'minute': {
          slotDate = new Date(now.getTime() - i * 60 * 1000);
          hourFormat =
            slotDate.toISOString().substring(0, 16).replace('T', ' ') + ':00';
          break;
        }
        case 'hour': {
          slotDate = new Date(now.getTime() - i * 60 * 60 * 1000);
          hourFormat =
            slotDate.toISOString().substring(0, 13).replace('T', ' ') +
            ':00:00';
          break;
        }
        case 'day': {
          slotDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          hourFormat = slotDate.toISOString().substring(0, 10);
          break;
        }
        case 'week': {
          slotDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          const year = slotDate.getFullYear();
          const week = this.getWeekNumber(slotDate);
          hourFormat = `${year}-${String(week).padStart(2, '0')}`;
          break;
        }
      }

      // Find existing data for this time slot
      const existing = dataMap.get(hourFormat);

      if (existing) {
        filledData.push(existing);
      } else {
        // Create zero-filled entry
        const zeroEntry = {
          hour: hourFormat,
          tokenSymbol: tokenSymbol || 'ALL',
          transactionCount: 0,
          totalVolume: '0',
          uniqueAddresses: 0,
          averageVolume: '0',
          gasUsed: '0',
          anomalyCount: 0,
          ...zeroTemplate,
        } as unknown as T;
        filledData.push(zeroEntry);
      }
    }

    return filledData;
  }

  /**
   * Helper: Fill missing time slots with zero values for anomaly stats
   */
  private fillMissingAnomalySlots(
    data: AnomalyTrendPoint[],
    limit: number,
    interval: 'minute' | 'hour' | 'day' | 'week'
  ): AnomalyTrendPoint[] {
    const now = new Date();
    const filledData: AnomalyTrendPoint[] = [];
    const dataMap = new Map(data.map(d => [d.hour, d]));

    // Generate all expected time slots
    for (let i = limit - 1; i >= 0; i--) {
      let slotDate: Date;
      let hourFormat: string;

      switch (interval) {
        case 'minute': {
          slotDate = new Date(now.getTime() - i * 60 * 1000);
          hourFormat =
            slotDate.toISOString().substring(0, 16).replace('T', ' ') + ':00';
          break;
        }
        case 'hour': {
          slotDate = new Date(now.getTime() - i * 60 * 60 * 1000);
          hourFormat =
            slotDate.toISOString().substring(0, 13).replace('T', ' ') +
            ':00:00';
          break;
        }
        case 'day': {
          slotDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          hourFormat = slotDate.toISOString().substring(0, 10);
          break;
        }
        case 'week': {
          slotDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          const year = slotDate.getFullYear();
          const week = this.getWeekNumber(slotDate);
          hourFormat = `${year}-${String(week).padStart(2, '0')}`;
          break;
        }
      }

      const existing = dataMap.get(hourFormat);

      if (existing) {
        filledData.push(existing);
      } else {
        filledData.push({
          hour: hourFormat,
          timestamp: hourFormat,
          totalTransactions: 0,
          anomalyCount: 0,
          averageScore: 0,
          averageRiskScore: 0,
          highRiskCount: 0,
          anomalyRate: 0,
        });
      }
    }

    return filledData;
  }

  /**
   * Get real-time statistics with caching
   */
  async getRealtimeStats(filters?: StatisticsFilters): Promise<RealtimeStats> {
    const cacheKey = filters
      ? `${CACHE_KEYS.REALTIME_STATS}:${filters.startDate}:${filters.endDate}:${filters.tokenSymbol || 'all'}`
      : CACHE_KEYS.REALTIME_STATS;

    try {
      // Try to get from cache first
      const cached = await redisService.get<RealtimeStats>(cacheKey);
      if (cached) {
        return cached;
      }

      // Calculate real-time stats
      const stats = await this.calculateRealtimeStats(filters);

      // Cache for 1 minute
      await redisService.set(cacheKey, stats, CACHE_TTL.REALTIME);

      return stats;
    } catch (error) {
      logger.error('Error getting realtime stats:', error);
      // Fallback to direct calculation
      return this.calculateRealtimeStats(filters);
    }
  }

  /**
   * Calculate real-time statistics from database
   */
  private async calculateRealtimeStats(
    filters?: StatisticsFilters
  ): Promise<RealtimeStats> {
    const now = new Date();
    // Use filters if provided, otherwise default to 24h
    const startDate = filters?.startDate
      ? new Date(filters.startDate)
      : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endDate = filters?.endDate ? new Date(filters.endDate) : now;

    // Build token filter if specified
    const tokenFilter = filters?.tokenSymbol
      ? { tokenSymbol: filters.tokenSymbol }
      : {};

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
      // Total transactions (filtered by token if specified)
      prisma.transaction.count({
        where: tokenFilter,
      }),

      // Total volume (sum all tokens in wei, filtered by token if specified)
      prisma.transaction.aggregate({
        where: tokenFilter,
        _sum: { value: true },
      }),

      // Active addresses (unique addresses in time range)
      filters?.tokenSymbol
        ? prisma.$queryRaw<{ count: number }[]>`
            SELECT COUNT(DISTINCT address) as count FROM (
              SELECT fromAddress as address FROM transactions
              WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
              AND tokenSymbol = ${filters.tokenSymbol}
              UNION
              SELECT toAddress as address FROM transactions
              WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
              AND tokenSymbol = ${filters.tokenSymbol}
            ) as unique_addresses
          `
        : prisma.$queryRaw<{ count: number }[]>`
            SELECT COUNT(DISTINCT address) as count FROM (
              SELECT fromAddress as address FROM transactions
              WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
              UNION
              SELECT toAddress as address FROM transactions
              WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
            ) as unique_addresses
          `,

      // Transactions in time range
      prisma.transaction.count({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          ...tokenFilter,
        },
      }),

      // Volume in time range
      prisma.transaction.aggregate({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          ...tokenFilter,
        },
        _sum: { value: true },
      }),

      // Token-specific stats for time range
      filters?.tokenSymbol
        ? prisma.$queryRaw<any[]>`
            SELECT
              tokenSymbol,
              tokenAddress,
              COUNT(*) as transactionCount,
              SUM(value) as totalVolume,
              COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses,
              AVG(value) as averageTransactionSize
            FROM transactions
            WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
            AND tokenSymbol = ${filters.tokenSymbol}
            GROUP BY tokenSymbol, tokenAddress
            ORDER BY totalVolume DESC
          `
        : prisma.$queryRaw<any[]>`
            SELECT
              tokenSymbol,
              tokenAddress,
              COUNT(*) as transactionCount,
              SUM(value) as totalVolume,
              COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses,
              AVG(value) as averageTransactionSize
            FROM transactions
            WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
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
    const limit = filters.limit || 24;
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - limit * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    // DEBUG: Log parameters
    logger.info('getHourlyVolumeStats parameters:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit,
      tokenSymbol: filters.tokenSymbol,
      timeDiff: (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60), // hours
    });

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
      ORDER BY hour ASC
      LIMIT ?
    `;

    const params: any[] = [startDate, endDate];
    if (filters.tokenSymbol) {
      params.push(filters.tokenSymbol);
    }
    params.push(limit);

    logger.info('SQL Query:', query);
    logger.info(
      'SQL Params:',
      params.map(p => (p instanceof Date ? p.toISOString() : p))
    );

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    logger.info(`Query returned ${results.length} rows`);

    const mappedResults = results.map(result => ({
      hour: result.hour,
      tokenSymbol: result.tokenSymbol,
      transactionCount: Number(result.transactionCount),
      totalVolume: result.volume?.toString() || '0',
      uniqueAddresses: Number(result.uniqueAddresses),
      averageVolume: result.averageTransactionSize?.toString() || '0',
      gasUsed: result.gasUsed?.toString() || '0',
      anomalyCount: Number(result.anomalyCount),
    }));

    // Fill missing time slots with zero values
    return this.fillMissingTimeSlots(
      mappedResults,
      limit,
      'hour',
      filters.tokenSymbol
    );
  }

  /**
   * Get minute-level volume statistics (1-minute intervals)
   * Used for 1-hour time range to provide finer granularity
   */
  async getMinuteVolumeStats(
    filters: StatisticsFilters
  ): Promise<HourlyVolumeStats[]> {
    const limit = filters.limit || 60; // Default 60 points for 1 hour (1-min intervals)
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - limit * 60 * 1000); // limit minutes
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    // Use 1-minute intervals
    const query = `
      SELECT
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:00') as hour,
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
      ORDER BY hour ASC
      LIMIT ?
    `;

    const params: any[] = [startDate, endDate];
    if (filters.tokenSymbol) {
      params.push(filters.tokenSymbol);
    }
    params.push(limit);

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const mappedResults = results.map(result => ({
      hour: result.hour,
      tokenSymbol: result.tokenSymbol,
      transactionCount: Number(result.transactionCount),
      totalVolume: result.volume?.toString() || '0',
      uniqueAddresses: Number(result.uniqueAddresses),
      averageVolume: result.averageTransactionSize?.toString() || '0',
      gasUsed: result.gasUsed?.toString() || '0',
      anomalyCount: Number(result.anomalyCount),
    }));

    // Fill missing time slots with zero values
    return this.fillMissingTimeSlots(
      mappedResults,
      limit,
      'minute',
      filters.tokenSymbol
    );
  }

  /**
   * Get daily volume statistics
   */
  async getDailyVolumeStats(
    filters: StatisticsFilters
  ): Promise<DailyVolumeStats[]> {
    const limit = filters.limit || 30;
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - limit * 24 * 60 * 60 * 1000); // limit days
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const query = `
      SELECT
        DATE_FORMAT(timestamp, '%Y-%m-%d') as hour,
        tokenSymbol,
        COUNT(*) as transactionCount,
        SUM(value) as volume,
        COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses,
        AVG(value) as averageTransactionSize,
        SUM(gasUsed) as gasUsed,
        SUM(CASE WHEN isAnomaly = true THEN 1 ELSE 0 END) as anomalyCount,
        MAX(value) as highestTransaction
      FROM transactions
      WHERE timestamp >= ? AND timestamp <= ?
      ${filters.tokenSymbol ? 'AND tokenSymbol = ?' : ''}
      GROUP BY hour, tokenSymbol
      ORDER BY hour ASC
      LIMIT ?
    `;

    const params: any[] = [startDate, endDate];
    if (filters.tokenSymbol) {
      params.push(filters.tokenSymbol);
    }
    params.push(limit);

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const mappedResults = results.map(result => ({
      hour: result.hour,
      tokenSymbol: result.tokenSymbol,
      transactionCount: Number(result.transactionCount),
      totalVolume: result.volume?.toString() || '0',
      uniqueAddresses: Number(result.uniqueAddresses),
      averageVolume: result.averageTransactionSize?.toString() || '0',
      gasUsed: result.gasUsed?.toString() || '0',
      anomalyCount: Number(result.anomalyCount),
      highestTransaction: result.highestTransaction?.toString() || '0',
      peakHour: 0, // Not applicable for daily aggregation
    }));

    // Fill missing time slots with zero values
    return this.fillMissingTimeSlots(
      mappedResults,
      limit,
      'day',
      filters.tokenSymbol,
      {
        highestTransaction: '0',
        peakHour: 0,
      }
    );
  }

  /**
   * Get weekly volume statistics
   */
  async getWeeklyVolumeStats(
    filters: StatisticsFilters
  ): Promise<WeeklyVolumeStats[]> {
    const limit = filters.limit || 52;
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - limit * 7 * 24 * 60 * 60 * 1000); // limit weeks
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    // Subquery to find peak day per week
    const query = `
      WITH weekly_data AS (
        SELECT
          DATE_FORMAT(timestamp, '%X-%V') as week,
          tokenSymbol,
          COUNT(*) as transactionCount,
          SUM(value) as volume,
          COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses,
          AVG(value) as averageTransactionSize,
          SUM(gasUsed) as gasUsed,
          SUM(CASE WHEN isAnomaly = true THEN 1 ELSE 0 END) as anomalyCount,
          MAX(value) as highestTransaction
        FROM transactions
        WHERE timestamp >= ? AND timestamp <= ?
        ${filters.tokenSymbol ? 'AND tokenSymbol = ?' : ''}
        GROUP BY week, tokenSymbol
      ),
      peak_days AS (
        SELECT
          DATE_FORMAT(timestamp, '%X-%V') as week,
          tokenSymbol,
          DAYOFWEEK(timestamp) as dayOfWeek,
          COUNT(*) as dayTransactionCount,
          ROW_NUMBER() OVER (PARTITION BY DATE_FORMAT(timestamp, '%X-%V'), tokenSymbol ORDER BY COUNT(*) DESC) as rn
        FROM transactions
        WHERE timestamp >= ? AND timestamp <= ?
        ${filters.tokenSymbol ? 'AND tokenSymbol = ?' : ''}
        GROUP BY week, tokenSymbol, DAYOFWEEK(timestamp)
      )
      SELECT
        wd.week as hour,
        wd.tokenSymbol,
        wd.transactionCount,
        wd.volume,
        wd.uniqueAddresses,
        wd.averageTransactionSize,
        wd.gasUsed,
        wd.anomalyCount,
        wd.highestTransaction,
        COALESCE(pd.dayOfWeek, 1) as peakDay
      FROM weekly_data wd
      LEFT JOIN peak_days pd ON wd.week = pd.week AND wd.tokenSymbol = pd.tokenSymbol AND pd.rn = 1
      ORDER BY wd.week ASC
      LIMIT ?
    `;

    const params: any[] = [startDate, endDate];
    if (filters.tokenSymbol) {
      params.push(filters.tokenSymbol);
    }
    params.push(startDate, endDate);
    if (filters.tokenSymbol) {
      params.push(filters.tokenSymbol);
    }
    params.push(limit);

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const mappedResults = results.map(result => ({
      hour: result.hour,
      tokenSymbol: result.tokenSymbol,
      transactionCount: Number(result.transactionCount),
      totalVolume: result.volume?.toString() || '0',
      uniqueAddresses: Number(result.uniqueAddresses),
      averageVolume: result.averageTransactionSize?.toString() || '0',
      gasUsed: result.gasUsed?.toString() || '0',
      anomalyCount: Number(result.anomalyCount),
      highestTransaction: result.highestTransaction?.toString() || '0',
      peakDay: Number(result.peakDay),
    }));

    // Fill missing time slots with zero values
    return this.fillMissingTimeSlots(
      mappedResults,
      limit,
      'week',
      filters.tokenSymbol,
      {
        highestTransaction: '0',
        peakDay: 1,
      }
    );
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
        case '3m':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 3 months
          break;
        case '6m':
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 6 months
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year
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
        case '3m':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 3 months
          break;
        case '6m':
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 6 months
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year
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
        case '3m':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 3 months
          break;
        case '6m':
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 6 months
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year
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
   * Get anomaly time series data (minute-level, 1-minute intervals)
   * Used for 1-hour time range
   */
  async getAnomalyTimeSeriesMinutes(
    filters: StatisticsFilters
  ): Promise<AnomalyTrendPoint[]> {
    const limit = filters.limit || 60;
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - limit * 60 * 1000); // limit minutes
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    let query = `
      SELECT
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:00') as hour,
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:00') as timestamp,
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
      ORDER BY hour ASC
      LIMIT ?
    `;
    params.push(limit);

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const mappedResults = results.map(trend => ({
      hour: trend.hour,
      timestamp: trend.timestamp,
      totalTransactions: Number(trend.totalTransactions),
      anomalyCount: Number(trend.anomalyCount),
      averageScore: Number(trend.averageScore),
      averageRiskScore: Number(trend.averageScore), // Keep for backward compatibility
      highRiskCount: Number(trend.highRiskCount),
      anomalyRate: Number(trend.anomalyRate),
    }));

    // Fill missing time slots with zero values
    return this.fillMissingAnomalySlots(mappedResults, limit, 'minute');
  }

  /**
   * Get anomaly time series data (hourly)
   * Used for 24h and 7d time ranges
   */
  async getAnomalyTimeSeries(
    filters: StatisticsFilters
  ): Promise<AnomalyTrendPoint[]> {
    const limit = filters.limit || 24;
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - limit * 60 * 60 * 1000); // limit hours
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

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
      ORDER BY hour ASC
      LIMIT ?
    `;
    params.push(limit);

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const mappedResults = results.map(trend => ({
      hour: trend.hour,
      timestamp: trend.timestamp,
      totalTransactions: Number(trend.totalTransactions),
      anomalyCount: Number(trend.anomalyCount),
      averageScore: Number(trend.averageScore),
      averageRiskScore: Number(trend.averageScore), // Keep for backward compatibility
      highRiskCount: Number(trend.highRiskCount),
      anomalyRate: Number(trend.anomalyRate),
    }));

    // Fill missing time slots with zero values
    return this.fillMissingAnomalySlots(mappedResults, limit, 'hour');
  }

  /**
   * Get anomaly time series data (daily)
   * Used for 30d+ time ranges
   */
  async getAnomalyTimeSeriesDaily(
    filters: StatisticsFilters
  ): Promise<AnomalyTrendPoint[]> {
    const limit = filters.limit || 30;
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - limit * 24 * 60 * 60 * 1000); // limit days
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    let query = `
      SELECT
        DATE_FORMAT(timestamp, '%Y-%m-%d') as hour,
        DATE_FORMAT(timestamp, '%Y-%m-%d') as timestamp,
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
      ORDER BY hour ASC
      LIMIT ?
    `;
    params.push(limit);

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const mappedResults = results.map(trend => ({
      hour: trend.hour,
      timestamp: trend.timestamp,
      totalTransactions: Number(trend.totalTransactions),
      anomalyCount: Number(trend.anomalyCount),
      averageScore: Number(trend.averageScore),
      averageRiskScore: Number(trend.averageScore), // Keep for backward compatibility
      highRiskCount: Number(trend.highRiskCount),
      anomalyRate: Number(trend.anomalyRate),
    }));

    // Fill missing time slots with zero values
    return this.fillMissingAnomalySlots(mappedResults, limit, 'day');
  }

  /**
   * Get anomaly time series data (weekly)
   * Used for 6m, 1y, all time ranges
   */
  async getAnomalyTimeSeriesWeekly(
    filters: StatisticsFilters
  ): Promise<AnomalyTrendPoint[]> {
    const limit = filters.limit || 52;
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - limit * 7 * 24 * 60 * 60 * 1000); // limit weeks
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    let query = `
      SELECT
        DATE_FORMAT(timestamp, '%Y-%u') as hour,
        DATE_FORMAT(timestamp, '%Y-%u') as timestamp,
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
      ORDER BY hour ASC
      LIMIT ?
    `;
    params.push(limit);

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const mappedResults = results.map(trend => ({
      hour: trend.hour,
      timestamp: trend.timestamp,
      totalTransactions: Number(trend.totalTransactions),
      anomalyCount: Number(trend.anomalyCount),
      averageScore: Number(trend.averageScore),
      averageRiskScore: Number(trend.averageScore), // Keep for backward compatibility
      highRiskCount: Number(trend.highRiskCount),
      anomalyRate: Number(trend.anomalyRate),
    }));

    // Fill missing time slots with zero values
    return this.fillMissingAnomalySlots(mappedResults, limit, 'week');
  }
}
