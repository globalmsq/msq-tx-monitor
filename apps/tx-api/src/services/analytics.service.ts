import { prisma } from '@msq-tx-monitor/database';
import { Prisma } from '@prisma/client';
import { apiLogger } from '@msq-tx-monitor/msq-common';

export interface HourlyVolumeData {
  hour: string;
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
  transactionsLast24h: number;
  volumeLast24h: string;
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
    hours: number = 24,
    tokenSymbol?: string,
    limit: number = 24
  ): Promise<HourlyVolumeData[]> {
    try {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Determine interval based on time range
      const intervalMinutes = hours <= 1 ? 5 : 60;
      const dateFormat =
        intervalMinutes === 5
          ? '%Y-%m-%d %H:%i:00' // 5-minute intervals: YYYY-MM-DD HH:MM:00
          : '%Y-%m-%d %H:00:00'; // Hourly intervals: YYYY-MM-DD HH:00:00

      // Use Prisma.$queryRaw with proper SQL - dateFormat cannot be parameterized
      // Use alias in GROUP BY which MySQL supports to satisfy ONLY_FULL_GROUP_BY
      const maxResults = limit * 2;

      // Build the DATE_FORMAT expression (internally controlled, safe from SQL injection)
      const dateFormatExpression = `DATE_FORMAT(timestamp, '${dateFormat}')`;

      const rows = tokenSymbol
        ? await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateFormatExpression)} as hour,
              tokenSymbol,
              SUM(value) as totalVolume,
              COUNT(*) as transactionCount,
              CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
            FROM transactions
            WHERE timestamp >= ${cutoffDate} AND tokenSymbol = ${tokenSymbol}
            GROUP BY hour, tokenSymbol
            ORDER BY hour DESC, tokenSymbol
            LIMIT ${maxResults}
          `
        : await prisma.$queryRaw<any[]>`
            SELECT
              ${Prisma.raw(dateFormatExpression)} as hour,
              tokenSymbol,
              SUM(value) as totalVolume,
              COUNT(*) as transactionCount,
              CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
            FROM transactions
            WHERE timestamp >= ${cutoffDate}
            GROUP BY hour, tokenSymbol
            ORDER BY hour DESC, tokenSymbol
            LIMIT ${maxResults}
          `;

      const rawData = rows.map(row => ({
        hour: `${row.hour}Z`, // Add UTC timezone indicator
        tokenSymbol: row.tokenSymbol,
        totalVolume: row.totalVolume.toString(),
        transactionCount: parseInt(row.transactionCount.toString()),
        averageVolume: row.averageVolume.toString(),
      }));

      // Fill missing data points with zeros to ensure consistent chart intervals
      const filledData = this.fillMissingHourlyData(
        rawData,
        hours,
        tokenSymbol,
        limit
      );

      return filledData;
    } catch (error) {
      apiLogger.error('Error fetching hourly volume data:', {
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
   * Get realtime statistics
   */
  async getRealtimeStats(
    tokenSymbol?: string,
    hours: number = 24
  ): Promise<RealtimeStats> {
    try {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      const whereClause = tokenSymbol
        ? `WHERE tokenSymbol = '${tokenSymbol}'`
        : '';
      const whereTimeRangeClause = tokenSymbol
        ? `WHERE timestamp >= '${cutoffDate.toISOString()}' AND tokenSymbol = '${tokenSymbol}'`
        : `WHERE timestamp >= '${cutoffDate.toISOString()}'`;

      // Get overall stats
      const totalStatsQuery = `
        SELECT
          COUNT(*) as totalTransactions,
          SUM(value) as totalVolume,
          COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as activeAddresses
        FROM transactions
        ${whereClause}
      `;

      // Get time range stats
      const timeRangeStatsQuery = `
        SELECT
          COUNT(*) as transactionsLast24h,
          SUM(value) as volumeLast24h
        FROM transactions
        ${whereTimeRangeClause}
      `;

      // Get token stats
      const tokenStatsQuery = tokenSymbol
        ? `
          SELECT
            tokenSymbol,
            SUM(value) as totalVolume,
            COUNT(*) as transactionCount,
            COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses24h,
            SUM(CASE WHEN timestamp >= '${cutoffDate.toISOString()}' THEN value ELSE 0 END) as volume24h
          FROM transactions
          WHERE tokenSymbol = '${tokenSymbol}'
          GROUP BY tokenSymbol
        `
        : `
          SELECT
            tokenSymbol,
            SUM(value) as totalVolume,
            COUNT(*) as transactionCount,
            COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses24h,
            SUM(CASE WHEN timestamp >= '${cutoffDate.toISOString()}' THEN value ELSE 0 END) as volume24h
          FROM transactions
          GROUP BY tokenSymbol
        `;

      const activeTokensQuery = `
        SELECT COUNT(DISTINCT tokenSymbol) as activeTokens
        FROM transactions
        ${whereTimeRangeClause}
      `;

      const [
        totalStatsRows,
        timeRangeStatsRows,
        tokenStatsRows,
        activeTokensRows,
      ] = await Promise.all([
        prisma.$queryRawUnsafe(totalStatsQuery) as Promise<any[]>,
        prisma.$queryRawUnsafe(timeRangeStatsQuery) as Promise<any[]>,
        prisma.$queryRawUnsafe(tokenStatsQuery) as Promise<any[]>,
        prisma.$queryRawUnsafe(activeTokensQuery) as Promise<any[]>,
      ]);

      const totalStats = totalStatsRows[0] || {
        totalTransactions: 0,
        totalVolume: '0',
        activeAddresses: 0,
      };
      const timeRangeStats = timeRangeStatsRows[0] || {
        transactionsLast24h: 0,
        volumeLast24h: '0',
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
        transactionsLast24h: parseInt(
          timeRangeStats.transactionsLast24h.toString()
        ),
        volumeLast24h: timeRangeStats.volumeLast24h.toString(),
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
  async getTokenDistribution(
    tokenSymbol?: string,
    hours?: number
  ): Promise<any[]> {
    try {
      let whereClause = '';
      if (hours) {
        const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        whereClause = tokenSymbol
          ? `WHERE timestamp >= '${cutoffDate.toISOString()}' AND tokenSymbol = '${tokenSymbol}'`
          : `WHERE timestamp >= '${cutoffDate.toISOString()}'`;
      } else {
        whereClause = tokenSymbol ? `WHERE tokenSymbol = '${tokenSymbol}'` : '';
      }

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
    hours?: number
  ): Promise<any[]> {
    try {
      // Use tokenSymbol directly for filtering - no token address lookup needed
      const cutoffDate = hours
        ? new Date(Date.now() - hours * 60 * 60 * 1000)
        : undefined;

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
          WHERE 1=1
            ${cutoffDate ? `AND timestamp >= ?` : ''}
            ${tokenSymbol ? `AND tokenSymbol = '${tokenSymbol}'` : ''}
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
          WHERE 1=1
            ${cutoffDate ? `AND timestamp >= ?` : ''}
            ${tokenSymbol ? `AND tokenSymbol = '${tokenSymbol}'` : ''}
          GROUP BY toAddress
        ) as combined
        GROUP BY address
        ORDER BY ${metric === 'volume' ? '(SUM(totalSent) + SUM(totalReceived))' : '(SUM(transactionCountSent) + SUM(transactionCountReceived))'} DESC
        LIMIT ?
      `;

      const addresses = cutoffDate
        ? await prisma.$queryRawUnsafe<any[]>(
            query,
            cutoffDate,
            cutoffDate,
            limit
          )
        : await prisma.$queryRawUnsafe<any[]>(
            query,
            limit
          );

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
  async getAnomalyStats(_tokenSymbol?: string, _hours?: number): Promise<any> {
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
  async getNetworkStats(tokenSymbol?: string, hours?: number): Promise<any> {
    try {
      let whereClause = '';
      if (hours) {
        const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        whereClause = tokenSymbol
          ? `WHERE timestamp >= '${cutoffDate.toISOString()}' AND tokenSymbol = '${tokenSymbol}'`
          : `WHERE timestamp >= '${cutoffDate.toISOString()}'`;
      } else {
        whereClause = tokenSymbol ? `WHERE tokenSymbol = '${tokenSymbol}'` : '';
      }

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
    hours?: number,
    tokenSymbol?: string
  ): Promise<any[]> {
    try {
      let whereClause = '';
      if (hours) {
        const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        whereClause = tokenSymbol
          ? `WHERE timestamp >= '${cutoffDate.toISOString()}' AND tokenSymbol = '${tokenSymbol}'`
          : `WHERE timestamp >= '${cutoffDate.toISOString()}'`;
      } else {
        whereClause = tokenSymbol ? `WHERE tokenSymbol = '${tokenSymbol}'` : '';
      }

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
    hours?: number,
    tokenSymbol?: string
  ): Promise<any[]> {
    try {
      let whereClause = '';
      if (hours) {
        const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        whereClause = tokenSymbol
          ? `WHERE timestamp >= '${cutoffDate.toISOString()}' AND tokenSymbol = '${tokenSymbol}'`
          : `WHERE timestamp >= '${cutoffDate.toISOString()}'`;
      } else {
        whereClause = tokenSymbol ? `WHERE tokenSymbol = '${tokenSymbol}'` : '';
      }

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

      // Determine interval based on time range
      const intervalMinutes = hours <= 1 ? 5 : 60;
      const dateFormat =
        intervalMinutes === 5
          ? '%Y-%m-%d %H:%i:00' // 5-minute intervals: YYYY-MM-DD HH:MM:00
          : '%Y-%m-%d %H:00:00'; // Hourly intervals: YYYY-MM-DD HH:00:00

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

      const rawData = rows.map(row => ({
        timestamp: `${row.hour}Z`, // Add UTC timezone indicator
        hour: `${row.hour}Z`,
        anomalyCount: parseInt(row.anomalyCount.toString()),
        averageScore: parseFloat(row.averageScore?.toString() || '0'),
        highRiskCount: parseInt(row.highRiskCount.toString()),
        totalTransactions: parseInt(row.totalTransactions.toString()),
        anomalyRate: parseFloat(row.anomalyRate?.toString() || '0'),
      }));

      // Fill missing data points with zeros to ensure consistent chart intervals
      const filledData = this.fillMissingAnomalyData(rawData, hours, limit);

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
    intervalMinutes: number = 60
  ): Date[] {
    const intervals: Date[] = [];
    const endTime = new Date();
    // Round down to the nearest interval
    endTime.setMinutes(
      Math.floor(endTime.getMinutes() / intervalMinutes) * intervalMinutes
    );
    endTime.setSeconds(0);
    endTime.setMilliseconds(0);

    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const currentTime = new Date(startTime);
    while (currentTime <= endTime) {
      intervals.push(new Date(currentTime));
      currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
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
    limit: number = 24
  ): HourlyVolumeData[] {
    // Determine interval based on time range
    const intervalMinutes = hours <= 1 ? 5 : 60; // 5 minutes for 1h, 60 minutes for others
    const expectedPoints = this.getExpectedDataPoints(hours, limit);

    // Generate all expected time intervals
    const timeIntervals = this.generateTimeIntervals(hours, intervalMinutes);

    // Take only the required number of points (latest ones)
    const requiredIntervals = timeIntervals.slice(-expectedPoints);

    // Create a map of existing data for quick lookup
    const dataMap = new Map<string, HourlyVolumeData>();
    data.forEach(item => {
      const hourKey = this.formatHourKey(item.hour, intervalMinutes);
      dataMap.set(hourKey, item);
    });

    // Fill missing data points
    const filledData: HourlyVolumeData[] = requiredIntervals.map(interval => {
      const hourKey = this.formatHourKey(
        interval.toISOString(),
        intervalMinutes
      );
      const existingData = dataMap.get(hourKey);

      if (existingData) {
        return existingData;
      } else {
        // Create zero data point for missing interval
        return {
          hour: interval.toISOString().replace('T', ' ').substring(0, 19) + 'Z',
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
    limit: number = 24
  ): any[] {
    // Determine interval based on time range
    const intervalMinutes = hours <= 1 ? 5 : 60; // 5 minutes for 1h, 60 minutes for others
    const expectedPoints = this.getExpectedDataPoints(hours, limit);

    // Generate all expected time intervals
    const timeIntervals = this.generateTimeIntervals(hours, intervalMinutes);

    // Take only the required number of points (latest ones)
    const requiredIntervals = timeIntervals.slice(-expectedPoints);

    // Create a map of existing data for quick lookup
    const dataMap = new Map<string, any>();
    data.forEach(item => {
      const hourKey = this.formatHourKey(item.hour, intervalMinutes);
      dataMap.set(hourKey, item);
    });

    // Fill missing data points
    const filledData = requiredIntervals.map(interval => {
      const hourKey = this.formatHourKey(
        interval.toISOString(),
        intervalMinutes
      );
      const existingData = dataMap.get(hourKey);

      if (existingData) {
        return existingData;
      } else {
        // Create zero data point for missing interval
        const hourString =
          interval.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
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
    if (hours <= 1) return 12; // 5-minute intervals for 1 hour
    if (hours <= 24) return 24; // Hourly intervals for 24 hours
    if (hours <= 168) return Math.min(168, limit); // Hourly for 7 days (max 168)
    return Math.min(720, limit); // Hourly for 30 days (max 720)
  }

  /**
   * Format hour key for consistent lookup
   */
  private formatHourKey(hourString: string, intervalMinutes: number): string {
    const date = new Date(hourString);

    if (intervalMinutes === 5) {
      // For 5-minute intervals, round to nearest 5 minutes
      const minutes = Math.floor(date.getMinutes() / 5) * 5;
      date.setMinutes(minutes);
      date.setSeconds(0);
      date.setMilliseconds(0);
      return date.toISOString().replace('T', ' ').substring(0, 16) + ':00';
    } else {
      // For hourly intervals, round to hour
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      return date.toISOString().replace('T', ' ').substring(0, 13) + ':00:00';
    }
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
}
