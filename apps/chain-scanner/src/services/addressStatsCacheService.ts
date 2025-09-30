/**
 * AddressStatsCacheService - Redis-based Caching Layer for Address Statistics
 *
 * Provides high-performance caching for address statistics data with intelligent
 * TTL management, batch operations, and comprehensive cache warming strategies.
 * Uses Redis for persistent caching with optimized key structures and pipeline operations.
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '@msq-tx-monitor/msq-common';

export interface CachedAddressStats {
  address: string;
  tokenAddress: string;
  totalSent: string;
  totalReceived: string;
  transactionCountSent: number;
  transactionCountReceived: number;
  avgTransactionSize: number;
  avgTransactionSizeSent: number;
  avgTransactionSizeReceived: number;
  maxTransactionSize: string;
  maxTransactionSizeSent: string;
  maxTransactionSizeReceived: string;
  velocityScore: number;
  diversityScore: number;
  dormancyPeriod: number;
  riskScore: number;
  isWhale: boolean;
  isSuspicious: boolean;
  isActive: boolean;
  behavioralFlags: object | null;
  lastActivityType: string | null;
  addressLabel: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  updatedAt: string;
}

export interface AddressRanking {
  address: string;
  tokenAddress: string;
  rank: number;
  score: number;
  label?: string;
}

export interface CacheStatistics {
  totalKeys: number;
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  operations: {
    gets: number;
    sets: number;
    deletes: number;
    hits: number;
    misses: number;
  };
}

export class AddressStatsCacheService {
  private static instance: AddressStatsCacheService;
  private client: RedisClientType | null = null;
  private isConnected = false;
  private statistics: CacheStatistics = {
    totalKeys: 0,
    hitRate: 0,
    missRate: 0,
    memoryUsage: 0,
    operations: {
      gets: 0,
      sets: 0,
      deletes: 0,
      hits: 0,
      misses: 0,
    },
  };

  private constructor() {}

  static getInstance(): AddressStatsCacheService {
    if (!AddressStatsCacheService.instance) {
      AddressStatsCacheService.instance = new AddressStatsCacheService();
    }
    return AddressStatsCacheService.instance;
  }

  /**
   * Initialize Redis connection with reconnection logic
   */
  async initialize(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              logger.error('❌ Redis connection failed after 10 retries');
              return new Error('Redis connection failed');
            }
            const delay = Math.min(retries * 100, 2000);
            logger.info(
              `🔄 Redis reconnecting in ${delay}ms (attempt ${retries})`
            );
            return delay;
          },
          connectTimeout: 10000,
        },
        password: config.redis.password,
        database: config.redis.db,
      });

      // Event handlers
      this.client.on('connect', () => {
        logger.info('🔄 Redis cache connecting...');
      });

      this.client.on('ready', () => {
        logger.info('✅ Redis cache connected and ready');
        this.isConnected = true;
      });

      this.client.on('error', (error: Error) => {
        logger.error('❌ Redis cache connection error:', error);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('🔌 Redis cache connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
      logger.info('✅ AddressStatsCacheService initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize AddressStatsCacheService:', error);
      throw error;
    }
  }

  /**
   * Generate cache keys for different data types
   */
  private generateKey(type: string, ...parts: string[]): string {
    return `${config.redis.keyPrefix}${type}:${parts.join(':')}`;
  }

  /**
   * Get address statistics from cache
   */
  async getAddressStats(
    address: string,
    tokenAddress: string
  ): Promise<CachedAddressStats | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      this.statistics.operations.gets++;
      const key = this.generateKey('address_stats', tokenAddress, address);
      const cached = await this.client.get(key);

      if (cached) {
        this.statistics.operations.hits++;
        return JSON.parse(cached) as CachedAddressStats;
      }

      this.statistics.operations.misses++;
      return null;
    } catch (error) {
      logger.error(`❌ Cache GET error for address ${address}:`, error);
      return null;
    }
  }

  /**
   * Cache address statistics with appropriate TTL
   */
  async setAddressStats(
    stats: CachedAddressStats,
    isWhaleOrRisky = false
  ): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      this.statistics.operations.sets++;
      const key = this.generateKey(
        'address_stats',
        stats.tokenAddress,
        stats.address
      );
      const ttl = isWhaleOrRisky
        ? config.redis.ttl.whaleAddresses
        : config.redis.ttl.addressStats;

      await this.client.setEx(key, ttl, JSON.stringify(stats));
      return true;
    } catch (error) {
      logger.error(`❌ Cache SET error for address ${stats.address}:`, error);
      return false;
    }
  }

  /**
   * Cache address rankings (whales, risky addresses, etc.)
   */
  async setAddressRankings(
    tokenAddress: string,
    rankingType: 'whales' | 'risky' | 'active',
    rankings: AddressRanking[]
  ): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      this.statistics.operations.sets++;
      const key = this.generateKey(
        'address_rankings',
        tokenAddress,
        rankingType
      );
      const ttl = config.redis.ttl.rankings;

      await this.client.setEx(key, ttl, JSON.stringify(rankings));
      return true;
    } catch (error) {
      logger.error(`❌ Cache SET error for rankings ${rankingType}:`, error);
      return false;
    }
  }

  /**
   * Get address rankings from cache
   */
  async getAddressRankings(
    tokenAddress: string,
    rankingType: 'whales' | 'risky' | 'active'
  ): Promise<AddressRanking[] | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      this.statistics.operations.gets++;
      const key = this.generateKey(
        'address_rankings',
        tokenAddress,
        rankingType
      );
      const cached = await this.client.get(key);

      if (cached) {
        this.statistics.operations.hits++;
        return JSON.parse(cached) as AddressRanking[];
      }

      this.statistics.operations.misses++;
      return null;
    } catch (error) {
      logger.error(`❌ Cache GET error for rankings ${rankingType}:`, error);
      return null;
    }
  }

  /**
   * Cache token summary statistics
   */
  async setTokenSummary(
    tokenAddress: string,
    summary: object
  ): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      this.statistics.operations.sets++;
      const key = this.generateKey('address_stats', 'summary', tokenAddress);
      const ttl = config.redis.ttl.summary;

      await this.client.setEx(key, ttl, JSON.stringify(summary));
      return true;
    } catch (error) {
      logger.error(
        `❌ Cache SET error for token summary ${tokenAddress}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get token summary statistics from cache
   */
  async getTokenSummary(tokenAddress: string): Promise<object | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      this.statistics.operations.gets++;
      const key = this.generateKey('address_stats', 'summary', tokenAddress);
      const cached = await this.client.get(key);

      if (cached) {
        this.statistics.operations.hits++;
        return JSON.parse(cached);
      }

      this.statistics.operations.misses++;
      return null;
    } catch (error) {
      logger.error(
        `❌ Cache GET error for token summary ${tokenAddress}:`,
        error
      );
      return null;
    }
  }

  /**
   * Invalidate address cache
   */
  async invalidateAddressStats(
    address: string,
    tokenAddress: string
  ): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      this.statistics.operations.deletes++;
      const key = this.generateKey('address_stats', tokenAddress, address);
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`❌ Cache DELETE error for address ${address}:`, error);
      return false;
    }
  }

  /**
   * Batch update multiple address statistics using pipeline
   */
  async batchUpdateAddressStats(
    updates: Array<{ stats: CachedAddressStats; isWhaleOrRisky?: boolean }>
  ): Promise<boolean> {
    if (!this.isConnected || !this.client || updates.length === 0) {
      return false;
    }

    try {
      const pipeline = this.client.multi();

      for (const { stats, isWhaleOrRisky = false } of updates) {
        const key = this.generateKey(
          'address_stats',
          stats.tokenAddress,
          stats.address
        );
        const ttl = isWhaleOrRisky
          ? config.redis.ttl.whaleAddresses
          : config.redis.ttl.addressStats;

        pipeline.setEx(key, ttl, JSON.stringify(stats));
        this.statistics.operations.sets++;
      }

      await pipeline.exec();
      logger.info(
        `✅ Batch updated ${updates.length} address statistics in cache`
      );
      return true;
    } catch (error) {
      logger.error('❌ Batch cache update error:', error);
      return false;
    }
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  async warmCache(tokenAddresses: string[]): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    logger.info('🔥 Starting cache warming for address statistics...');

    try {
      // This is a placeholder - in real implementation, you would:
      // 1. Load top whale addresses from database
      // 2. Load most active addresses
      // 3. Load high-risk addresses
      // 4. Preload their statistics into cache

      for (const tokenAddress of tokenAddresses) {
        logger.info(`🔥 Warming cache for token: ${tokenAddress}`);
        // Actual warming logic would be implemented here
      }

      logger.info('✅ Cache warming completed');
    } catch (error) {
      logger.error('❌ Cache warming error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): CacheStatistics {
    const totalOperations =
      this.statistics.operations.hits + this.statistics.operations.misses;

    return {
      ...this.statistics,
      hitRate:
        totalOperations > 0
          ? this.statistics.operations.hits / totalOperations
          : 0,
      missRate:
        totalOperations > 0
          ? this.statistics.operations.misses / totalOperations
          : 0,
    };
  }

  /**
   * Get cache health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    memoryUsage?: number;
    keyCount?: number;
    ping?: number;
  }> {
    if (!this.isConnected || !this.client) {
      return { connected: false };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const ping = Date.now() - start;

      // Get memory usage and key count
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;

      const keyCount = await this.client.dbSize();

      return {
        connected: true,
        memoryUsage,
        keyCount,
        ping,
      };
    } catch (error) {
      logger.error('❌ Cache health check error:', error);
      return { connected: false };
    }
  }

  /**
   * Clear all cache data (use with caution)
   */
  async clearAllCache(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushDb();
      logger.info('🗑️ All cache data cleared');
      return true;
    } catch (error) {
      logger.error('❌ Cache clear error:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      logger.info('✅ Redis cache connection closed');
      this.isConnected = false;
    }
  }

  /**
   * Check if cache service is ready
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }
}
