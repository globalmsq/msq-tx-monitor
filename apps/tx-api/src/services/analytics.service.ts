import { prisma } from '@msq-tx-monitor/database';

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

      // Use Prisma raw query for complex aggregation
      const whereClause = tokenSymbol
        ? `WHERE timestamp >= '${cutoffDate.toISOString()}' AND tokenSymbol = '${tokenSymbol}'`
        : `WHERE timestamp >= '${cutoffDate.toISOString()}'`;

      const query = `
        SELECT
          DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
          tokenSymbol,
          SUM(value) as totalVolume,
          COUNT(*) as transactionCount,
          CAST(AVG(value) as DECIMAL(38,0)) as averageVolume
        FROM transactions
        ${whereClause}
        GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00'), tokenSymbol
        ORDER BY hour DESC, tokenSymbol
        LIMIT ${limit}
      `;

      const rows = await prisma.$queryRawUnsafe(query) as any[];

      return rows.map(row => ({
        hour: row.hour,
        tokenSymbol: row.tokenSymbol,
        totalVolume: row.totalVolume.toString(),
        transactionCount: parseInt(row.transactionCount.toString()),
        averageVolume: row.averageVolume.toString(),
      }));
    } catch (error) {
      console.error('Error fetching hourly volume data:', error);
      throw new Error('Failed to fetch hourly volume data');
    }
  }

  /**
   * Get realtime statistics
   */
  async getRealtimeStats(tokenSymbol?: string): Promise<RealtimeStats> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const whereClause = tokenSymbol
        ? `WHERE tokenSymbol = '${tokenSymbol}'`
        : '';
      const where24hClause = tokenSymbol
        ? `WHERE timestamp >= '${last24Hours.toISOString()}' AND tokenSymbol = '${tokenSymbol}'`
        : `WHERE timestamp >= '${last24Hours.toISOString()}'`;

      // Get overall stats
      const totalStatsQuery = `
        SELECT
          COUNT(*) as totalTransactions,
          SUM(value) as totalVolume,
          COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as activeAddresses
        FROM transactions
        ${whereClause}
      `;

      // Get 24h stats
      const last24hStatsQuery = `
        SELECT
          COUNT(*) as transactionsLast24h,
          SUM(value) as volumeLast24h
        FROM transactions
        ${where24hClause}
      `;

      // Get token stats
      const tokenStatsQuery = tokenSymbol
        ? `
          SELECT
            tokenSymbol,
            SUM(value) as totalVolume,
            COUNT(*) as transactionCount,
            COUNT(DISTINCT fromAddress) + COUNT(DISTINCT toAddress) as uniqueAddresses24h,
            SUM(CASE WHEN timestamp >= '${last24Hours.toISOString()}' THEN value ELSE 0 END) as volume24h
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
            SUM(CASE WHEN timestamp >= '${last24Hours.toISOString()}' THEN value ELSE 0 END) as volume24h
          FROM transactions
          GROUP BY tokenSymbol
        `;

      const activeTokensQuery = `
        SELECT COUNT(DISTINCT tokenSymbol) as activeTokens
        FROM transactions
        ${where24hClause}
      `;

      const [totalStatsRows, last24hStatsRows, tokenStatsRows, activeTokensRows] = await Promise.all([
        prisma.$queryRawUnsafe(totalStatsQuery) as Promise<any[]>,
        prisma.$queryRawUnsafe(last24hStatsQuery) as Promise<any[]>,
        prisma.$queryRawUnsafe(tokenStatsQuery) as Promise<any[]>,
        prisma.$queryRawUnsafe(activeTokensQuery) as Promise<any[]>,
      ]);

      const totalStats = totalStatsRows[0] || { totalTransactions: 0, totalVolume: '0', activeAddresses: 0 };
      const last24hStats = last24hStatsRows[0] || { transactionsLast24h: 0, volumeLast24h: '0' };
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
        transactionsLast24h: parseInt(last24hStats.transactionsLast24h.toString()),
        volumeLast24h: last24hStats.volumeLast24h.toString(),
        activeTokens: parseInt(activeTokens.toString()),
        tokenStats,
      };
    } catch (error) {
      console.error('Error fetching realtime stats:', error);
      throw new Error('Failed to fetch realtime stats');
    }
  }

  /**
   * Get token distribution data
   */
  async getTokenDistribution(tokenSymbol?: string): Promise<any[]> {
    try {
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

      const rows = await prisma.$queryRawUnsafe(query) as any[];

      // Calculate total volume for percentage calculation
      const totalVolume = rows.reduce((sum, row) => sum + parseFloat(row.volume.toString()), 0);

      return rows.map(row => {
        const volume = parseFloat(row.volume.toString());
        const percentage = totalVolume > 0 ? (volume / totalVolume * 100) : 0;

        return {
          tokenSymbol: row.tokenSymbol,
          transactionCount: parseInt(row.transactionCount.toString()),
          volume: row.volume.toString(),
          percentage: parseFloat(percentage.toFixed(2)),
          color: this.getTokenColor(row.tokenSymbol),
        };
      });
    } catch (error) {
      console.error('Error fetching token distribution:', error);
      throw new Error('Failed to fetch token distribution');
    }
  }

  /**
   * Get top addresses by volume
   */
  async getTopAddresses(
    metric: 'volume' | 'transactions' = 'volume',
    limit: number = 10,
    tokenSymbol?: string
  ): Promise<any[]> {
    try {
      const whereClause = tokenSymbol
        ? `WHERE tokenSymbol = '${tokenSymbol}'`
        : '';

      // Create a union query to get both from and to addresses
      const query = metric === 'volume'
        ? `
          SELECT
            address,
            SUM(volume) as totalVolume,
            COUNT(*) as transactionCount
          FROM (
            SELECT fromAddress as address, SUM(value) as volume
            FROM transactions
            ${whereClause}
            GROUP BY fromAddress
            UNION ALL
            SELECT toAddress as address, SUM(value) as volume
            FROM transactions
            ${whereClause}
            GROUP BY toAddress
          ) as combined_addresses
          GROUP BY address
          ORDER BY totalVolume DESC
          LIMIT ${limit}
        `
        : `
          SELECT
            address,
            COUNT(*) as transactionCount,
            SUM(volume) as totalVolume
          FROM (
            SELECT fromAddress as address, value as volume
            FROM transactions
            ${whereClause}
            UNION ALL
            SELECT toAddress as address, value as volume
            FROM transactions
            ${whereClause}
          ) as combined_addresses
          GROUP BY address
          ORDER BY transactionCount DESC
          LIMIT ${limit}
        `;

      const rows = await prisma.$queryRawUnsafe(query) as any[];

      return rows.map((row, index) => ({
        rank: index + 1,
        address: row.address,
        totalVolume: row.totalVolume?.toString() || '0',
        transactionCount: parseInt(row.transactionCount?.toString() || '0'),
        metric: metric === 'volume' ? row.totalVolume?.toString() || '0' : row.transactionCount?.toString() || '0',
      }));
    } catch (error) {
      console.error('Error fetching top addresses:', error);
      throw new Error('Failed to fetch top addresses');
    }
  }

  /**
   * Get anomaly statistics
   */
  async getAnomalyStats(tokenSymbol?: string): Promise<any> {
    try {
      const whereClause = tokenSymbol
        ? `WHERE tokenSymbol = '${tokenSymbol}'`
        : '';

      const query = `
        SELECT
          COUNT(*) as totalTransactions,
          SUM(CASE WHEN isAnomaly = true THEN 1 ELSE 0 END) as anomalyCount,
          AVG(anomalyScore) as averageAnomalyScore,
          MAX(anomalyScore) as maxAnomalyScore,
          SUM(CASE WHEN anomalyScore > 0.7 THEN 1 ELSE 0 END) as highRiskCount,
          SUM(CASE WHEN anomalyScore BETWEEN 0.4 AND 0.7 THEN 1 ELSE 0 END) as mediumRiskCount,
          SUM(CASE WHEN anomalyScore < 0.4 THEN 1 ELSE 0 END) as lowRiskCount
        FROM transactions
        ${whereClause}
      `;

      const rows = await prisma.$queryRawUnsafe(query) as any[];
      const result = rows[0];

      return {
        totalTransactions: parseInt(result.totalTransactions.toString()),
        anomalyCount: parseInt(result.anomalyCount.toString()),
        anomalyRate: result.totalTransactions > 0
          ? (result.anomalyCount / result.totalTransactions * 100)
          : 0,
        averageAnomalyScore: parseFloat(result.averageAnomalyScore?.toString() || '0'),
        maxAnomalyScore: parseFloat(result.maxAnomalyScore?.toString() || '0'),
        highRiskCount: parseInt(result.highRiskCount.toString()),
        mediumRiskCount: parseInt(result.mediumRiskCount.toString()),
        lowRiskCount: parseInt(result.lowRiskCount.toString()),
      };
    } catch (error) {
      console.error('Error fetching anomaly stats:', error);
      throw new Error('Failed to fetch anomaly stats');
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(tokenSymbol?: string): Promise<any> {
    try {
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

      const rows = await prisma.$queryRawUnsafe(query) as any[];
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
      console.error('Error fetching network stats:', error);
      throw new Error('Failed to fetch network stats');
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