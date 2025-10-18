// eslint-disable-next-line @nx/enforce-module-boundaries
import { prisma } from '@msq-tx-monitor/database';
import { config } from '../config';
import Web3 from 'web3';
import { formatUnits } from 'ethers';
import { TokenService } from './tokenService';
import { logger } from '@msq-tx-monitor/msq-common';
import { AddressStatsCacheService } from './addressStatsCacheService';

// Type for Prisma Decimal values
type PrismaDecimal = { toString(): string };

export interface TokenStats {
  tokenSymbol: string;
  tokenAddress: string;
  volume24h: string;
  totalVolume: string;
  transactionCount: number;
}

export interface DashboardStats {
  totalTransactions: number;
  activeAddresses: number;
  tokenStats: TokenStats[];
  successRate: number;
  transactionsChange24h: number;
  addressesChange24h: number;
  updatedAt: Date;
}

export class StatisticsService {
  private initialized = false;
  private tokenService?: TokenService;

  constructor(tokenService?: TokenService) {
    this.tokenService = tokenService;
  }

  /**
   * Safely convert value to bigint, handling scientific notation
   */
  private safeBigInt(
    value: PrismaDecimal | string | number | bigint | null | undefined
  ): bigint {
    if (!value) return 0n;
    const strValue = value.toString();

    // Check for scientific notation
    if (strValue.includes('e') || strValue.includes('E')) {
      return BigInt(Math.floor(Number(strValue)));
    }

    return BigInt(strValue);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Test database connection
      await prisma.$connect();
      this.initialized = true;
      logger.info('✅ StatisticsService initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize StatisticsService:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive dashboard statistics with token-specific data
   */
  async getDashboardStats(): Promise<DashboardStats> {
    if (!this.initialized) {
      await this.initialize();
    }

    const CACHE_KEY = 'dashboard_stats:main';
    const CACHE_TTL = 300; // 5 minutes in seconds

    try {
      // Try to get from Redis cache first
      const cacheService = AddressStatsCacheService.getInstance();

      if (cacheService.isReady()) {
        try {
          const cached = await cacheService['client']?.get(CACHE_KEY);
          if (cached) {
            const cachedStats = JSON.parse(cached) as DashboardStats;
            // Convert updatedAt string back to Date object
            cachedStats.updatedAt = new Date(cachedStats.updatedAt);

            if (config.logging.enableDatabaseLogs) {
              logger.info('📊 Dashboard stats loaded from cache');
            }

            return cachedStats;
          }
        } catch (cacheError) {
          logger.warn(
            '⚠️ Cache read failed, falling back to database:',
            cacheError
          );
        }
      }

      // Execute parallel queries for general stats and token stats
      const [
        totalTransactionsResult,
        activeAddressesResult,
        tokenStatsResult,
        transactionsChange24h,
        addressesChange24h,
      ] = await Promise.all([
        this.getTotalTransactions(),
        this.getActiveAddresses(),
        this.getTokenSpecificStats(),
        this.getTransactionsChange24h(),
        this.getAddressesChange24h(),
      ]);

      const stats: DashboardStats = {
        totalTransactions: totalTransactionsResult,
        activeAddresses: activeAddressesResult,
        tokenStats: tokenStatsResult,
        successRate: 100, // All stored transactions are successful by definition
        transactionsChange24h,
        addressesChange24h,
        updatedAt: new Date(), // Add current timestamp
      };

      if (config.logging.enableDatabaseLogs) {
        logger.info('📊 Dashboard stats calculated:', {
          totalTransactions: stats.totalTransactions,
          activeAddresses: stats.activeAddresses,
          tokenCount: stats.tokenStats.length,
        });
      }

      // Cache the result with 5-minute TTL
      if (cacheService.isReady()) {
        try {
          await cacheService['client']?.setEx(
            CACHE_KEY,
            CACHE_TTL,
            JSON.stringify(stats)
          );
          if (config.logging.enableDatabaseLogs) {
            logger.info('✅ Dashboard stats cached for 5 minutes');
          }
        } catch (cacheError) {
          logger.warn('⚠️ Cache write failed:', cacheError);
        }
      }

      return stats;
    } catch (error) {
      logger.error('❌ Error calculating dashboard stats:', error);
      // Return default stats in case of error
      return {
        totalTransactions: 0,
        activeAddresses: 0,
        tokenStats: [],
        successRate: 0,
        transactionsChange24h: 0,
        addressesChange24h: 0,
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Get total number of transactions
   */
  private async getTotalTransactions(): Promise<number> {
    try {
      const result = await prisma.transaction.count();
      return result;
    } catch (error) {
      logger.error('Error getting total transactions:', error);
      return 0;
    }
  }

  /**
   * Get number of unique active addresses from AddressStatistics table
   */
  private async getActiveAddresses(): Promise<number> {
    try {
      // Count distinct addresses from AddressStatistics table where isActive is true
      const result = await prisma.addressStatistics.count({
        where: {
          isActive: true,
        },
      });

      return result;
    } catch (error) {
      logger.error('Error getting active addresses:', error);
      return 0;
    }
  }

  /**
   * Get 24-hour transaction volume in wei
   */
  private async get24HourVolume(): Promise<bigint> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await prisma.transaction.aggregate({
        _sum: {
          value: true,
        },
        where: {
          timestamp: {
            gte: twentyFourHoursAgo,
          },
        },
      });

      return this.safeBigInt(result._sum.value);
    } catch (error) {
      logger.error('Error getting 24h volume:', error);
      return 0n;
    }
  }

  /**
   * Get average transaction size in wei
   */
  private async getAverageTransactionSize(): Promise<bigint> {
    try {
      const result = await prisma.transaction.aggregate({
        _avg: {
          value: true,
        },
      });

      // Convert average to bigint (may lose some precision but acceptable for display)
      const avgValue = result._avg.value;
      return avgValue ? BigInt(Math.floor(Number(avgValue.toString()))) : 0n;
    } catch (error) {
      logger.error('Error getting average transaction size:', error);
      return 0n;
    }
  }

  /**
   * Get token-specific statistics for all active tokens
   */
  private async getTokenSpecificStats(): Promise<TokenStats[]> {
    try {
      // Use TokenService to get all active tokens, fallback to transaction data if not available
      if (!this.tokenService) {
        logger.warn(
          'TokenService not available, falling back to transaction-based token discovery'
        );

        // Fallback: Get distinct token addresses from transactions
        const tokenAddresses = await prisma.transaction.findMany({
          select: {
            tokenAddress: true,
            tokenSymbol: true,
          },
          distinct: ['tokenAddress'],
        });

        const tokenStatsPromises = tokenAddresses.map(async token => {
          const stats = await this.getTokenStats(token.tokenAddress);
          const volume24h = await this.getToken24hVolume(token.tokenAddress);
          return {
            tokenSymbol: token.tokenSymbol,
            tokenAddress: token.tokenAddress,
            volume24h: this.formatTokenAmount(volume24h, token.tokenAddress),
            totalVolume: this.formatTokenAmount(
              await this.getTokenTotalVolume(token.tokenAddress),
              token.tokenAddress
            ),
            transactionCount: stats.totalTransactions,
          };
        });

        return await Promise.all(tokenStatsPromises);
      }

      // Get all active tokens from TokenService (includes tokens without transactions)
      const allTokens = this.tokenService.getAllTokens();
      logger.info(
        `📊 Calculating stats for ${allTokens.length} tokens:`,
        allTokens.map(t => t.symbol)
      );

      const tokenStatsPromises = allTokens.map(async token => {
        const stats = await this.getTokenStats(token.address);
        const volume24h = await this.getToken24hVolume(token.address);
        return {
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          volume24h: this.formatTokenAmount(volume24h, token.address),
          totalVolume: this.formatTokenAmount(
            await this.getTokenTotalVolume(token.address),
            token.address
          ),
          transactionCount: stats.totalTransactions,
        };
      });

      return await Promise.all(tokenStatsPromises);
    } catch (error) {
      logger.error('Error getting token-specific stats:', error);
      return [];
    }
  }

  /**
   * Get average transaction size for specific token
   */
  private async getTokenAvgTxSize(tokenAddress: string): Promise<bigint> {
    try {
      const result = await prisma.transaction.aggregate({
        _avg: {
          value: true,
        },
        where: {
          tokenAddress,
        },
      });

      const avgValue = result._avg.value;
      return avgValue ? BigInt(Math.floor(Number(avgValue.toString()))) : 0n;
    } catch (error) {
      logger.error(`Error getting average tx size for ${tokenAddress}:`, error);
      return 0n;
    }
  }

  /**
   * Get total volume for specific token
   */
  private async getTokenTotalVolume(tokenAddress: string): Promise<bigint> {
    try {
      const result = await prisma.transaction.aggregate({
        _sum: {
          value: true,
        },
        where: {
          tokenAddress,
        },
      });

      return this.safeBigInt(result._sum.value);
    } catch (error) {
      logger.error(`Error getting total volume for ${tokenAddress}:`, error);
      return 0n;
    }
  }

  /**
   * Get 24h volume for specific token (returns raw bigint for proper formatting)
   */
  private async getToken24hVolume(tokenAddress: string): Promise<bigint> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await prisma.transaction.aggregate({
        _sum: { value: true },
        where: {
          tokenAddress,
          timestamp: { gte: twentyFourHoursAgo },
        },
      });

      return this.safeBigInt(result._sum.value);
    } catch (error) {
      logger.error(`Error getting 24h volume for ${tokenAddress}:`, error);
      return 0n;
    }
  }

  /**
   * Format token amount based on token's decimals (returns raw numeric value only)
   */
  private formatTokenAmount(amount: bigint, tokenAddress: string): string {
    try {
      let decimals = 18; // Default decimals

      // Get token info if tokenService is available
      if (this.tokenService) {
        const tokenInfo = this.tokenService.getTokenInfo(tokenAddress);
        if (tokenInfo) {
          decimals = tokenInfo.decimals;
        }
      }

      // Use ethers formatUnits for precise decimal conversion
      const formattedValue = formatUnits(amount.toString(), decimals);
      const tokenAmount = parseFloat(formattedValue);

      // Return raw numeric value only (no token symbol)
      // Client will handle K/M/B formatting and display
      if (tokenAmount === 0) {
        return '0';
      } else if (tokenAmount < 0.01) {
        return '0.01';
      } else {
        return tokenAmount.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
      }
    } catch (error) {
      logger.error('Error formatting token amount:', error);
      return '0';
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  private formatCurrency(weiAmount: bigint): string {
    try {
      // Convert wei to ether using Web3
      const etherAmount = Web3.utils.fromWei(weiAmount.toString(), 'ether');
      const numValue = parseFloat(etherAmount);

      // Format as currency
      if (numValue === 0) {
        return '$0';
      } else if (numValue < 0.01) {
        return '<$0.01';
      } else if (numValue >= 1000000) {
        return `$${(numValue / 1000000).toFixed(1)}M`;
      } else if (numValue >= 1000) {
        return `$${(numValue / 1000).toFixed(1)}K`;
      } else {
        return `$${numValue.toFixed(2)}`;
      }
    } catch (error) {
      logger.error('Error formatting currency:', error);
      return '$0';
    }
  }

  /**
   * Get health check status
   */
  async healthCheck(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('StatisticsService health check failed:', error);
      return false;
    }
  }

  /**
   * Get token-specific statistics
   */
  async getTokenStats(tokenAddress: string): Promise<{
    totalTransactions: number;
    volume24h: string;
    uniqueHolders: number;
  }> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [transactionCount, volume24h, uniqueHolders] = await Promise.all([
        // Total transactions for this token
        prisma.transaction.count({
          where: { tokenAddress },
        }),

        // 24h volume for this token
        prisma.transaction.aggregate({
          _sum: { value: true },
          where: {
            tokenAddress,
            timestamp: { gte: twentyFourHoursAgo },
          },
        }),

        // Unique holders (approximate - addresses that sent or received this token)
        prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(DISTINCT address) as count FROM (
            SELECT fromAddress as address FROM transactions WHERE tokenAddress = ${tokenAddress}
            UNION
            SELECT toAddress as address FROM transactions WHERE tokenAddress = ${tokenAddress}
          ) as token_addresses
        `,
      ]);

      return {
        totalTransactions: transactionCount,
        volume24h: this.formatCurrency(this.safeBigInt(volume24h._sum.value)),
        uniqueHolders: Number(uniqueHolders[0]?.count || 0),
      };
    } catch (error) {
      logger.error(`Error getting stats for token ${tokenAddress}:`, error);
      return {
        totalTransactions: 0,
        volume24h: '$0',
        uniqueHolders: 0,
      };
    }
  }

  /**
   * Calculate 24-hour change percentage for total transactions
   */
  private async getTransactionsChange24h(): Promise<number> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [currentTotal, pastTotal] = await Promise.all([
        // Current total transactions
        this.getTotalTransactions(),

        // Total transactions 24 hours ago (transactions before 24h ago)
        prisma.transaction.count({
          where: {
            timestamp: { lt: twentyFourHoursAgo },
          },
        }),
      ]);

      if (pastTotal === 0) {
        return currentTotal > 0 ? 100 : 0; // If no past data, show 100% if we have current data
      }

      const changePercent = ((currentTotal - pastTotal) / pastTotal) * 100;
      return Math.round(changePercent * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      logger.error('Error calculating transactions change 24h:', error);
      return 0;
    }
  }

  /**
   * Calculate 24-hour change percentage for active addresses
   */
  private async getAddressesChange24h(): Promise<number> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [currentActive, pastActive] = await Promise.all([
        // Current active addresses
        this.getActiveAddresses(),

        // Active addresses from 24h ago (updated before 24h ago)
        prisma.addressStatistics.count({
          where: {
            isActive: true,
            updatedAt: { lt: twentyFourHoursAgo },
          },
        }),
      ]);

      if (pastActive === 0) {
        return currentActive > 0 ? 100 : 0; // If no past data, show 100% if we have current data
      }

      const changePercent = ((currentActive - pastActive) / pastActive) * 100;
      return Math.round(changePercent * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      logger.error('Error calculating addresses change 24h:', error);
      return 0;
    }
  }
}
