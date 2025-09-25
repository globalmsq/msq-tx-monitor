// eslint-disable-next-line @nx/enforce-module-boundaries
import { prisma } from '@msq-tx-monitor/database';
import { config } from '../config';
import Web3 from 'web3';

export interface TokenStats {
  tokenSymbol: string;
  tokenAddress: string;
  volume24h: string;
  avgTxSize: string;
  totalVolume: string;
  transactionCount: number;
}

export interface DashboardStats {
  totalTransactions: number;
  activeAddresses: number;
  tokenStats: TokenStats[];
  successRate: number;
}

export class StatisticsService {
  private initialized = false;
  private tokenService: any; // TokenService

  constructor(tokenService?: any) {
    this.tokenService = tokenService;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Test database connection
      await prisma.$connect();
      this.initialized = true;
      console.log('✅ StatisticsService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize StatisticsService:', error);
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

    try {
      // Execute parallel queries for general stats and token stats
      const [totalTransactionsResult, activeAddressesResult, tokenStatsResult] =
        await Promise.all([
          this.getTotalTransactions(),
          this.getActiveAddresses(),
          this.getTokenSpecificStats(),
        ]);

      const stats: DashboardStats = {
        totalTransactions: totalTransactionsResult,
        activeAddresses: activeAddressesResult,
        tokenStats: tokenStatsResult,
        successRate: 100, // All stored transactions are successful by definition
      };

      if (config.logging.enableDatabaseLogs) {
        console.log('📊 Dashboard stats calculated:', {
          totalTransactions: stats.totalTransactions,
          activeAddresses: stats.activeAddresses,
          tokenCount: stats.tokenStats.length,
        });
      }

      return stats;
    } catch (error) {
      console.error('❌ Error calculating dashboard stats:', error);
      // Return default stats in case of error
      return {
        totalTransactions: 0,
        activeAddresses: 0,
        tokenStats: [],
        successRate: 0,
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
      console.error('Error getting total transactions:', error);
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
      console.error('Error getting active addresses:', error);
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

      return BigInt(result._sum.value?.toString() || '0');
    } catch (error) {
      console.error('Error getting 24h volume:', error);
      return BigInt(0);
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
      return avgValue
        ? BigInt(Math.floor(Number(avgValue.toString())))
        : BigInt(0);
    } catch (error) {
      console.error('Error getting average transaction size:', error);
      return BigInt(0);
    }
  }

  /**
   * Get token-specific statistics for all active tokens
   */
  private async getTokenSpecificStats(): Promise<TokenStats[]> {
    try {
      // Get distinct token addresses from transactions
      const tokenAddresses = await prisma.transaction.findMany({
        select: {
          tokenAddress: true,
          tokenSymbol: true,
        },
        distinct: ['tokenAddress'],
      });

      const tokenStatsPromises = tokenAddresses.map(async token => {
        const stats = await this.getTokenStats(token.tokenAddress);
        return {
          tokenSymbol: token.tokenSymbol,
          tokenAddress: token.tokenAddress,
          volume24h: stats.volume24h,
          avgTxSize: this.formatTokenAmount(
            await this.getTokenAvgTxSize(token.tokenAddress),
            token.tokenAddress
          ),
          totalVolume: this.formatTokenAmount(
            await this.getTokenTotalVolume(token.tokenAddress),
            token.tokenAddress
          ),
          transactionCount: stats.totalTransactions,
        };
      });

      return await Promise.all(tokenStatsPromises);
    } catch (error) {
      console.error('Error getting token-specific stats:', error);
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
      return avgValue
        ? BigInt(Math.floor(Number(avgValue.toString())))
        : BigInt(0);
    } catch (error) {
      console.error(
        `Error getting average tx size for ${tokenAddress}:`,
        error
      );
      return BigInt(0);
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

      return BigInt(result._sum.value?.toString() || '0');
    } catch (error) {
      console.error(`Error getting total volume for ${tokenAddress}:`, error);
      return BigInt(0);
    }
  }

  /**
   * Format token amount based on token's decimals
   */
  private formatTokenAmount(amount: bigint, tokenAddress: string): string {
    try {
      let decimals = 18; // Default decimals
      let symbol = 'TOKEN';

      // Get token info if tokenService is available
      if (this.tokenService) {
        const tokenInfo = this.tokenService.getTokenInfo(tokenAddress);
        if (tokenInfo) {
          decimals = tokenInfo.decimals;
          symbol = tokenInfo.symbol;
        }
      }

      // Convert amount using token's decimals
      const divisor = BigInt(10 ** decimals);
      const tokenAmount = Number(amount) / Number(divisor);

      // Format the number
      if (tokenAmount === 0) {
        return `0 ${symbol}`;
      } else if (tokenAmount >= 1000000) {
        return `${(tokenAmount / 1000000).toFixed(1)}M ${symbol}`;
      } else if (tokenAmount >= 1000) {
        return `${(tokenAmount / 1000).toFixed(1)}K ${symbol}`;
      } else if (tokenAmount < 0.01) {
        return `<0.01 ${symbol}`;
      } else {
        return `${tokenAmount.toFixed(2)} ${symbol}`;
      }
    } catch (error) {
      console.error('Error formatting token amount:', error);
      return '0 TOKEN';
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
      console.error('Error formatting currency:', error);
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
      console.error('StatisticsService health check failed:', error);
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
            SELECT fromAddress as address FROM Transaction WHERE tokenAddress = ${tokenAddress}
            UNION
            SELECT toAddress as address FROM Transaction WHERE tokenAddress = ${tokenAddress}
          ) as token_addresses
        `,
      ]);

      return {
        totalTransactions: transactionCount,
        volume24h: this.formatCurrency(
          BigInt(volume24h._sum.value?.toString() || '0')
        ),
        uniqueHolders: Number(uniqueHolders[0]?.count || 0),
      };
    } catch (error) {
      console.error(`Error getting stats for token ${tokenAddress}:`, error);
      return {
        totalTransactions: 0,
        volume24h: '$0',
        uniqueHolders: 0,
      };
    }
  }
}
