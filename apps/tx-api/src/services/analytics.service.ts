import { prisma } from '@msq-tx-monitor/database';
import { Prisma } from '@prisma/client';
import { apiLogger } from '@msq-tx-monitor/msq-common';

export interface HourlyVolumeData {
  datetime: string;
  tokenSymbol: string;
  totalVolume: string;
  transactionCount: number;
  averageVolume: string;
}

export interface TokenStats {
  tokenSymbol: string;
  totalVolume: string;
  transactionCount: number;
  uniqueAddresses24h: number;
  volume24h: string;
}

export interface RealtimeStats {
  totalTransactions: number;
  totalVolume: string;
  activeAddresses: number;
  activeTokens: number;
  tokenStats: TokenStats[];
}

export class AnalyticsService {
  constructor() {
    // Prisma client is already initialized and available
  }

  /**
   * Get hourly volume aggregation for the last N hours
   */
  async getHourlyVolume(
    tokenSymbol?: string,
    limit: number = 24
  ): Promise<HourlyVolumeData[]> {
    try {
      // Hourly endpoint: return latest {limit} hourly data points
      // No hours parameter needed - endpoint determines the interval
      const maxResults = limit * 2;

      // Use DATETIME calculation for hourly intervals
      const dateExpression = `DATE_ADD(DATE(timestamp), INTERVAL HOUR(timestamp) HOUR)`;

      const rows = tokenSymbol
        ? await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateExpression)} as datetime,
              tokenSymbol,
              SUM(value) as totalVolume,
              COUNT(*) as transactionCount,
              CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
            FROM transactions
            WHERE tokenSymbol = ${tokenSymbol}
            GROUP BY datetime, tokenSymbol
            ORDER BY datetime DESC, tokenSymbol
            LIMIT ${maxResults}
          `
        : await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateExpression)} as datetime,
              tokenSymbol,
              SUM(value) as totalVolume,
              COUNT(*) as transactionCount,
              CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
            FROM transactions
            GROUP BY datetime, tokenSymbol
            ORDER BY datetime DESC, tokenSymbol
            LIMIT ${maxResults}
          `;

      const rawData = rows.map(row => {
        return {
          datetime: new Date(row.datetime).toISOString(),
          tokenSymbol: row.tokenSymbol,
          totalVolume: row.totalVolume.toString(),
          transactionCount: parseInt(row.transactionCount.toString()),
          averageVolume: row.averageVolume.toString(),
        };
      });

      // Reverse to show oldest to newest (SQL query uses DESC order)
      // Fill missing hourly data points with zeros
      const filledData = this.fillMissingHourlyData(
        rawData.reverse(),
        limit, // hours
        tokenSymbol,
        limit,
        'hour',
        60 // 1 hour = 60 minutes
      );
      return filledData;
    } catch (error) {
      apiLogger.error('Error fetching hourly volume data:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        tokenSymbol,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get realtime statistics
   */
  async getRealtimeStats(
    tokenSymbol?: string,
    timeRange?: string
  ): Promise<RealtimeStats> {
    try {
      // Parse time range and get cutoff date
      const hours = this.parseTimeRange(timeRange);
      const cutoffDate = this.getCutoffDate(hours);

      // Build WHERE clause conditions
      const conditions: string[] = [];
      if (cutoffDate) {
        conditions.push(`timestamp >= '${cutoffDate.toISOString()}'`);
      }
      if (tokenSymbol) {
        conditions.push(`tokenSymbol = '${tokenSymbol}'`);
      }
      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get overall stats with time filtering
      const totalStatsQuery = `
        SELECT
          COUNT(*) as totalTransactions,
          SUM(value) as totalVolume,
          COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as activeAddresses
        FROM transactions
        ${whereClause}
      `;

      // Get token stats with time filtering
      const tokenStatsQuery = tokenSymbol
        ? `
          SELECT
            tokenSymbol,
            SUM(value) as totalVolume,
            COUNT(*) as transactionCount,
            COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses24h,
            SUM(value) as volume24h
          FROM transactions
          ${whereClause}
          GROUP BY tokenSymbol
        `
        : `
          SELECT
            tokenSymbol,
            SUM(value) as totalVolume,
            COUNT(*) as transactionCount,
            COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses24h,
            SUM(value) as volume24h
          FROM transactions
          ${whereClause}
          GROUP BY tokenSymbol
        `;

      const activeTokensQuery = `
        SELECT COUNT(DISTINCT tokenSymbol) as activeTokens
        FROM transactions
        ${whereClause}
      `;

      const [totalStatsRows, tokenStatsRows, activeTokensRows] =
        await Promise.all([
          prisma.$queryRawUnsafe(totalStatsQuery) as Promise<any[]>,
          prisma.$queryRawUnsafe(tokenStatsQuery) as Promise<any[]>,
          prisma.$queryRawUnsafe(activeTokensQuery) as Promise<any[]>,
        ]);

      const totalStats = totalStatsRows[0] || {
        totalTransactions: 0,
        totalVolume: '0',
        activeAddresses: 0,
      };
      const activeTokens = activeTokensRows[0]?.activeTokens || 0;

      const tokenStats: TokenStats[] = tokenStatsRows.map(row => ({
        tokenSymbol: row.tokenSymbol,
        totalVolume: row.totalVolume.toString(),
        transactionCount: parseInt(row.transactionCount.toString()),
        uniqueAddresses24h: parseInt(row.uniqueAddresses24h.toString()),
        volume24h: row.volume24h.toString(),
      }));

      return {
        totalTransactions: parseInt(totalStats.totalTransactions.toString()),
        totalVolume: totalStats.totalVolume.toString(),
        activeAddresses: parseInt(totalStats.activeAddresses.toString()),
        activeTokens: parseInt(activeTokens.toString()),
        tokenStats,
      };
    } catch (error) {
      apiLogger.error('Error fetching realtime stats', error);
      throw new Error('Failed to fetch realtime stats');
    }
  }

  /**
   * Get token distribution data
   */
  async getTokenDistribution(tokenSymbol?: string): Promise<any[]> {
    try {
      // Token distribution: show all-time distribution
      // Token filtering is still supported
      const whereClause = tokenSymbol
        ? `WHERE tokenSymbol = '${tokenSymbol}'`
        : '';

      const query = `
        SELECT
          tokenSymbol,
          COUNT(*) as transactionCount,
          SUM(value) as volume
        FROM transactions
        ${whereClause}
        GROUP BY tokenSymbol
        ORDER BY volume DESC
      `;

      const rows = (await prisma.$queryRawUnsafe(query)) as any[];

      // Calculate total volume for percentage calculation
      const totalVolume = rows.reduce(
        (sum, row) => sum + parseFloat(row.volume.toString()),
        0
      );

      return rows.map(row => {
        const volume = parseFloat(row.volume.toString());
        const percentage = totalVolume > 0 ? (volume / totalVolume) * 100 : 0;

        return {
          tokenSymbol: row.tokenSymbol,
          transactionCount: parseInt(row.transactionCount.toString()),
          volume: row.volume.toString(),
          percentage: parseFloat(percentage.toFixed(2)),
          color: this.getTokenColor(row.tokenSymbol),
        };
      });
    } catch (error) {
      apiLogger.error('Error fetching token distribution', error);
      throw new Error('Failed to fetch token distribution');
    }
  }

  /**
   * Get top addresses by volume (now using AddressStatistics)
   */
  async getTopAddresses(
    metric: 'volume' | 'transactions' = 'volume',
    limit: number = 10,
    tokenSymbol?: string,
    timeRange?: string
  ): Promise<any[]> {
    try {
      // Parse time range and get cutoff date
      const hours = this.parseTimeRange(timeRange);
      const cutoffDate = this.getCutoffDate(hours);

      // Build WHERE conditions
      const conditions: string[] = ['1=1'];
      if (cutoffDate) {
        conditions.push(`timestamp >= '${cutoffDate.toISOString()}'`);
      }
      if (tokenSymbol) {
        conditions.push(`tokenSymbol = '${tokenSymbol}'`);
      }
      const whereClause = conditions.join(' AND ');

      // Query transactions table directly with UNION ALL pattern
      const query = `
        SELECT
          address,
          CAST(SUM(totalSent) AS CHAR) as totalSent,
          CAST(SUM(totalReceived) AS CHAR) as totalReceived,
          SUM(transactionCountSent) as transactionCountSent,
          SUM(transactionCountReceived) as transactionCountReceived
        FROM (
          -- Sent transactions
          SELECT
            fromAddress as address,
            SUM(value) as totalSent,
            0 as totalReceived,
            COUNT(*) as transactionCountSent,
            0 as transactionCountReceived
          FROM transactions
          WHERE ${whereClause}
          GROUP BY fromAddress

          UNION ALL

          -- Received transactions
          SELECT
            toAddress as address,
            0 as totalSent,
            SUM(value) as totalReceived,
            0 as transactionCountSent,
            COUNT(*) as transactionCountReceived
          FROM transactions
          WHERE ${whereClause}
          GROUP BY toAddress
        ) as combined
        GROUP BY address
        ORDER BY ${metric === 'volume' ? '(SUM(totalSent) + SUM(totalReceived))' : '(SUM(transactionCountSent) + SUM(transactionCountReceived))'} DESC
        LIMIT ?
      `;

      const addresses = await prisma.$queryRawUnsafe<any[]>(query, limit);

      // Process and format results
      return addresses.map((addr, index) => {
        const totalReceived = BigInt(addr.totalReceived || 0);
        const totalSent = BigInt(addr.totalSent || 0);
        const totalVolume = totalReceived + totalSent;
        const transactionCount =
          Number(addr.transactionCountReceived || 0) +
          Number(addr.transactionCountSent || 0);

        return {
          rank: index + 1,
          address: addr.address,
          totalVolume: totalVolume.toString(),
          totalReceived: totalReceived.toString(),
          totalSent: totalSent.toString(),
          transactionCount,
          uniqueInteractions: 1,
          metric:
            metric === 'volume'
              ? totalVolume.toString()
              : transactionCount.toString(),
        };
      });
    } catch (error) {
      apiLogger.error('Error fetching top addresses', error);
      throw new Error('Failed to fetch top addresses');
    }
  }

  /**
   * Get anomaly statistics
   */
  async getAnomalyStats(_tokenSymbol?: string): Promise<any> {
    try {
      // Temporary simple implementation to debug
      return {
        totalTransactions: 100,
        totalAnomalies: 5,
        anomalyCount: 5,
        anomalyRate: 5.0,
        averageAnomalyScore: 0.25,
        maxAnomalyScore: 0.85,
        suspiciousAddresses: 3,
        highRiskTransactions: 2,
        highRiskCount: 2,
        mediumRiskCount: 2,
        lowRiskCount: 96,
      };
    } catch (error) {
      apiLogger.error('Error fetching anomaly stats', error);
      if (error instanceof Error) {
        apiLogger.error('Error details:', {
          message: error.message,
          stack: error.stack,
        });
      }
      throw new Error('Failed to fetch anomaly stats');
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(tokenSymbol?: string): Promise<any> {
    try {
      // Network stats: show all-time network statistics
      // Token filtering is still supported
      const whereClause = tokenSymbol
        ? `WHERE tokenSymbol = '${tokenSymbol}'`
        : '';

      const query = `
        SELECT
          AVG(gasUsed) as avgGasUsed,
          AVG(gasPrice) as avgGasPrice,
          MAX(gasUsed) as maxGasUsed,
          MAX(gasPrice) as maxGasPrice,
          COUNT(DISTINCT blockNumber) as totalBlocks
        FROM transactions
        ${whereClause}
      `;

      const rows = (await prisma.$queryRawUnsafe(query)) as any[];
      const result = rows[0];

      return {
        avgGasUsed: parseFloat(result.avgGasUsed?.toString() || '0'),
        avgGasPrice: parseFloat(result.avgGasPrice?.toString() || '0'),
        maxGasUsed: parseInt(result.maxGasUsed?.toString() || '0'),
        maxGasPrice: parseInt(result.maxGasPrice?.toString() || '0'),
        totalBlocks: parseInt(result.totalBlocks.toString()),
        networkUtilization: Math.random() * 100, // Placeholder - would need real network data
      };
    } catch (error) {
      apiLogger.error('Error fetching network stats', error);
      throw new Error('Failed to fetch network stats');
    }
  }

  /**
   * Get top receivers (addresses receiving the most transactions)
   */
  async getTopReceivers(
    limit: number = 10,
    tokenSymbol?: string,
    timeRange?: string
  ): Promise<any[]> {
    try {
      // Parse time range and get cutoff date
      const hours = this.parseTimeRange(timeRange);
      const cutoffDate = this.getCutoffDate(hours);

      // Build WHERE conditions
      const conditions: string[] = [];
      if (cutoffDate) {
        conditions.push(`timestamp >= '${cutoffDate.toISOString()}'`);
      }
      if (tokenSymbol) {
        conditions.push(`tokenSymbol = '${tokenSymbol}'`);
      }
      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT
          toAddress as address,
          COUNT(*) as transactionCount,
          SUM(CAST(value AS DECIMAL(65, 0))) as totalVolume
        FROM transactions
        ${whereClause}
        GROUP BY toAddress
        ORDER BY transactionCount DESC
        LIMIT ${limit}
      `;

      const rows = (await prisma.$queryRawUnsafe(query)) as any[];

      return rows.map((row, index) => ({
        rank: index + 1,
        address: row.address,
        totalVolume: row.totalVolume?.toString() || '0',
        transactionCount: parseInt(row.transactionCount.toString()),
        metric: parseInt(row.transactionCount.toString()),
      }));
    } catch (error) {
      apiLogger.error('Error fetching top receivers', error);
      throw new Error('Failed to fetch top receivers');
    }
  }

  /**
   * Get top senders (addresses sending the most transactions)
   */
  async getTopSenders(
    limit: number = 10,
    tokenSymbol?: string,
    timeRange?: string
  ): Promise<any[]> {
    try {
      // Parse time range and get cutoff date
      const hours = this.parseTimeRange(timeRange);
      const cutoffDate = this.getCutoffDate(hours);

      // Build WHERE conditions
      const conditions: string[] = [];
      if (cutoffDate) {
        conditions.push(`timestamp >= '${cutoffDate.toISOString()}'`);
      }
      if (tokenSymbol) {
        conditions.push(`tokenSymbol = '${tokenSymbol}'`);
      }
      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT
          fromAddress as address,
          COUNT(*) as transactionCount,
          SUM(CAST(value AS DECIMAL(65, 0))) as totalVolume
        FROM transactions
        ${whereClause}
        GROUP BY fromAddress
        ORDER BY transactionCount DESC
        LIMIT ${limit}
      `;

      const rows = (await prisma.$queryRawUnsafe(query)) as any[];

      return rows.map((row, index) => ({
        rank: index + 1,
        address: row.address,
        totalVolume: row.totalVolume?.toString() || '0',
        transactionCount: parseInt(row.transactionCount.toString()),
        metric: parseInt(row.transactionCount.toString()),
      }));
    } catch (error) {
      apiLogger.error('Error fetching top senders', error);
      throw new Error('Failed to fetch top senders');
    }
  }

  /**
   * Get anomaly time series data
   */
  async getAnomalyTimeSeries(
    hours: number = 24,
    tokenSymbol?: string,
    limit: number = 24
  ): Promise<any[]> {
    try {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Determine interval type and format based on time range
      let intervalType: 'minute' | 'hour' | 'day' | 'week' | 'month';
      let dateFormat: string;
      let intervalMinutes: number;

      if (hours <= 1) {
        intervalType = 'minute';
        intervalMinutes = 5;
        dateFormat = '%Y-%m-%d %H:%i:00'; // 5-minute intervals
      } else if (hours <= 168) {
        intervalType = 'hour';
        intervalMinutes = 60;
        dateFormat = '%Y-%m-%d %H:00:00'; // Hourly intervals
      } else if (hours <= 2160) {
        intervalType = 'day';
        intervalMinutes = 1440;
        dateFormat = '%Y-%m-%d'; // Daily intervals
      } else if (hours <= 8760) {
        intervalType = 'week';
        intervalMinutes = 10080;
        dateFormat = '%Y-%u'; // Year-Week format (ISO week)
      } else {
        intervalType = 'month';
        intervalMinutes = 43200;
        dateFormat = '%Y-%m'; // Year-Month format
      }

      // Use Prisma.$queryRaw with proper SQL - dateFormat cannot be parameterized
      // Use alias in GROUP BY which MySQL supports to satisfy ONLY_FULL_GROUP_BY
      const maxResults = limit * 2;
      const dateFormatExpression = `DATE_FORMAT(timestamp, '${dateFormat}')`;

      const rows = tokenSymbol
        ? await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateFormatExpression)} as hour,
              COUNT(*) as totalTransactions,
              SUM(CASE WHEN isAnomaly = true THEN 1 ELSE 0 END) as anomalyCount,
              AVG(anomalyScore) as averageScore,
              SUM(CASE WHEN anomalyScore > 0.7 THEN 1 ELSE 0 END) as highRiskCount,
              (SUM(CASE WHEN isAnomaly = true THEN 1 ELSE 0 END) / COUNT(*) * 100) as anomalyRate
            FROM transactions
            WHERE timestamp >= ${cutoffDate} AND tokenSymbol = ${tokenSymbol}
            GROUP BY hour
            ORDER BY hour DESC
            LIMIT ${maxResults}
          `
        : await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateFormatExpression)} as hour,
              COUNT(*) as totalTransactions,
              SUM(CASE WHEN isAnomaly = true THEN 1 ELSE 0 END) as anomalyCount,
              AVG(anomalyScore) as averageScore,
              SUM(CASE WHEN anomalyScore > 0.7 THEN 1 ELSE 0 END) as highRiskCount,
              (SUM(CASE WHEN isAnomaly = true THEN 1 ELSE 0 END) / COUNT(*) * 100) as anomalyRate
            FROM transactions
            WHERE timestamp >= ${cutoffDate}
            GROUP BY hour
            ORDER BY hour DESC
            LIMIT ${maxResults}
          `;

      const rawData = rows.map(row => {
        // Only add 'Z' for datetime formats (minute/hour), not for date formats (day/week/month)
        const hourValue =
          intervalType === 'minute' || intervalType === 'hour'
            ? `${row.hour}Z` // Add UTC timezone indicator for datetime
            : row.hour; // Keep as-is for date formats

        return {
          timestamp: hourValue,
          hour: hourValue,
          anomalyCount: parseInt(row.anomalyCount.toString()),
          averageScore: parseFloat(row.averageScore?.toString() || '0'),
          highRiskCount: parseInt(row.highRiskCount.toString()),
          totalTransactions: parseInt(row.totalTransactions.toString()),
          anomalyRate: parseFloat(row.anomalyRate?.toString() || '0'),
        };
      });

      // Fill missing data points with zeros to ensure consistent chart intervals
      const filledData = this.fillMissingAnomalyData(
        rawData,
        hours,
        limit,
        intervalType,
        intervalMinutes
      );

      return filledData;
    } catch (error) {
      apiLogger.error('Error fetching anomaly time series:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        hours,
        tokenSymbol,
        limit,
        cutoffDate: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
      });
      throw error;
    }
  }

  /**
   * Generate complete time intervals for consistent chart data
   */
  private generateTimeIntervals(
    hours: number,
    intervalMinutes: number = 60,
    intervalType: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'hour'
  ): Date[] {
    const intervals: Date[] = [];
    const endTime = new Date();

    // Round down based on interval type
    if (intervalType === 'minute' || intervalType === 'hour') {
      endTime.setMinutes(
        Math.floor(endTime.getMinutes() / intervalMinutes) * intervalMinutes
      );
      endTime.setSeconds(0);
      endTime.setMilliseconds(0);
    } else if (intervalType === 'day') {
      endTime.setHours(0, 0, 0, 0);
      endTime.setDate(endTime.getDate() + 1); // Include today: move to tomorrow 00:00:00
    } else if (intervalType === 'week') {
      // Round to start of week (Monday)
      const day = endTime.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      endTime.setDate(endTime.getDate() + diff);
      endTime.setHours(0, 0, 0, 0);
      endTime.setDate(endTime.getDate() + 7); // Include this week: move to next Monday
    } else if (intervalType === 'month') {
      endTime.setDate(1);
      endTime.setHours(0, 0, 0, 0);
      endTime.setMonth(endTime.getMonth() + 1); // Include this month: move to next month 1st
    }

    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const currentTime = new Date(startTime);
    while (currentTime <= endTime) {
      intervals.push(new Date(currentTime));

      // Increment based on interval type
      if (intervalType === 'minute' || intervalType === 'hour') {
        currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
      } else if (intervalType === 'day') {
        currentTime.setDate(currentTime.getDate() + 1);
      } else if (intervalType === 'week') {
        currentTime.setDate(currentTime.getDate() + 7);
      } else if (intervalType === 'month') {
        currentTime.setMonth(currentTime.getMonth() + 1);
      }
    }

    return intervals;
  }

  /**
   * Fill missing hourly volume data points with zeros
   */
  private fillMissingHourlyData(
    data: HourlyVolumeData[],
    hours: number,
    tokenSymbol?: string,
    limit: number = 24,
    intervalType: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'hour',
    intervalMinutes: number = 60
  ): HourlyVolumeData[] {
    const expectedPoints = this.getExpectedDataPoints(hours, limit);

    // Generate all expected time intervals
    const timeIntervals = this.generateTimeIntervals(
      hours,
      intervalMinutes,
      intervalType
    );

    // Take only the required number of points (latest ones)
    const requiredIntervals = timeIntervals.slice(-expectedPoints);

    // Create a map of existing data for quick lookup
    const dataMap = new Map<string, HourlyVolumeData>();
    data.forEach(item => {
      const hourKey = this.formatHourKey(item.datetime, intervalType);
      dataMap.set(hourKey, item);
    });

    // Fill missing data points
    const filledData: HourlyVolumeData[] = requiredIntervals.map(interval => {
      const hourKey = this.formatHourKey(interval.toISOString(), intervalType);
      const existingData = dataMap.get(hourKey);

      if (existingData) {
        return existingData;
      } else {
        // Create zero data point for missing interval
        return {
          datetime: this.formatIntervalString(interval, intervalType),
          tokenSymbol: tokenSymbol || 'UNKNOWN',
          totalVolume: '0',
          transactionCount: 0,
          averageVolume: '0',
        };
      }
    });

    return filledData; // Return in chronological order (oldest to newest)
  }

  /**
   * Fill missing anomaly time series data points with zeros
   */
  private fillMissingAnomalyData(
    data: any[],
    hours: number,
    limit: number = 24,
    intervalType: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'hour',
    intervalMinutes: number = 60
  ): any[] {
    const expectedPoints = this.getExpectedDataPoints(hours, limit);

    // Generate all expected time intervals
    const timeIntervals = this.generateTimeIntervals(
      hours,
      intervalMinutes,
      intervalType
    );

    // Take only the required number of points (latest ones)
    const requiredIntervals = timeIntervals.slice(-expectedPoints);

    // Create a map of existing data for quick lookup
    const dataMap = new Map<string, any>();
    data.forEach(item => {
      const hourKey = this.formatHourKey(item.hour, intervalType);
      dataMap.set(hourKey, item);
    });

    // Fill missing data points
    const filledData = requiredIntervals.map(interval => {
      const hourKey = this.formatHourKey(interval.toISOString(), intervalType);
      const existingData = dataMap.get(hourKey);

      if (existingData) {
        return existingData;
      } else {
        // Create zero data point for missing interval
        const hourString = this.formatIntervalString(interval, intervalType);
        return {
          timestamp: hourString,
          hour: hourString,
          anomalyCount: 0,
          averageScore: 0,
          highRiskCount: 0,
          totalTransactions: 0,
          anomalyRate: 0,
        };
      }
    });

    return filledData; // Return in chronological order (oldest to newest)
  }

  /**
   * Get expected number of data points based on time range and limit
   */
  private getExpectedDataPoints(hours: number, limit: number): number {
    if (hours <= 1) return Math.min(60, limit); // 1-minute intervals = 60 points max
    if (hours <= 24) return 24; // Hourly = 24 points
    if (hours <= 168) return Math.min(168, limit); // Hourly = 168 points max
    if (hours <= 2160) return Math.min(90, limit); // Daily = 90 points max (3 months)
    if (hours <= 8760) return Math.min(52, limit); // Weekly = 52 points max (1 year)
    return limit; // Return requested limit for long time ranges (weekly/monthly with large limits)
  }

  /**
   * Format hour key for consistent lookup
   */
  private formatHourKey(
    hourString: string,
    intervalType: 'minute' | 'hour' | 'day' | 'week' | 'month'
  ): string {
    const date = new Date(hourString);

    if (intervalType === 'minute') {
      // For 1-minute intervals, round to minute
      date.setSeconds(0);
      date.setMilliseconds(0);
      return date.toISOString();
    } else if (intervalType === 'hour') {
      // For hourly intervals, round to hour
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      return date.toISOString();
    } else if (intervalType === 'day') {
      // For daily intervals, round to day at midnight
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    } else if (intervalType === 'week') {
      // For weekly intervals, round to Monday at midnight
      const day = date.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      date.setDate(date.getDate() + diff);
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    } else {
      // For monthly intervals, round to first day of month at midnight
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    }
  }

  /**
   * Get ISO week number for a date
   */
  private getISOWeek(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
    return weekNo;
  }

  /**
   * Format interval string for display
   */
  private formatIntervalString(
    date: Date,
    intervalType: 'minute' | 'hour' | 'day' | 'week' | 'month'
  ): string {
    if (intervalType === 'minute') {
      // Return full ISO 8601 with T separator and milliseconds
      return date.toISOString();
    } else if (intervalType === 'hour') {
      // Return full ISO 8601 with T separator and milliseconds
      return date.toISOString();
    } else if (intervalType === 'day') {
      // Return ISO 8601 datetime at midnight
      return date.toISOString();
    } else if (intervalType === 'week') {
      // Return ISO 8601 datetime at Monday midnight
      return date.toISOString();
    } else {
      // Return ISO 8601 datetime at first day of month midnight
      return date.toISOString();
    }
  }

  /**
   * Get minute-level volume statistics (wrapper for getHourlyVolume with 1 hour)
   */
  async getMinuteVolumeStats(
    tokenSymbol?: string,
    limit: number = 60
  ): Promise<HourlyVolumeData[]> {
    try {
      // Minute endpoint: return latest {limit} minute-level data points (1-minute intervals)
      const maxResults = limit * 2;

      // Use DATETIME calculation for 1-minute intervals
      const dateExpression = `DATE_ADD(
        DATE_ADD(DATE(timestamp), INTERVAL HOUR(timestamp) HOUR),
        INTERVAL MINUTE(timestamp) MINUTE
      )`;

      const rows = tokenSymbol
        ? await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateExpression)} as datetime,
              tokenSymbol,
              SUM(value) as totalVolume,
              COUNT(*) as transactionCount,
              CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
            FROM transactions
            WHERE tokenSymbol = ${tokenSymbol}
            GROUP BY datetime, tokenSymbol
            ORDER BY datetime DESC, tokenSymbol
            LIMIT ${maxResults}
          `
        : await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateExpression)} as datetime,
              tokenSymbol,
              SUM(value) as totalVolume,
              COUNT(*) as transactionCount,
              CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
            FROM transactions
            GROUP BY datetime, tokenSymbol
            ORDER BY datetime DESC, tokenSymbol
            LIMIT ${maxResults}
          `;

      const rawData = rows.map(row => {
        return {
          datetime: new Date(row.datetime).toISOString(),
          tokenSymbol: row.tokenSymbol,
          totalVolume: row.totalVolume.toString(),
          transactionCount: parseInt(row.transactionCount.toString()),
          averageVolume: row.averageVolume.toString(),
        };
      });

      // Reverse to show oldest to newest (SQL query uses DESC order)
      // Fill missing minute data points with zeros
      const filledData = this.fillMissingHourlyData(
        rawData.reverse(),
        1, // 1 hour for minute-level data
        tokenSymbol,
        limit,
        'minute',
        1 // 1-minute intervals
      );
      return filledData;
    } catch (error) {
      apiLogger.error('Error fetching minute volume data:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        tokenSymbol,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get daily volume statistics (wrapper for getHourlyVolume with dynamic days)
   */
  async getDailyVolumeStats(
    tokenSymbol?: string,
    limit: number = 30
  ): Promise<HourlyVolumeData[]> {
    try {
      // Daily endpoint: return latest {limit} daily data points
      const maxResults = limit * 2;

      // Use DATETIME calculation for daily intervals (midnight of each day)
      const dateExpression = `CAST(DATE(timestamp) AS DATETIME)`;

      const rows = tokenSymbol
        ? await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateExpression)} as datetime,
              tokenSymbol,
              SUM(value) as totalVolume,
              COUNT(*) as transactionCount,
              CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
            FROM transactions
            WHERE tokenSymbol = ${tokenSymbol}
            GROUP BY datetime, tokenSymbol
            ORDER BY datetime DESC, tokenSymbol
            LIMIT ${maxResults}
          `
        : await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateExpression)} as datetime,
              tokenSymbol,
              SUM(value) as totalVolume,
              COUNT(*) as transactionCount,
              CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
            FROM transactions
            GROUP BY datetime, tokenSymbol
            ORDER BY datetime DESC, tokenSymbol
            LIMIT ${maxResults}
          `;

      const rawData = rows.map(row => {
        return {
          datetime: new Date(row.datetime).toISOString(),
          tokenSymbol: row.tokenSymbol,
          totalVolume: row.totalVolume.toString(),
          transactionCount: parseInt(row.transactionCount.toString()),
          averageVolume: row.averageVolume.toString(),
        };
      });

      // Reverse to show oldest to newest (SQL query uses DESC order)
      // Fill missing daily data points with zeros
      const filledData = this.fillMissingHourlyData(
        rawData.reverse(),
        limit * 24, // days to hours
        tokenSymbol,
        limit,
        'day',
        1440 // 1 day = 1440 minutes
      );
      return filledData;
    } catch (error) {
      apiLogger.error('Error fetching daily volume data:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        tokenSymbol,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get weekly volume statistics (wrapper for getHourlyVolume with dynamic weeks)
   */
  async getWeeklyVolumeStats(
    tokenSymbol?: string,
    limit: number = 52
  ): Promise<HourlyVolumeData[]> {
    try {
      // Weekly endpoint: return latest {limit} weekly data points
      const maxResults = limit * 2;

      // Use DATETIME calculation for weekly intervals (Monday of each week at midnight)
      const dateExpression = `CAST(DATE_SUB(DATE(timestamp), INTERVAL WEEKDAY(timestamp) DAY) AS DATETIME)`;

      const rows = tokenSymbol
        ? await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateExpression)} as datetime,
              tokenSymbol,
              SUM(value) as totalVolume,
              COUNT(*) as transactionCount,
              CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
            FROM transactions
            WHERE tokenSymbol = ${tokenSymbol}
            GROUP BY datetime, tokenSymbol
            ORDER BY datetime DESC, tokenSymbol
            LIMIT ${maxResults}
          `
        : await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateExpression)} as datetime,
              tokenSymbol,
              SUM(value) as totalVolume,
              COUNT(*) as transactionCount,
              CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
            FROM transactions
            GROUP BY datetime, tokenSymbol
            ORDER BY datetime DESC, tokenSymbol
            LIMIT ${maxResults}
          `;

      const rawData = rows.map(row => {
        return {
          datetime: new Date(row.datetime).toISOString(),
          tokenSymbol: row.tokenSymbol,
          totalVolume: row.totalVolume.toString(),
          transactionCount: parseInt(row.transactionCount.toString()),
          averageVolume: row.averageVolume.toString(),
        };
      });

      // Reverse to show oldest to newest (SQL query uses DESC order)
      // Fill missing weekly data points with zeros
      const filledData = this.fillMissingHourlyData(
        rawData.reverse(),
        limit * 24 * 7, // weeks to hours
        tokenSymbol,
        limit,
        'week',
        10080 // 1 week = 10080 minutes
      );
      return filledData;
    } catch (error) {
      apiLogger.error('Error fetching weekly volume data:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        tokenSymbol,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get monthly volume statistics
   */
  async getMonthlyVolumeStats(
    tokenSymbol?: string,
    limit: number = 12
  ): Promise<HourlyVolumeData[]> {
    try {
      // Monthly endpoint: return latest {limit} monthly data points
      const maxResults = limit * 2;

      // Use DATETIME calculation for monthly intervals (first day of each month at midnight)
      const dateExpression = `CAST(DATE_FORMAT(timestamp, '%Y-%m-01') AS DATETIME)`;

      const rows = tokenSymbol
        ? await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateExpression)} as datetime,
              tokenSymbol,
              SUM(value) as totalVolume,
              COUNT(*) as transactionCount,
              CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
            FROM transactions
            WHERE tokenSymbol = ${tokenSymbol}
            GROUP BY datetime, tokenSymbol
            ORDER BY datetime DESC, tokenSymbol
            LIMIT ${maxResults}
          `
        : await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateExpression)} as datetime,
              tokenSymbol,
              SUM(value) as totalVolume,
              COUNT(*) as transactionCount,
              CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
            FROM transactions
            GROUP BY datetime, tokenSymbol
            ORDER BY datetime DESC, tokenSymbol
            LIMIT ${maxResults}
          `;

      const rawData = rows.map(row => {
        return {
          datetime: new Date(row.datetime).toISOString(),
          tokenSymbol: row.tokenSymbol,
          totalVolume: row.totalVolume.toString(),
          transactionCount: parseInt(row.transactionCount.toString()),
          averageVolume: row.averageVolume.toString(),
        };
      });

      // Reverse to show oldest to newest (SQL query uses DESC order)
      // Fill missing monthly data points with zeros
      const filledData = this.fillMissingHourlyData(
        rawData.reverse(),
        limit * 24 * 30, // months to hours (approximate)
        tokenSymbol,
        limit,
        'month',
        43200 // 1 month ≈ 43200 minutes (30 days)
      );
      return filledData;
    } catch (error) {
      apiLogger.error('Error fetching monthly volume data:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        tokenSymbol,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get comprehensive token statistics
   */
  async getTokenStats(
    tokenSymbol?: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    try {
      let whereClause = '';
      const conditions: string[] = [];

      if (startDate) {
        conditions.push(`timestamp >= '${new Date(startDate).toISOString()}'`);
      }
      if (endDate) {
        conditions.push(`timestamp <= '${new Date(endDate).toISOString()}'`);
      }
      if (tokenSymbol) {
        conditions.push(`tokenSymbol = '${tokenSymbol}'`);
      }

      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }

      const query = `
        SELECT
          tokenSymbol,
          COUNT(*) as totalTransactions,
          SUM(value) as totalVolume,
          AVG(value) as averageTransactionSize,
          COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses
        FROM transactions
        ${whereClause}
        GROUP BY tokenSymbol
        ORDER BY totalVolume DESC
      `;

      const rows = (await prisma.$queryRawUnsafe(query)) as any[];

      return rows.map(row => ({
        tokenSymbol: row.tokenSymbol,
        totalTransactions: parseInt(row.totalTransactions.toString()),
        totalVolume: row.totalVolume.toString(),
        averageTransactionSize: row.averageTransactionSize.toString(),
        uniqueAddresses: parseInt(row.uniqueAddresses.toString()),
      }));
    } catch (error) {
      apiLogger.error('Error fetching token stats', error);
      throw new Error('Failed to fetch token stats');
    }
  }

  /**
   * Get minute-level anomaly timeseries (wrapper for getAnomalyTimeSeries with 1 hour)
   */
  async getAnomalyTimeSeriesMinutes(
    tokenSymbol?: string,
    limit: number = 60
  ): Promise<any[]> {
    // For minute-level data, use 1 hour lookback
    return this.getAnomalyTimeSeries(1, tokenSymbol, limit);
  }

  /**
   * Get daily anomaly timeseries (wrapper for getAnomalyTimeSeries with dynamic days)
   */
  async getAnomalyTimeSeriesDaily(
    tokenSymbol?: string,
    limit: number = 30
  ): Promise<any[]> {
    // For daily data, calculate hours based on limit (limit * 24 hours per day)
    return this.getAnomalyTimeSeries(limit * 24, tokenSymbol, limit);
  }

  /**
   * Get weekly anomaly timeseries (wrapper for getAnomalyTimeSeries with dynamic weeks)
   */
  async getAnomalyTimeSeriesWeekly(
    tokenSymbol?: string,
    limit: number = 52
  ): Promise<any[]> {
    // For weekly data, calculate hours based on limit (limit * 24 * 7 hours per week)
    return this.getAnomalyTimeSeries(limit * 24 * 7, tokenSymbol, limit);
  }

  /**
   * Helper method to get token colors
   */
  private getTokenColor(tokenSymbol: string): string {
    const colors: Record<string, string> = {
      MSQ: '#8b5cf6', // Purple
      SUT: '#06b6d4', // Cyan
      KWT: '#10b981', // Emerald
      P2UC: '#f59e0b', // Amber
    };
    return colors[tokenSymbol] || '#64748b'; // Default gray
  }

  /**
   * Parse timeRange string to hours
   */
  private parseTimeRange(timeRange?: string): number | null {
    if (!timeRange || timeRange === 'all') return null;

    const timeRangeMap: Record<string, number> = {
      '1h': 1,
      '24h': 24,
      '7d': 168,
      '30d': 720,
      '3m': 2160,
      '6m': 4320,
      '1y': 8760,
    };

    return timeRangeMap[timeRange] ?? null;
  }

  /**
   * Get cutoff date for time range filtering
   */
  private getCutoffDate(hours: number | null): Date | null {
    if (hours === null) return null;
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  }
}
