import { Injectable, Logger, Inject, HttpException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SubgraphClient } from '@msq-tx-monitor/subgraph-client';
import { CacheTTL } from '../config/cache.config.js';
import { getTokenAddress } from '../config/tokens.config.js';
import { parseTimeRangeToHours } from '../config/time.config.js';

interface AddressRanking {
  address: string;
  totalVolume: string;
  transactionCount: number;
  rank: number;
}

interface WhaleAddress {
  address: string;
  balance: string;
  percentage: number;
}

interface ActiveTrader {
  address: string;
  transactionCount: number;
  volume: string;
}

interface SuspiciousAddress {
  address: string;
  anomalyScore: number;
  reason: string;
}

interface AddressStats {
  address: string;
  totalSent: string;
  totalReceived: string;
  transactionCount: number;
  tokenBalances: Array<{
    token: string;
    symbol: string;
    balance: string;
  }>;
}

interface AddressTrend {
  timestamp: number;
  volume: string;
  transactionCount: number;
}

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(
    private readonly subgraphClient: SubgraphClient,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  /**
   * Get address rankings by total volume
   */
  async getRankings(
    token?: string,
    timeRange?: string,
    limit = 50
  ): Promise<AddressRanking[]> {
    const hours = parseTimeRangeToHours(timeRange);
    const cacheKey = `addresses:rankings:${token || 'all'}:${hours}:${limit}`;

    return this.withCache(
      cacheKey,
      CacheTTL.TRANSACTIONS_BY_ADDRESS,
      async () => {
        const tokenAddress = token
          ? getTokenAddress(token)
          : getTokenAddress('MSQ');

        if (!tokenAddress) {
          return [];
        }

        // Get token accounts sorted by balance (as proxy for volume)
        const accounts = await this.subgraphClient.getTokenAccountsByToken(
          tokenAddress,
          limit,
          0
        );

        return accounts.map((account, index) => ({
          address: account.account,
          totalVolume: account.balance,
          transactionCount: 0, // Not available in current query
          rank: index + 1,
        }));
      }
    );
  }

  /**
   * Get address rankings by transaction volume
   * Aggregates Transfer events within the timeRange
   */
  async getRankingsByVolume(
    token?: string,
    timeRange?: string,
    limit = 50
  ): Promise<AddressRanking[]> {
    const hours = parseTimeRangeToHours(timeRange);
    const cacheKey = `addresses:rankings:volume:${token || 'all'}:${hours}:${limit}`;

    return this.withCache(
      cacheKey,
      CacheTTL.TRANSACTIONS_BY_ADDRESS,
      async () => {
        const tokenAddress = token
          ? getTokenAddress(token)
          : getTokenAddress('MSQ');

        if (!tokenAddress) {
          return [];
        }

        // Calculate timestamp range
        const now = Math.floor(Date.now() / 1000);
        const startTime = now - hours * 3600;

        // Get transfers within timeRange
        // Note: Subgraph has 5000 result limit, may need pagination for large datasets
        // Subgraph expects lowercase token address as ID
        const transfers = await this.subgraphClient.getTransfersByToken(
          tokenAddress.toLowerCase(),
          1000, // Limit to 1000 most recent transfers
          0
        );

        // Log debug info
        this.logger.debug(
          `Got ${transfers.length} transfers for token ${tokenAddress}`
        );
        if (transfers.length > 0) {
          this.logger.debug(
            `First transfer timestamp: ${transfers[0].blockTimestamp}, startTime: ${startTime}`
          );
        }

        // Filter transfers by timestamp and aggregate by address
        const addressVolumes = new Map<string, bigint>();
        let filteredCount = 0;

        for (const transfer of transfers) {
          const timestamp = parseInt(transfer.blockTimestamp);

          // Note: If Subgraph data is older than timeRange, include all available transfers
          if (timestamp < startTime) {
            // Log only once when no recent data available
            if (filteredCount === 0 && transfers.length > 0) {
              this.logger.warn(
                `No transfers found within timeRange (${hours}h). Using all available transfers.`
              );
            }
            // Continue to aggregate all available transfers for now
          }
          filteredCount++;

          const amount = BigInt(transfer.amount);
          const fromAddr = transfer.from.toLowerCase();
          const toAddr = transfer.to.toLowerCase();

          // Aggregate sent volume for 'from' address
          const fromVolume = addressVolumes.get(fromAddr) || BigInt(0);
          addressVolumes.set(fromAddr, fromVolume + amount);

          // Aggregate received volume for 'to' address
          const toVolume = addressVolumes.get(toAddr) || BigInt(0);
          addressVolumes.set(toAddr, toVolume + amount);
        }

        this.logger.debug(
          `Aggregated ${addressVolumes.size} unique addresses from ${filteredCount} transfers`
        );

        // Convert to array and sort by volume
        const rankings = Array.from(addressVolumes.entries())
          .map(([address, volume]) => ({
            address,
            totalVolume: volume.toString(),
            transactionCount: 0, // Could be calculated if needed
            rank: 0, // Will be set below
          }))
          .sort((a, b) => {
            const volA = BigInt(a.totalVolume);
            const volB = BigInt(b.totalVolume);
            return volA > volB ? -1 : volA < volB ? 1 : 0;
          })
          .slice(0, limit)
          .map((item, index) => ({
            ...item,
            rank: index + 1,
          }));

        return rankings;
      }
    );
  }

  /**
   * Get whale addresses (large balance holders)
   */
  async getWhales(
    token?: string,
    timeRange?: string,
    limit = 20
  ): Promise<WhaleAddress[]> {
    const hours = parseTimeRangeToHours(timeRange);
    const cacheKey = `addresses:whales:${token || 'all'}:${hours}:${limit}`;

    return this.withCache(
      cacheKey,
      CacheTTL.TRANSACTIONS_BY_ADDRESS,
      async () => {
        const tokenAddress = token
          ? getTokenAddress(token)
          : getTokenAddress('MSQ');

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

        // Filter for whales (top holders with significant percentage)
        return accounts
          .filter(acc => BigInt(acc.balance) > BigInt(0))
          .map(account => ({
            address: account.account,
            balance: account.balance,
            percentage:
              total > 0
                ? Number((BigInt(account.balance) * BigInt(10000)) / total) /
                  100
                : 0,
          }));
      }
    );
  }

  /**
   * Get most active traders by transaction count
   */
  async getActiveTraders(
    token?: string,
    timeRange?: string,
    limit = 50
  ): Promise<ActiveTrader[]> {
    const hours = parseTimeRangeToHours(timeRange);
    const cacheKey = `addresses:active-traders:${token || 'all'}:${hours}:${limit}`;

    return this.withCache(
      cacheKey,
      CacheTTL.TRANSACTIONS_BY_ADDRESS,
      async () => {
        const tokenAddress = token
          ? getTokenAddress(token)
          : getTokenAddress('MSQ');

        if (!tokenAddress) {
          return [];
        }

        // Get accounts sorted by balance as proxy for activity
        const accounts = await this.subgraphClient.getTokenAccountsByToken(
          tokenAddress,
          limit,
          0
        );

        return accounts.map(account => ({
          address: account.account,
          transactionCount: 0, // Would need to count transfers
          volume: account.balance,
        }));
      }
    );
  }

  /**
   * Get suspicious addresses (placeholder - requires database)
   */
  async getSuspicious(
    token?: string,
    timeRange?: string,
    limit = 20
  ): Promise<SuspiciousAddress[]> {
    const hours = parseTimeRangeToHours(timeRange);
    const cacheKey = `addresses:suspicious:${token || 'all'}:${hours}:${limit}`;

    return this.withCache(
      cacheKey,
      CacheTTL.TRANSACTIONS_BY_ADDRESS,
      async () => {
        // Suspicious address detection requires MySQL anomalies table
        // For now, return empty array as placeholder
        this.logger.debug(
          'Suspicious addresses endpoint - database integration pending'
        );
        return [];
      }
    );
  }

  /**
   * Get statistics for a specific address
   */
  async getAddressStats(
    address: string,
    token?: string,
    timeRange?: string
  ): Promise<AddressStats> {
    const hours = parseTimeRangeToHours(timeRange);
    const cacheKey = `addresses:stats:${address}:${token || 'all'}:${hours}`;

    return this.withCache(
      cacheKey,
      CacheTTL.TRANSACTIONS_BY_ADDRESS,
      async () => {
        // Get all token balances for this address
        const accounts = await this.subgraphClient.getTokenAccountsByAddress(
          address,
          100,
          0
        );

        // Get recent transfers to calculate sent/received
        const transfers = await this.subgraphClient.getTransfersByAddress(
          address,
          100,
          0
        );

        let totalSent = BigInt(0);
        let totalReceived = BigInt(0);

        for (const transfer of transfers) {
          const amount = BigInt(transfer.amount);
          if (transfer.from.toLowerCase() === address.toLowerCase()) {
            totalSent += amount;
          }
          if (transfer.to.toLowerCase() === address.toLowerCase()) {
            totalReceived += amount;
          }
        }

        return {
          address,
          totalSent: totalSent.toString(),
          totalReceived: totalReceived.toString(),
          transactionCount: transfers.length,
          tokenBalances: accounts.map(acc => ({
            token: acc.token.id,
            symbol: acc.token.symbol || 'UNKNOWN',
            balance: acc.balance,
          })),
        };
      }
    );
  }

  /**
   * Get time-series trends for an address
   */
  async getAddressTrends(
    address: string,
    token?: string,
    timeRange?: string,
    interval = 'hour'
  ): Promise<AddressTrend[]> {
    const hours = parseTimeRangeToHours(timeRange);
    const cacheKey = `addresses:trends:${address}:${token || 'all'}:${hours}:${interval}`;

    return this.withCache(
      cacheKey,
      CacheTTL.TRANSACTIONS_BY_ADDRESS,
      async () => {
        // Get transfers for this address
        const transfers = await this.subgraphClient.getTransfersByAddress(
          address,
          500,
          0
        );

        // Aggregate by time bucket
        const now = Math.floor(Date.now() / 1000);
        const bucketSize = interval === 'hour' ? 3600 : 86400;
        const startTime = now - hours * 3600;

        const buckets = new Map<number, { volume: bigint; count: number }>();

        // Initialize buckets
        for (let t = startTime; t <= now; t += bucketSize) {
          const bucketKey = Math.floor(t / bucketSize) * bucketSize;
          buckets.set(bucketKey, { volume: BigInt(0), count: 0 });
        }

        // Aggregate transfers into buckets
        for (const transfer of transfers) {
          const timestamp = parseInt(transfer.blockTimestamp);
          if (timestamp >= startTime) {
            const bucketKey = Math.floor(timestamp / bucketSize) * bucketSize;
            const bucket = buckets.get(bucketKey);
            if (bucket) {
              bucket.volume += BigInt(transfer.amount);
              bucket.count += 1;
            }
          }
        }

        // Convert to array
        return Array.from(buckets.entries())
          .sort(([a], [b]) => a - b)
          .map(([timestamp, data]) => ({
            timestamp: timestamp * 1000,
            volume: data.volume.toString(),
            transactionCount: data.count,
          }));
      }
    );
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
