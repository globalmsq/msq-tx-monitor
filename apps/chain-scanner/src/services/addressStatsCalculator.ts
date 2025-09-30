/**
 * AddressStatsCalculator - Real-time Address Statistics Engine
 *
 * Calculates and updates address statistics in real-time as transactions are processed.
 * Uses efficient incremental algorithms to avoid full recalculation and provides
 * behavioral pattern analysis for risk assessment.
 */

// eslint-disable-next-line @nx/enforce-module-boundaries
import { prisma } from '@msq-tx-monitor/database';
// Note: Removed Decimal import - using simplified conversion approach
import { TransactionData } from './databaseService';
import {
  AddressStatsCacheService,
  CachedAddressStats,
} from './addressStatsCacheService';
import { AddressRankingService } from './addressRankingService';
import { logger } from '@msq-tx-monitor/msq-common';

interface BehavioralFlags {
  isBot?: boolean;
  isExchange?: boolean;
  isContract?: boolean;
  hasHighFrequency?: boolean;
  hasLargeTransactions?: boolean;
  hasSuspiciousPatterns?: boolean;
}

interface AddressStatsUpdate {
  // Basic statistics
  totalSent?: string;
  totalReceived?: string;
  transactionCountSent?: number;
  transactionCountReceived?: number;

  // Averages and maximums
  avgTransactionSize?: number;
  avgTransactionSizeSent?: number;
  avgTransactionSizeReceived?: number;
  maxTransactionSize?: string;
  maxTransactionSizeSent?: string;
  maxTransactionSizeReceived?: string;

  // Behavioral metrics
  velocityScore?: number;
  diversityScore?: number;
  dormancyPeriod?: number;
  riskScore?: number;

  // Flags and metadata
  isWhale?: boolean;
  isSuspicious?: boolean;
  isActive?: boolean;
  behavioralFlags?: BehavioralFlags;
  lastActivityType?: string;
  addressLabel?: string;

  // Timestamps
  firstSeen?: Date;
  lastSeen?: Date;
}

export class AddressStatsCalculator {
  private static readonly WHALE_THRESHOLD = BigInt('1000000000000000000000'); // 1000 tokens
  private static readonly HIGH_FREQUENCY_THRESHOLD = 10; // transactions per hour
  private static readonly RISK_SCORE_WEIGHTS = {
    velocity: 0.3,
    diversity: 0.2,
    whaleActivity: 0.3,
    anomalyPattern: 0.2,
  };

  private cacheService: AddressStatsCacheService;
  private rankingService: AddressRankingService;

  constructor() {
    this.cacheService = AddressStatsCacheService.getInstance();
    this.rankingService = AddressRankingService.getInstance();
  }

  /**
   * Safely convert Decimal/Prisma values to BigInt, handling scientific notation
   */
  private static safeDecimalToBigInt(
    value:
      | string
      | number
      | bigint
      | { toFixed: (digits: number) => string }
      | null
      | undefined
  ): bigint {
    // Handle null/undefined
    if (value == null) {
      return BigInt(0);
    }

    // If the value has a toFixed method (like Prisma Decimal), use it
    if (
      value &&
      typeof value === 'object' &&
      'toFixed' in value &&
      typeof value.toFixed === 'function'
    ) {
      return BigInt(value.toFixed(0));
    }

    const stringValue = value.toString();

    // Check if the value is in scientific notation
    if (stringValue.includes('e') || stringValue.includes('E')) {
      // Convert scientific notation to regular notation
      const num = Number(stringValue);
      if (!Number.isInteger(num) || !Number.isFinite(num)) {
        // Round to nearest integer for decimal values or handle infinity
        return BigInt(
          Math.round(Math.max(0, Math.min(num, Number.MAX_SAFE_INTEGER)))
        );
      }
      return BigInt(Math.round(num));
    }

    // Handle regular string/number
    try {
      return BigInt(stringValue);
    } catch (error) {
      logger.warn(
        `Failed to convert value to BigInt: ${stringValue}, using 0`,
        error
      );
      return BigInt(0);
    }
  }

  /**
   * Initialize the cache service
   */
  async initialize(): Promise<void> {
    try {
      await this.cacheService.initialize();
    } catch (error) {
      logger.error(
        '❌ Failed to initialize cache service in AddressStatsCalculator:',
        error
      );
      // Continue without cache if initialization fails
    }
  }

  /**
   * Calculate and update address statistics for a single transaction
   */
  async updateAddressStatistics(
    transactionData: TransactionData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx?: any
  ): Promise<void> {
    const { from, to, value, timestamp, tokenAddress } = transactionData;
    const amount = BigInt(value);

    // Update sender statistics
    await this.updateSingleAddressStats(
      from,
      tokenAddress,
      amount,
      timestamp,
      'sent',
      tx
    );

    // Update receiver statistics
    await this.updateSingleAddressStats(
      to,
      tokenAddress,
      amount,
      timestamp,
      'received',
      tx
    );
  }

  /**
   * Update statistics for a single address and direction
   */
  private async updateSingleAddressStats(
    address: string,
    tokenAddress: string,
    amount: bigint,
    timestamp: Date,
    direction: 'sent' | 'received',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx?: any
  ): Promise<void> {
    const prismaClient = tx || prisma;

    // Get current statistics
    const currentStats = await prismaClient.addressStatistics.findUnique({
      where: {
        address_tokenAddress: {
          address,
          tokenAddress,
        },
      },
    });

    // Calculate incremental updates
    const updates = await this.calculateIncrementalStats(
      currentStats,
      amount,
      timestamp,
      direction
    );

    // Perform upsert operation
    await prismaClient.addressStatistics.upsert({
      where: {
        address_tokenAddress: {
          address,
          tokenAddress,
        },
      },
      update: {
        ...updates,
        updatedAt: new Date(),
      },
      create: {
        address,
        tokenAddress,
        totalSent: direction === 'sent' ? amount.toString() : '0',
        totalReceived: direction === 'received' ? amount.toString() : '0',
        transactionCountSent: direction === 'sent' ? 1 : 0,
        transactionCountReceived: direction === 'received' ? 1 : 0,
        avgTransactionSize: Number(amount),
        avgTransactionSizeSent: direction === 'sent' ? Number(amount) : 0,
        avgTransactionSizeReceived:
          direction === 'received' ? Number(amount) : 0,
        maxTransactionSize: amount.toString(),
        maxTransactionSizeSent: direction === 'sent' ? amount.toString() : '0',
        maxTransactionSizeReceived:
          direction === 'received' ? amount.toString() : '0',
        firstSeen: timestamp,
        lastSeen: timestamp,
        lastActivityType: direction,
        isActive: true,
        dormancyPeriod: 0,
        velocityScore: 0.5,
        diversityScore: 0.1,
        riskScore: 0.1,
        isWhale: amount >= AddressStatsCalculator.WHALE_THRESHOLD,
        isSuspicious: false,
        behavioralFlags: this.generateInitialBehavioralFlags(amount),
        updatedAt: new Date(),
      },
    });

    // Update cache after successful database update
    await this.updateCacheAfterStatsUpdate(address, tokenAddress, updates);

    // Update rankings for significant changes
    await this.updateRankingsIfNeeded(address, tokenAddress, updates);
  }

  /**
   * Update cache after successful database statistics update
   */
  private async updateCacheAfterStatsUpdate(
    address: string,
    tokenAddress: string,
    _updates: AddressStatsUpdate
  ): Promise<void> {
    if (!this.cacheService.isReady()) {
      return; // Skip cache update if cache is not available
    }

    try {
      // Get updated stats from database for cache
      const prismaClient = prisma;
      const updatedStats = await prismaClient.addressStatistics.findUnique({
        where: {
          address_tokenAddress: {
            address,
            tokenAddress,
          },
        },
      });

      if (updatedStats) {
        // Convert to cache format
        const cachedStats: CachedAddressStats = {
          address: updatedStats.address,
          tokenAddress: updatedStats.tokenAddress,
          totalSent: updatedStats.totalSent.toString(),
          totalReceived: updatedStats.totalReceived.toString(),
          transactionCountSent: updatedStats.transactionCountSent,
          transactionCountReceived: updatedStats.transactionCountReceived,
          avgTransactionSize: Number(updatedStats.avgTransactionSize),
          avgTransactionSizeSent: Number(updatedStats.avgTransactionSizeSent),
          avgTransactionSizeReceived: Number(
            updatedStats.avgTransactionSizeReceived
          ),
          maxTransactionSize: updatedStats.maxTransactionSize.toString(),
          maxTransactionSizeSent:
            updatedStats.maxTransactionSizeSent.toString(),
          maxTransactionSizeReceived:
            updatedStats.maxTransactionSizeReceived.toString(),
          velocityScore: Number(updatedStats.velocityScore),
          diversityScore: Number(updatedStats.diversityScore),
          dormancyPeriod: updatedStats.dormancyPeriod,
          riskScore: Number(updatedStats.riskScore),
          isWhale: updatedStats.isWhale,
          isSuspicious: updatedStats.isSuspicious,
          isActive: updatedStats.isActive,
          behavioralFlags: updatedStats.behavioralFlags as object | null,
          lastActivityType: updatedStats.lastActivityType,
          addressLabel: updatedStats.addressLabel,
          firstSeen: updatedStats.firstSeen?.toISOString() || null,
          lastSeen: updatedStats.lastSeen?.toISOString() || null,
          updatedAt: updatedStats.updatedAt.toISOString(),
        };

        // Determine cache TTL based on address characteristics
        const isWhaleOrRisky =
          updatedStats.isWhale || updatedStats.isSuspicious;

        // Update cache with appropriate TTL
        await this.cacheService.setAddressStats(cachedStats, isWhaleOrRisky);
      }
    } catch (error) {
      logger.error(`❌ Failed to update cache for address ${address}:`, error);
      // Don't throw error - cache update failure shouldn't break the main process
    }
  }

  /**
   * Calculate incremental statistics updates
   */
  private async calculateIncrementalStats(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentStats: any,
    amount: bigint,
    timestamp: Date,
    direction: 'sent' | 'received'
  ): Promise<AddressStatsUpdate> {
    if (!currentStats) {
      return {}; // Will use create path in upsert
    }

    const updates: AddressStatsUpdate = {};

    // Update totals and counts
    if (direction === 'sent') {
      updates.totalSent = (
        AddressStatsCalculator.safeDecimalToBigInt(currentStats.totalSent) +
        amount
      ).toString();
      updates.transactionCountSent = currentStats.transactionCountSent + 1;

      // Calculate new average for sent transactions
      updates.avgTransactionSizeSent = this.calculateNewAverage(
        currentStats.avgTransactionSizeSent,
        currentStats.transactionCountSent,
        Number(amount)
      );

      // Update maximum sent
      updates.maxTransactionSizeSent =
        amount >
        AddressStatsCalculator.safeDecimalToBigInt(
          currentStats.maxTransactionSizeSent
        )
          ? amount.toString()
          : currentStats.maxTransactionSizeSent.toString();
    } else {
      updates.totalReceived = (
        AddressStatsCalculator.safeDecimalToBigInt(currentStats.totalReceived) +
        amount
      ).toString();
      updates.transactionCountReceived =
        currentStats.transactionCountReceived + 1;

      // Calculate new average for received transactions
      updates.avgTransactionSizeReceived = this.calculateNewAverage(
        currentStats.avgTransactionSizeReceived,
        currentStats.transactionCountReceived,
        Number(amount)
      );

      // Update maximum received
      updates.maxTransactionSizeReceived =
        amount >
        AddressStatsCalculator.safeDecimalToBigInt(
          currentStats.maxTransactionSizeReceived
        )
          ? amount.toString()
          : currentStats.maxTransactionSizeReceived.toString();
    }

    // Update overall averages and maximums
    const totalTransactions =
      (currentStats.transactionCountSent || 0) +
      (currentStats.transactionCountReceived || 0) +
      1;
    const totalVolume =
      AddressStatsCalculator.safeDecimalToBigInt(currentStats.totalSent || 0) +
      AddressStatsCalculator.safeDecimalToBigInt(
        currentStats.totalReceived || 0
      ) +
      amount;

    updates.avgTransactionSize = Number(totalVolume) / totalTransactions;
    updates.maxTransactionSize =
      amount >
      AddressStatsCalculator.safeDecimalToBigInt(
        currentStats.maxTransactionSize
      )
        ? amount.toString()
        : currentStats.maxTransactionSize.toString();

    // Update timestamps and activity
    updates.lastSeen = timestamp;
    updates.lastActivityType = direction;
    updates.isActive = true;
    updates.dormancyPeriod = this.calculateDormancyPeriod(
      currentStats.lastSeen,
      timestamp
    );

    // Calculate behavioral metrics
    updates.velocityScore = await this.calculateVelocityScore(
      currentStats,
      timestamp,
      totalTransactions
    );

    updates.diversityScore = this.calculateDiversityScore(currentStats);

    // Update whale status
    const newTotalSent =
      direction === 'sent'
        ? AddressStatsCalculator.safeDecimalToBigInt(
            currentStats.totalSent || 0
          ) + amount
        : AddressStatsCalculator.safeDecimalToBigInt(
            currentStats.totalSent || 0
          );
    const newTotalReceived =
      direction === 'received'
        ? AddressStatsCalculator.safeDecimalToBigInt(
            currentStats.totalReceived || 0
          ) + amount
        : AddressStatsCalculator.safeDecimalToBigInt(
            currentStats.totalReceived || 0
          );

    updates.isWhale =
      newTotalSent + newTotalReceived >= AddressStatsCalculator.WHALE_THRESHOLD;

    // Update behavioral flags
    updates.behavioralFlags = this.updateBehavioralFlags(
      currentStats.behavioralFlags,
      amount,
      updates.velocityScore || 0,
      totalTransactions
    );

    // Calculate risk score
    updates.riskScore = this.calculateRiskScore(
      updates.velocityScore || 0,
      updates.diversityScore || 0,
      updates.isWhale || false,
      updates.behavioralFlags
    );

    updates.isSuspicious = (updates.riskScore || 0) > 0.7;

    return updates;
  }

  /**
   * Calculate new average using incremental algorithm
   */
  private calculateNewAverage(
    currentAverage: number,
    currentCount: number,
    newValue: number
  ): number {
    if (currentCount === 0) {
      return newValue;
    }

    return (currentAverage * currentCount + newValue) / (currentCount + 1);
  }

  /**
   * Calculate dormancy period in days
   */
  private calculateDormancyPeriod(lastSeen: Date, currentTime: Date): number {
    const diffTime = Math.abs(currentTime.getTime() - lastSeen.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate velocity score based on transaction frequency
   */
  private async calculateVelocityScore(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentStats: any,
    timestamp: Date,
    totalTransactions: number
  ): Promise<number> {
    const daysSinceFirstSeen = currentStats.firstSeen
      ? Math.max(
          1,
          Math.floor(
            (timestamp.getTime() - currentStats.firstSeen.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 1;

    const transactionsPerDay = totalTransactions / daysSinceFirstSeen;

    // Normalize to 0-1 scale (10+ transactions per day = 1.0)
    return Math.min(1, transactionsPerDay / 10);
  }

  /**
   * Calculate diversity score (placeholder - will be enhanced with actual counterparty analysis)
   */
  private calculateDiversityScore(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentStats: any
  ): number {
    // This is a simplified version. In production, we would analyze
    // the number of unique counterparties this address has interacted with
    const totalTransactions =
      (currentStats.transactionCountSent || 0) +
      (currentStats.transactionCountReceived || 0);

    // Assume diversity increases with transaction count (simplified)
    return Math.min(1, totalTransactions / 100);
  }

  /**
   * Generate initial behavioral flags for new addresses
   */
  private generateInitialBehavioralFlags(amount: bigint): BehavioralFlags {
    return {
      isBot: false,
      isExchange: false,
      isContract: false,
      hasHighFrequency: false,
      hasLargeTransactions: amount >= AddressStatsCalculator.WHALE_THRESHOLD,
      hasSuspiciousPatterns: false,
    };
  }

  /**
   * Update behavioral flags based on new transaction
   */
  private updateBehavioralFlags(
    currentFlags: BehavioralFlags | null,
    amount: bigint,
    velocityScore: number,
    totalTransactions: number
  ): BehavioralFlags {
    const flags: BehavioralFlags = { ...(currentFlags || {}) };

    // Update based on transaction characteristics
    flags.hasLargeTransactions =
      flags.hasLargeTransactions ||
      false ||
      amount >= AddressStatsCalculator.WHALE_THRESHOLD;

    flags.hasHighFrequency = velocityScore > 0.8;

    // Bot detection (simplified heuristics)
    flags.isBot = velocityScore > 0.9 && totalTransactions > 50;

    // Pattern analysis (simplified)
    flags.hasSuspiciousPatterns =
      velocityScore > 0.95 && amount >= AddressStatsCalculator.WHALE_THRESHOLD;

    return flags;
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(
    velocityScore: number,
    diversityScore: number,
    isWhale: boolean,
    behavioralFlags: BehavioralFlags
  ): number {
    const weights = AddressStatsCalculator.RISK_SCORE_WEIGHTS;

    let score = 0;

    // Velocity component (high frequency can be risky)
    score += weights.velocity * Math.min(1, velocityScore * 1.5);

    // Diversity component (low diversity can be suspicious)
    score += weights.diversity * (1 - diversityScore);

    // Whale component
    score += weights.whaleActivity * (isWhale ? 1 : 0);

    // Anomaly patterns
    let anomalyScore = 0;
    if (behavioralFlags.hasSuspiciousPatterns) anomalyScore += 0.4;
    if (behavioralFlags.isBot) anomalyScore += 0.3;
    if (behavioralFlags.hasHighFrequency) anomalyScore += 0.3;

    score += weights.anomalyPattern * Math.min(1, anomalyScore);

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Batch update statistics for multiple transactions
   */
  async updateAddressStatisticsBatch(
    transactions: TransactionData[]
  ): Promise<void> {
    await prisma.$transaction(async tx => {
      for (const transaction of transactions) {
        await this.updateAddressStatistics(transaction, tx);
      }
    });
  }

  /**
   * Update rankings if there are significant changes to address statistics
   */
  private async updateRankingsIfNeeded(
    address: string,
    tokenAddress: string,
    _updates: AddressStatsUpdate
  ): Promise<void> {
    try {
      // Update address ranking (delegated to ranking service)
      await this.rankingService.updateAddressRanking(address, tokenAddress);
    } catch (error) {
      logger.error('❌ Failed to update rankings for address:', error);
      // Don't throw error - ranking update failure shouldn't break transaction processing
    }
  }

  /**
   * Get address ranking information
   */
  async getAddressRanking(
    address: string,
    tokenAddress: string
  ): Promise<{
    whales: unknown[] | null;
    active: unknown[] | null;
    risky: unknown[] | null;
  }> {
    try {
      const [whales, active, risky] = await Promise.all([
        this.rankingService.getCachedRankings(tokenAddress, 'whales'),
        this.rankingService.getCachedRankings(tokenAddress, 'active'),
        this.rankingService.getCachedRankings(tokenAddress, 'risky'),
      ]);

      return { whales, active, risky };
    } catch (error) {
      logger.error('❌ Failed to get address rankings:', error);
      return { whales: null, active: null, risky: null };
    }
  }

  /**
   * Generate comprehensive address analytics including rankings
   */
  async generateAddressAnalytics(tokenAddress: string): Promise<{
    rankings: unknown;
    statistics: unknown;
    patterns: unknown;
  } | null> {
    try {
      const rankingService = this.rankingService;

      // Generate fresh rankings and patterns
      const [patterns, rankings] = await Promise.all([
        rankingService.analyzeTradePatterns(tokenAddress),
        rankingService.generateTokenRankings(tokenAddress),
      ]);

      return {
        rankings: rankings.slice(0, 100), // Top 100 addresses
        statistics: patterns.statistics,
        patterns: {
          anomalies: patterns.anomalies.slice(0, 20), // Top 20 anomalies
          whales: rankings.filter(r => r.category.whale).slice(0, 10),
          suspicious: rankings
            .filter(r => r.category.suspiciousPattern)
            .slice(0, 10),
        },
      };
    } catch (error) {
      logger.error('❌ Failed to generate address analytics:', error);
      return null;
    }
  }
}
