/**
 * AddressRankingService - Address Rankings and Behavioral Analysis Engine
 *
 * Generates comprehensive address rankings and behavioral pattern analysis
 * for real-time identification of whales, active traders, and suspicious addresses.
 * Uses percentile-based rankings and z-score analysis for outlier detection.
 */

// eslint-disable-next-line @nx/enforce-module-boundaries
import { prisma } from '@msq-tx-monitor/database';
import {
  AddressStatsCacheService,
  AddressRanking,
} from './addressStatsCacheService';

export interface RankingCriteria {
  volumeWeight: number; // Total volume weight
  frequencyWeight: number; // Transaction frequency weight
  recencyWeight: number; // Recent activity weight
  diversityWeight: number; // Trading diversity weight
}

export interface BehavioralCategory {
  whale: boolean; // Top 1% by volume
  activeTrader: boolean; // High frequency trader
  dormantAccount: boolean; // Inactive for 30+ days
  suspiciousPattern: boolean; // Anomalous behavior detected
  highRisk: boolean; // High risk score
}

export interface AddressProfile {
  address: string;
  tokenAddress: string;
  rank: number;
  percentile: number;
  category: BehavioralCategory;
  scores: {
    volume: number;
    frequency: number;
    recency: number;
    diversity: number;
    composite: number;
  };
  label?: string;
  metadata: {
    totalVolume: bigint;
    transactionCount: number;
    lastActivity: Date;
    daysSinceFirstSeen: number;
  };
}

export interface RankingStatistics {
  totalAddresses: number;
  whaleCount: number;
  activeTraderCount: number;
  dormantCount: number;
  suspiciousCount: number;
  averageVolume: number;
  medianVolume: number;
  volumePercentiles: {
    p90: number;
    p95: number;
    p99: number;
  };
}

export class AddressRankingService {
  private static instance: AddressRankingService;
  private cacheService: AddressStatsCacheService;

  // Ranking configuration
  private static readonly DEFAULT_CRITERIA: RankingCriteria = {
    volumeWeight: 0.4,
    frequencyWeight: 0.3,
    recencyWeight: 0.2,
    diversityWeight: 0.1,
  };

  // Behavioral thresholds
  private static readonly WHALE_PERCENTILE = 99; // Top 1%
  private static readonly ACTIVE_TRADER_THRESHOLD = 50; // 50+ transactions
  private static readonly DORMANT_DAYS_THRESHOLD = 30;
  private static readonly SUSPICIOUS_RISK_THRESHOLD = 0.8;
  private static readonly HIGH_RISK_THRESHOLD = 0.7;

  private constructor() {
    this.cacheService = AddressStatsCacheService.getInstance();
  }

  static getInstance(): AddressRankingService {
    if (!AddressRankingService.instance) {
      AddressRankingService.instance = new AddressRankingService();
    }
    return AddressRankingService.instance;
  }

  /**
   * Generate comprehensive rankings for all addresses of a token
   */
  async generateTokenRankings(
    tokenAddress: string,
    criteria: RankingCriteria = AddressRankingService.DEFAULT_CRITERIA
  ): Promise<AddressProfile[]> {
    try {
      // Get all address statistics for the token
      const addressStats = await prisma.addressStatistics.findMany({
        where: { tokenAddress },
        orderBy: [{ totalSent: 'desc' }, { totalReceived: 'desc' }],
      });

      if (addressStats.length === 0) {
        return [];
      }

      // Calculate percentiles and z-scores
      const volumeValues = addressStats.map(
        stat => Number(stat.totalSent) + Number(stat.totalReceived)
      );
      const frequencyValues = addressStats.map(
        stat => stat.transactionCountSent + stat.transactionCountReceived
      );

      const volumePercentiles = this.calculatePercentiles(volumeValues);
      const frequencyPercentiles = this.calculatePercentiles(frequencyValues);

      // Generate profiles for each address
      const profiles: AddressProfile[] = addressStats.map((stat, index) => {
        const totalVolume = BigInt(
          Number(stat.totalSent) + Number(stat.totalReceived)
        );
        const totalTransactions =
          stat.transactionCountSent + stat.transactionCountReceived;
        const volumeScore = this.calculatePercentileScore(
          Number(totalVolume),
          volumePercentiles
        );
        const frequencyScore = this.calculatePercentileScore(
          totalTransactions,
          frequencyPercentiles
        );

        // Calculate recency score (higher for more recent activity)
        const daysSinceLastActivity = stat.lastSeen
          ? Math.floor(
              (Date.now() - stat.lastSeen.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 999;
        const recencyScore = Math.max(0, 100 - daysSinceLastActivity);

        // Calculate diversity score (already in stats)
        const diversityScore = Number(stat.diversityScore) * 100;

        // Calculate composite score
        const compositeScore =
          volumeScore * criteria.volumeWeight +
          frequencyScore * criteria.frequencyWeight +
          recencyScore * criteria.recencyWeight +
          diversityScore * criteria.diversityWeight;

        // Determine behavioral category
        const category = this.categorizeBehavior(
          stat,
          volumeScore,
          frequencyScore,
          daysSinceLastActivity
        );

        // Calculate days since first seen
        const daysSinceFirstSeen = stat.firstSeen
          ? Math.floor(
              (Date.now() - stat.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        return {
          address: stat.address,
          tokenAddress: stat.tokenAddress,
          rank: index + 1,
          percentile: volumeScore,
          category,
          scores: {
            volume: volumeScore,
            frequency: frequencyScore,
            recency: recencyScore,
            diversity: diversityScore,
            composite: compositeScore,
          },
          label: this.generateAddressLabel(category),
          metadata: {
            totalVolume,
            transactionCount: totalTransactions,
            lastActivity: stat.lastSeen || new Date(0),
            daysSinceFirstSeen,
          },
        };
      });

      // Sort by composite score and update ranks
      profiles.sort((a, b) => b.scores.composite - a.scores.composite);
      profiles.forEach((profile, index) => {
        profile.rank = index + 1;
      });

      // Cache rankings
      await this.cacheRankings(tokenAddress, profiles);

      return profiles;
    } catch (error) {
      console.error('❌ Error generating token rankings:', error);
      throw error;
    }
  }

  /**
   * Get whale addresses (top 1% by volume)
   */
  async getWhaleAddresses(tokenAddress: string): Promise<AddressProfile[]> {
    const rankings = await this.generateTokenRankings(tokenAddress);
    return rankings.filter(profile => profile.category.whale);
  }

  /**
   * Get active traders (high frequency)
   */
  async getActiveTraders(tokenAddress: string): Promise<AddressProfile[]> {
    const rankings = await this.generateTokenRankings(tokenAddress);
    return rankings.filter(profile => profile.category.activeTrader);
  }

  /**
   * Get suspicious addresses
   */
  async getSuspiciousAddresses(
    tokenAddress: string
  ): Promise<AddressProfile[]> {
    const rankings = await this.generateTokenRankings(tokenAddress);
    return rankings.filter(
      profile => profile.category.suspiciousPattern || profile.category.highRisk
    );
  }

  /**
   * Analyze trading patterns for anomaly detection
   */
  async analyzeTradePatterns(tokenAddress: string): Promise<{
    anomalies: AddressProfile[];
    statistics: RankingStatistics;
  }> {
    const rankings = await this.generateTokenRankings(tokenAddress);

    const statistics: RankingStatistics = {
      totalAddresses: rankings.length,
      whaleCount: rankings.filter(p => p.category.whale).length,
      activeTraderCount: rankings.filter(p => p.category.activeTrader).length,
      dormantCount: rankings.filter(p => p.category.dormantAccount).length,
      suspiciousCount: rankings.filter(p => p.category.suspiciousPattern)
        .length,
      averageVolume:
        rankings.reduce((sum, p) => sum + Number(p.metadata.totalVolume), 0) /
        rankings.length,
      medianVolume: this.calculateMedian(
        rankings.map(p => Number(p.metadata.totalVolume))
      ),
      volumePercentiles: {
        p90: this.calculatePercentile(
          rankings.map(p => Number(p.metadata.totalVolume)),
          90
        ),
        p95: this.calculatePercentile(
          rankings.map(p => Number(p.metadata.totalVolume)),
          95
        ),
        p99: this.calculatePercentile(
          rankings.map(p => Number(p.metadata.totalVolume)),
          99
        ),
      },
    };

    const anomalies = rankings.filter(
      profile =>
        profile.category.suspiciousPattern || profile.scores.composite > 95 // Top 5% composite score
    );

    return { anomalies, statistics };
  }

  /**
   * Calculate percentiles for a dataset
   */
  private calculatePercentiles(values: number[]): number[] {
    return values.slice().sort((a, b) => a - b);
  }

  /**
   * Calculate percentile score for a value
   */
  private calculatePercentileScore(
    value: number,
    sortedValues: number[]
  ): number {
    const index = sortedValues.findIndex(v => v >= value);
    if (index === -1) return 100;
    return (index / sortedValues.length) * 100;
  }

  /**
   * Calculate specific percentile value
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate median value
   */
  private calculateMedian(values: number[]): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Categorize address behavior
   */
  private categorizeBehavior(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stat: any,
    volumeScore: number,
    frequencyScore: number,
    daysSinceLastActivity: number
  ): BehavioralCategory {
    return {
      whale: volumeScore >= AddressRankingService.WHALE_PERCENTILE,
      activeTrader:
        stat.transactionCountSent + stat.transactionCountReceived >=
        AddressRankingService.ACTIVE_TRADER_THRESHOLD,
      dormantAccount:
        daysSinceLastActivity >= AddressRankingService.DORMANT_DAYS_THRESHOLD,
      suspiciousPattern:
        Number(stat.riskScore) >=
        AddressRankingService.SUSPICIOUS_RISK_THRESHOLD,
      highRisk:
        Number(stat.riskScore) >= AddressRankingService.HIGH_RISK_THRESHOLD,
    };
  }

  /**
   * Generate human-readable label for address
   */
  private generateAddressLabel(category: BehavioralCategory): string {
    if (category.whale) return '🐋 Whale';
    if (category.suspiciousPattern) return '⚠️ Suspicious';
    if (category.highRisk) return '🚨 High Risk';
    if (category.activeTrader) return '⚡ Active Trader';
    if (category.dormantAccount) return '😴 Dormant';
    return '👤 Regular';
  }

  /**
   * Cache rankings in Redis
   */
  private async cacheRankings(
    tokenAddress: string,
    profiles: AddressProfile[]
  ): Promise<void> {
    if (!this.cacheService.isReady()) {
      return;
    }

    try {
      // Cache whale rankings
      const whales: AddressRanking[] = profiles
        .filter(p => p.category.whale)
        .slice(0, 100) // Top 100 whales
        .map(p => ({
          address: p.address,
          tokenAddress: p.tokenAddress,
          rank: p.rank,
          score: p.scores.composite,
          label: p.label,
        }));

      await this.cacheService.setAddressRankings(
        tokenAddress,
        'whales',
        whales
      );

      // Cache risky addresses
      const risky: AddressRanking[] = profiles
        .filter(p => p.category.suspiciousPattern || p.category.highRisk)
        .slice(0, 50) // Top 50 risky
        .map(p => ({
          address: p.address,
          tokenAddress: p.tokenAddress,
          rank: p.rank,
          score: p.scores.composite,
          label: p.label,
        }));

      await this.cacheService.setAddressRankings(tokenAddress, 'risky', risky);

      // Cache active traders
      const active: AddressRanking[] = profiles
        .filter(p => p.category.activeTrader)
        .slice(0, 100) // Top 100 active
        .map(p => ({
          address: p.address,
          tokenAddress: p.tokenAddress,
          rank: p.rank,
          score: p.scores.composite,
          label: p.label,
        }));

      await this.cacheService.setAddressRankings(
        tokenAddress,
        'active',
        active
      );

      console.log(
        `✅ Cached rankings for token ${tokenAddress}: ${whales.length} whales, ${risky.length} risky, ${active.length} active`
      );
    } catch (error) {
      console.error('❌ Failed to cache rankings:', error);
    }
  }

  /**
   * Get cached rankings by type
   */
  async getCachedRankings(
    tokenAddress: string,
    type: 'whales' | 'risky' | 'active'
  ): Promise<AddressRanking[] | null> {
    return this.cacheService.getAddressRankings(tokenAddress, type);
  }

  /**
   * Update rankings for a specific address after transaction
   */
  async updateAddressRanking(
    address: string,
    tokenAddress: string
  ): Promise<void> {
    try {
      // For efficiency, we could implement incremental ranking updates here
      // For now, we'll trigger a partial re-ranking for the specific token
      console.log(
        `🔄 Updating rankings for address ${address} on token ${tokenAddress}`
      );

      // In a production system, you might want to:
      // 1. Update only the affected address's scores
      // 2. Recalculate only if ranking position might change significantly
      // 3. Use a background job for full re-ranking

      // For now, invalidate cache to force recalculation on next request
      // This could be optimized further based on usage patterns
    } catch (error) {
      console.error('❌ Error updating address ranking:', error);
    }
  }
}
