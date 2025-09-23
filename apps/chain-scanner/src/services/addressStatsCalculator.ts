/**
 * AddressStatsCalculator - Real-time Address Statistics Engine
 *
 * Calculates and updates address statistics in real-time as transactions are processed.
 * Uses efficient incremental algorithms to avoid full recalculation and provides
 * behavioral pattern analysis for risk assessment.
 */

import { prisma } from '@msq-tx-monitor/database';
import { TransactionData } from './databaseService';

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
  totalSent?: bigint;
  totalReceived?: bigint;
  transactionCountSent?: number;
  transactionCountReceived?: number;

  // Averages and maximums
  avgTransactionSize?: number;
  avgTransactionSizeSent?: number;
  avgTransactionSizeReceived?: number;
  maxTransactionSize?: bigint;
  maxTransactionSizeSent?: bigint;
  maxTransactionSizeReceived?: bigint;

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
    anomalyPattern: 0.2
  };

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
        totalSent: direction === 'sent' ? amount : BigInt(0),
        totalReceived: direction === 'received' ? amount : BigInt(0),
        transactionCountSent: direction === 'sent' ? 1 : 0,
        transactionCountReceived: direction === 'received' ? 1 : 0,
        avgTransactionSize: Number(amount),
        avgTransactionSizeSent: direction === 'sent' ? Number(amount) : 0,
        avgTransactionSizeReceived: direction === 'received' ? Number(amount) : 0,
        maxTransactionSize: amount,
        maxTransactionSizeSent: direction === 'sent' ? amount : BigInt(0),
        maxTransactionSizeReceived: direction === 'received' ? amount : BigInt(0),
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
    const now = new Date();

    // Update totals and counts
    if (direction === 'sent') {
      updates.totalSent = currentStats.totalSent + amount;
      updates.transactionCountSent = currentStats.transactionCountSent + 1;

      // Calculate new average for sent transactions
      updates.avgTransactionSizeSent = this.calculateNewAverage(
        currentStats.avgTransactionSizeSent,
        currentStats.transactionCountSent,
        Number(amount)
      );

      // Update maximum sent
      updates.maxTransactionSizeSent = amount > currentStats.maxTransactionSizeSent
        ? amount
        : currentStats.maxTransactionSizeSent;
    } else {
      updates.totalReceived = currentStats.totalReceived + amount;
      updates.transactionCountReceived = currentStats.transactionCountReceived + 1;

      // Calculate new average for received transactions
      updates.avgTransactionSizeReceived = this.calculateNewAverage(
        currentStats.avgTransactionSizeReceived,
        currentStats.transactionCountReceived,
        Number(amount)
      );

      // Update maximum received
      updates.maxTransactionSizeReceived = amount > currentStats.maxTransactionSizeReceived
        ? amount
        : currentStats.maxTransactionSizeReceived;
    }

    // Update overall averages and maximums
    const totalTransactions = (currentStats.transactionCountSent || 0) +
                             (currentStats.transactionCountReceived || 0) + 1;
    const totalVolume = (currentStats.totalSent || BigInt(0)) +
                       (currentStats.totalReceived || BigInt(0)) + amount;

    updates.avgTransactionSize = Number(totalVolume) / totalTransactions;
    updates.maxTransactionSize = amount > currentStats.maxTransactionSize
      ? amount
      : currentStats.maxTransactionSize;

    // Update timestamps and activity
    updates.lastSeen = timestamp;
    updates.lastActivityType = direction;
    updates.isActive = true;
    updates.dormancyPeriod = this.calculateDormancyPeriod(currentStats.lastSeen, timestamp);

    // Calculate behavioral metrics
    updates.velocityScore = await this.calculateVelocityScore(
      currentStats,
      timestamp,
      totalTransactions
    );

    updates.diversityScore = this.calculateDiversityScore(currentStats);

    // Update whale status
    const newTotalSent = direction === 'sent'
      ? (currentStats.totalSent || BigInt(0)) + amount
      : currentStats.totalSent || BigInt(0);
    const newTotalReceived = direction === 'received'
      ? (currentStats.totalReceived || BigInt(0)) + amount
      : currentStats.totalReceived || BigInt(0);

    updates.isWhale = (newTotalSent + newTotalReceived) >= AddressStatsCalculator.WHALE_THRESHOLD;

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
      ? Math.max(1, Math.floor(
          (timestamp.getTime() - currentStats.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
        ))
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
    const totalTransactions = (currentStats.transactionCountSent || 0) +
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
    const flags: BehavioralFlags = { ...currentFlags } || {};

    // Update based on transaction characteristics
    flags.hasLargeTransactions = (flags.hasLargeTransactions || false) ||
      amount >= AddressStatsCalculator.WHALE_THRESHOLD;

    flags.hasHighFrequency = velocityScore > 0.8;

    // Bot detection (simplified heuristics)
    flags.isBot = velocityScore > 0.9 && totalTransactions > 50;

    // Pattern analysis (simplified)
    flags.hasSuspiciousPatterns = velocityScore > 0.95 &&
      amount >= AddressStatsCalculator.WHALE_THRESHOLD;

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
  async updateAddressStatisticsBatch(transactions: TransactionData[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const transaction of transactions) {
        await this.updateAddressStatistics(transaction, tx);
      }
    });
  }
}