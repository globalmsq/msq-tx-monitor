import { Resolver, Query, Args } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { SubgraphClient } from '@msq-tx-monitor/subgraph-client';
import {
  AddressStatisticsModel,
  TokenStatisticsModel,
} from '../models/statistics.model.js';

/**
 * Statistics GraphQL resolver
 * Integrated with Subgraph for real-time statistics
 */
@Resolver()
export class StatisticsResolver {
  private readonly logger = new Logger(StatisticsResolver.name);
  private readonly subgraphClient: SubgraphClient;

  constructor() {
    this.subgraphClient = new SubgraphClient({
      endpoint: process.env['SUBGRAPH_ENDPOINT'],
      timeout: 15000,
    });
  }

  /**
   * Get transaction statistics for an address
   * TODO: Implement integration with tx-analyzer service
   */
  @Query(() => AddressStatisticsModel, {
    description: 'Get transaction statistics for an address',
    nullable: true,
  })
  async addressStatistics(
    @Args('address') address: string
  ): Promise<AddressStatisticsModel | null> {
    this.logger.log(`GraphQL Query: addressStatistics - Address: ${address}`);

    // TODO: Implement statistics fetching from tx-analyzer service
    // This is a placeholder implementation
    return {
      address,
      transactionsSent: 0,
      transactionsReceived: 0,
      totalVolumeSent: '0',
      totalVolumeReceived: '0',
      firstTransactionAt: new Date().toISOString(),
      lastTransactionAt: new Date().toISOString(),
    };
  }

  /**
   * Get statistics for a specific token
   * Fetches data from Subgraph including 24h statistics
   */
  @Query(() => TokenStatisticsModel, {
    description: 'Get statistics for a specific token',
    nullable: true,
  })
  async tokenStatistics(
    @Args('tokenAddress') tokenAddress: string
  ): Promise<TokenStatisticsModel | null> {
    this.logger.log(`GraphQL Query: tokenStatistics - Token: ${tokenAddress}`);

    try {
      // Get token basic information
      const token = await this.subgraphClient.getToken(tokenAddress);

      if (!token) {
        this.logger.warn(`Token not found: ${tokenAddress}`);
        return null;
      }

      // Calculate 24h time range (in seconds)
      const now = Math.floor(Date.now() / 1000);
      const yesterday = now - 86400; // 24 hours ago

      // Fetch 24h hourly snapshots
      const hourlySnapshots = await this.subgraphClient.getHourlySnapshots(
        tokenAddress,
        yesterday,
        now,
        24 // Get last 24 hours
      );

      // Calculate 24h volume and transactions
      let volume24h = BigInt(0);
      let transactions24h = 0;

      for (const snapshot of hourlySnapshots) {
        volume24h += BigInt(snapshot.volumeTransferred || '0');
        const count =
          typeof snapshot.transferCount === 'string'
            ? parseInt(snapshot.transferCount, 10)
            : snapshot.transferCount || 0;
        transactions24h += count;
      }

      this.logger.log(
        `Token ${token.symbol}: 24h Volume=${volume24h.toString()}, Transactions=${transactions24h}`
      );

      // Ensure holderCount is a number
      const holderCount =
        typeof token.holderCount === 'string'
          ? parseInt(token.holderCount, 10)
          : token.holderCount || 0;

      return {
        tokenAddress,
        totalTransfers: 0, // TODO: Calculate total from daily snapshots
        totalVolume: token.totalSupply || '0',
        uniqueHolders: holderCount,
        volume24h: volume24h.toString(),
        transactions24h,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch token statistics for ${tokenAddress}:`,
        error
      );
      return null;
    }
  }
}
