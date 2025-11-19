import { Injectable, Logger, Inject, HttpException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SubgraphClient } from '@msq-tx-monitor/subgraph-client';
import { CacheTTL } from '../config/cache.config.js';

interface VolumeDataPoint {
  timestamp: number;
  volume: string;
  transferCount: number;
  mintCount?: number;
  burnCount?: number;
}

interface TokenDistribution {
  address: string;
  balance: string;
  percentage: number;
}

interface AddressStats {
  address: string;
  totalAmount: string;
  transactionCount: number;
}

interface NetworkStats {
  totalVolume: string;
  totalTransactions: number;
  totalHolders: number;
  tokenCount: number;
}

interface RealtimeStats {
  totalTransactions: number;
  activeAddresses: number;
  volume24h: string;
  volumeChange24h: number;
  tokenStats: Array<{
    symbol: string;
    volume24h: string;
    transactionCount: number;
    holderCount: number;
  }>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly subgraphClient: SubgraphClient,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  /**
   * Get realtime statistics
   */
  async getRealtimeStats(token?: string): Promise<RealtimeStats> {
    const cacheKey = `analytics:realtime:${token || 'all'}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_RECENT, async () => {
      // Get latest daily snapshots for each token
      const tokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      const tokenAddresses: Record<string, string> = {
        MSQ: '0x6a8ec5f30645827384f1d3aaba5e29ed52abcdcb',
        SUT: '0xc1f6c86abee8e2e0b6fd5bd80f0b51fef783635c',
        KWT: '0x1e9c1b9d0064fcb7f0c6b7d379c1ba6c3e855fc5',
        P2UC: '0x71ed5740c5f4f8cc9f6c5b8e7c7b98f1c9f2b5a8',
      };

      const tokenStats = [];
      let totalVolume = BigInt(0);
      let totalTransactions = 0;
      let totalActiveAddresses = 0;

      for (const tokenSymbol of tokens) {
        if (token && token !== tokenSymbol) continue;

        try {
          const snapshots = await this.subgraphClient.getLatestDailySnapshot(
            tokenAddresses[tokenSymbol]
          );
          const snapshot = snapshots[0];

          if (snapshot) {
            // Note: Subgraph returns string values
            totalTransactions += parseInt(snapshot.transferCount) || 0;
            totalActiveAddresses += parseInt(snapshot.uniqueAddresses) || 0;

            // Calculate volume from mint + burn volumes
            const mintVol = BigInt(snapshot.mintVolume || '0');
            const burnVol = BigInt(snapshot.burnVolume || '0');
            const volume = mintVol + burnVol;
            totalVolume += volume;

            tokenStats.push({
              symbol: tokenSymbol,
              volume24h: volume.toString(),
              transactionCount: parseInt(snapshot.transferCount) || 0,
              holderCount: parseInt(snapshot.holderCount) || 0,
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to get snapshot for ${tokenSymbol}: ${error}`);
        }
      }

      return {
        totalTransactions,
        activeAddresses: totalActiveAddresses,
        volume24h: totalVolume.toString(),
        volumeChange24h: 0, // Would need previous day comparison
        tokenStats,
      };
    });
  }

  /**
   * Get hourly volume statistics
   */
  async getVolumeHourly(token?: string, limit = 24): Promise<VolumeDataPoint[]> {
    const cacheKey = `analytics:volume:hourly:${token || 'all'}:${limit}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_QUERY, async () => {
      const now = Math.floor(Date.now() / 1000);
      const startHour = now - (limit * 3600);

      const tokenAddress = token ? this.getTokenAddress(token) : this.getTokenAddress('MSQ');
      if (!tokenAddress) {
        return [];
      }

      const snapshots = await this.subgraphClient.getHourlySnapshots(
        tokenAddress,
        startHour,
        now,
        limit
      );

      return snapshots.map(snapshot => ({
        timestamp: parseInt(snapshot.hour) * 1000,
        volume: '0', // HourlySnapshot doesn't include volume in query
        transferCount: parseInt(snapshot.transferCount) || 0,
        mintCount: parseInt(snapshot.mintCount) || 0,
        burnCount: parseInt(snapshot.burnCount) || 0,
      }));
    });
  }

  /**
   * Get daily volume statistics
   */
  async getVolumeDaily(token?: string, limit = 30): Promise<VolumeDataPoint[]> {
    const cacheKey = `analytics:volume:daily:${token || 'all'}:${limit}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_TOKEN, async () => {
      const now = Math.floor(Date.now() / 1000);
      const startDate = now - (limit * 86400);

      const tokenAddress = token ? this.getTokenAddress(token) : this.getTokenAddress('MSQ');
      if (!tokenAddress) {
        return [];
      }

      const snapshots = await this.subgraphClient.getDailySnapshots(
        tokenAddress,
        startDate,
        now,
        limit
      );

      return snapshots.map(snapshot => {
        // Calculate volume from mint + burn volumes
        const mintVol = BigInt(snapshot.mintVolume || '0');
        const burnVol = BigInt(snapshot.burnVolume || '0');
        const volume = mintVol + burnVol;

        return {
          timestamp: parseInt(snapshot.date) * 1000,
          volume: volume.toString(),
          transferCount: parseInt(snapshot.transferCount) || 0,
          mintCount: parseInt(snapshot.mintCount) || 0,
          burnCount: parseInt(snapshot.burnCount) || 0,
        };
      });
    });
  }

  /**
   * Get weekly volume statistics (aggregated from daily)
   */
  async getVolumeWeekly(token?: string, limit = 12): Promise<VolumeDataPoint[]> {
    const cacheKey = `analytics:volume:weekly:${token || 'all'}:${limit}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_TOKEN, async () => {
      const dailyData = await this.getVolumeDaily(token, limit * 7);

      // Aggregate into weeks
      const weeks: VolumeDataPoint[] = [];
      for (let i = 0; i < dailyData.length; i += 7) {
        const weekData = dailyData.slice(i, i + 7);
        if (weekData.length === 0) continue;

        const volume = weekData.reduce(
          (sum, d) => sum + BigInt(d.volume),
          BigInt(0)
        );
        const transferCount = weekData.reduce(
          (sum, d) => sum + d.transferCount,
          0
        );

        weeks.push({
          timestamp: weekData[0].timestamp,
          volume: volume.toString(),
          transferCount,
        });
      }

      return weeks;
    });
  }

  /**
   * Get token distribution (top holders)
   */
  async getTokenDistribution(token: string, limit = 100): Promise<TokenDistribution[]> {
    const cacheKey = `analytics:distribution:${token}:${limit}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_TOKEN, async () => {
      const tokenAddress = this.getTokenAddress(token);
      if (!tokenAddress) {
        return [];
      }

      const accounts = await this.subgraphClient.getTokenAccountsByToken(
        tokenAddress,
        limit,
        0
      );

      // Calculate total for percentage
      const total = accounts.reduce(
        (sum, acc) => sum + BigInt(acc.balance),
        BigInt(0)
      );

      return accounts.map(account => ({
        address: account.account,
        balance: account.balance,
        percentage: total > 0
          ? Number((BigInt(account.balance) * BigInt(10000) / total)) / 100
          : 0,
      }));
    });
  }

  /**
   * Get top addresses by balance (transaction count not available in query)
   */
  async getTopAddresses(token?: string, limit = 50): Promise<AddressStats[]> {
    const cacheKey = `analytics:addresses:top:${token || 'all'}:${limit}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_ADDRESS, async () => {
      const tokenAddress = token ? this.getTokenAddress(token) : this.getTokenAddress('MSQ');

      if (tokenAddress) {
        const accounts = await this.subgraphClient.getTokenAccountsByToken(
          tokenAddress,
          limit,
          0
        );

        // Query only returns id, account, balance - no transaction counts
        return accounts.map(account => ({
          address: account.account,
          totalAmount: account.balance,
          transactionCount: 0, // Not available in current query
        }));
      }

      // If no token specified, return empty for now
      return [];
    });
  }

  /**
   * Get top senders (sorted by balance - sentCount not available in query)
   */
  async getTopSenders(token?: string, limit = 50): Promise<AddressStats[]> {
    const cacheKey = `analytics:addresses:senders:${token || 'all'}:${limit}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_ADDRESS, async () => {
      const tokenAddress = token ? this.getTokenAddress(token) : this.getTokenAddress('MSQ');

      if (tokenAddress) {
        const accounts = await this.subgraphClient.getTokenAccountsByToken(
          tokenAddress,
          limit,
          0
        );

        // Query only returns id, account, balance - sorted by balance
        return accounts.map(account => ({
          address: account.account,
          totalAmount: account.balance,
          transactionCount: 0, // sentCount not available in current query
        }));
      }

      return [];
    });
  }

  /**
   * Get top receivers (sorted by balance - receivedCount not available in query)
   */
  async getTopReceivers(token?: string, limit = 50): Promise<AddressStats[]> {
    const cacheKey = `analytics:addresses:receivers:${token || 'all'}:${limit}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_ADDRESS, async () => {
      const tokenAddress = token ? this.getTokenAddress(token) : this.getTokenAddress('MSQ');

      if (tokenAddress) {
        const accounts = await this.subgraphClient.getTokenAccountsByToken(
          tokenAddress,
          limit,
          0
        );

        // Query only returns id, account, balance - sorted by balance
        return accounts.map(account => ({
          address: account.account,
          totalAmount: account.balance,
          transactionCount: 0, // receivedCount not available in current query
        }));
      }

      return [];
    });
  }

  /**
   * Get network-wide statistics
   */
  async getNetworkStats(): Promise<NetworkStats> {
    const cacheKey = 'analytics:network';

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_TOKEN, async () => {
      const tokens = [
        '0x6a8ec5f30645827384f1d3aaba5e29ed52abcdcb', // MSQ
        '0xc1f6c86abee8e2e0b6fd5bd80f0b51fef783635c', // SUT
        '0x1e9c1b9d0064fcb7f0c6b7d379c1ba6c3e855fc5', // KWT
        '0x71ed5740c5f4f8cc9f6c5b8e7c7b98f1c9f2b5a8', // P2UC
      ];

      let totalVolume = BigInt(0);
      let totalTransactions = 0;
      let totalHolders = 0;

      for (const tokenAddress of tokens) {
        try {
          const stats = await this.subgraphClient.getTokenStatistics(
            tokenAddress,
            tokenAddress
          );

          if (stats.token) {
            // Token query doesn't include transferCount or totalVolumeTransferred
            // Use holderCount and calculate volume from daily snapshots
            totalHolders += parseInt(stats.token.holderCount) || 0;
          }

          // Get volume from daily snapshots
          if (stats.dailySnapshots && stats.dailySnapshots.length > 0) {
            for (const snapshot of stats.dailySnapshots) {
              const mintVol = BigInt(snapshot.mintVolume || '0');
              const burnVol = BigInt(snapshot.burnVolume || '0');
              totalVolume += mintVol + burnVol;
              totalTransactions += parseInt(snapshot.transferCount) || 0;
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to get stats for token ${tokenAddress}: ${error}`);
        }
      }

      return {
        totalVolume: totalVolume.toString(),
        totalTransactions,
        totalHolders,
        tokenCount: tokens.length,
      };
    });
  }

  /**
   * Get anomaly statistics (placeholder - requires DB)
   */
  async getAnomalyStats(): Promise<{ message: string }> {
    return {
      message: 'Anomaly detection not available via Subgraph. Requires database integration.',
    };
  }

  /**
   * Helper: Convert token symbol to address
   */
  private getTokenAddress(symbol: string): string | undefined {
    const addresses: Record<string, string> = {
      MSQ: '0x6a8ec5f30645827384f1d3aaba5e29ed52abcdcb',
      SUT: '0xc1f6c86abee8e2e0b6fd5bd80f0b51fef783635c',
      KWT: '0x1e9c1b9d0064fcb7f0c6b7d379c1ba6c3e855fc5',
      P2UC: '0x71ed5740c5f4f8cc9f6c5b8e7c7b98f1c9f2b5a8',
    };
    return addresses[symbol.toUpperCase()];
  }

  /**
   * Cache wrapper with error handling
   */
  private async withCache<T>(
    key: string,
    ttl: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const cached = await this.cacheManager.get<T>(key);
    if (cached) {
      this.logger.debug(`Cache hit: ${key}`);
      return cached;
    }

    this.logger.debug(`Cache miss: ${key}`);
    try {
      const result = await fn();
      await this.cacheManager.set(key, result, ttl * 1000);
      return result;
    } catch (error: unknown) {
      const err = error as { response?: { status?: number }; message?: string };
      if (err.response?.status) {
        throw new HttpException(
          err.message || 'Subgraph error',
          err.response.status
        );
      }
      throw error;
    }
  }
}
