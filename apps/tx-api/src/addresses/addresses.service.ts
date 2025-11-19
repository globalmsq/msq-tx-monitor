import { Injectable, Logger, Inject, HttpException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SubgraphClient } from '@msq-tx-monitor/subgraph-client';
import { CacheTTL } from '../config/cache.config.js';

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

  private readonly tokenAddresses: Record<string, string> = {
    MSQ: '0x6a8ec5f30645827384f1d3aaba5e29ed52abcdcb',
    SUT: '0xc1f6c86abee8e2e0b6fd5bd80f0b51fef783635c',
    KWT: '0x1e9c1b9d0064fcb7f0c6b7d379c1ba6c3e855fc5',
    P2UC: '0x71ed5740c5f4f8cc9f6c5b8e7c7b98f1c9f2b5a8',
  };

  constructor(
    private readonly subgraphClient: SubgraphClient,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  /**
   * Get address rankings by total volume
   */
  async getRankings(
    token?: string,
    hours = 24,
    limit = 50
  ): Promise<AddressRanking[]> {
    const cacheKey = `addresses:rankings:${token || 'all'}:${hours}:${limit}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_ADDRESS, async () => {
      const tokenAddress = token
        ? this.getTokenAddress(token)
        : this.tokenAddresses.MSQ;

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
    });
  }

  /**
   * Get whale addresses (large balance holders)
   */
  async getWhales(
    token?: string,
    hours = 24,
    limit = 20
  ): Promise<WhaleAddress[]> {
    const cacheKey = `addresses:whales:${token || 'all'}:${hours}:${limit}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_ADDRESS, async () => {
      const tokenAddress = token
        ? this.getTokenAddress(token)
        : this.tokenAddresses.MSQ;

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
              ? Number((BigInt(account.balance) * BigInt(10000)) / total) / 100
              : 0,
        }));
    });
  }

  /**
   * Get most active traders by transaction count
   */
  async getActiveTraders(
    token?: string,
    hours = 24,
    limit = 50
  ): Promise<ActiveTrader[]> {
    const cacheKey = `addresses:active-traders:${token || 'all'}:${hours}:${limit}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_ADDRESS, async () => {
      const tokenAddress = token
        ? this.getTokenAddress(token)
        : this.tokenAddresses.MSQ;

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
    });
  }

  /**
   * Get suspicious addresses (placeholder - requires database)
   */
  async getSuspicious(
    token?: string,
    hours = 24,
    limit = 20
  ): Promise<SuspiciousAddress[]> {
    const cacheKey = `addresses:suspicious:${token || 'all'}:${hours}:${limit}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_ADDRESS, async () => {
      // Suspicious address detection requires MySQL anomalies table
      // For now, return empty array as placeholder
      this.logger.debug(
        'Suspicious addresses endpoint - database integration pending'
      );
      return [];
    });
  }

  /**
   * Get statistics for a specific address
   */
  async getAddressStats(
    address: string,
    token?: string,
    hours = 24
  ): Promise<AddressStats> {
    const cacheKey = `addresses:stats:${address}:${token || 'all'}:${hours}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_ADDRESS, async () => {
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
    });
  }

  /**
   * Get time-series trends for an address
   */
  async getAddressTrends(
    address: string,
    token?: string,
    hours = 24,
    interval = 'hour'
  ): Promise<AddressTrend[]> {
    const cacheKey = `addresses:trends:${address}:${token || 'all'}:${hours}:${interval}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_BY_ADDRESS, async () => {
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
    });
  }

  /**
   * Helper: Convert token symbol to address
   */
  private getTokenAddress(symbol: string): string | undefined {
    return this.tokenAddresses[symbol.toUpperCase()];
  }

  /**
   * Helper: Convert token address to symbol
   */
  private getTokenSymbol(address: string): string | undefined {
    const entry = Object.entries(this.tokenAddresses).find(
      ([, addr]) => addr.toLowerCase() === address.toLowerCase()
    );
    return entry?.[0];
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
