import { SubgraphClient } from '@msq-tx-monitor/subgraph-client';
import { logger } from '@msq-tx-monitor/msq-common';
import { config } from '../config/index.js';

/**
 * Subgraph Service for chain-scanner
 * Wraps SubgraphClient with chain-scanner-specific functionality
 * Enables historical data retrieval without RPC rate limits
 */
export class SubgraphService {
  private client: SubgraphClient;

  constructor() {
    this.client = new SubgraphClient({
      endpoint: config.subgraph?.endpoint,
      timeout: config.subgraph?.timeout ?? 30000, // 30 second timeout for large queries
    });

    logger.info('✅ SubgraphService initialized');
  }

  /**
   * Get historical transfers within a block range
   * Used for catching up on missed blocks without RPC calls
   * @param fromBlock Start block (inclusive)
   * @param toBlock End block (inclusive)
   * @param limit Maximum number of transfers to return (default: 1000)
   * @returns Array of transfers sorted by block number
   */
  async getHistoricalTransfers(
    fromBlock: number,
    toBlock: number,
    limit = 1000
  ) {
    try {
      logger.info(
        `📊 Querying Subgraph for transfers: blocks ${fromBlock} → ${toBlock}`
      );

      const transfers = await this.client.getTransfers({
        first: limit,
        orderBy: 'blockNumber',
        orderDirection: 'asc',
        where: {
          blockNumber_gte: fromBlock.toString(),
          blockNumber_lte: toBlock.toString(),
        },
      });

      logger.info(
        `✅ Retrieved ${transfers.length} transfers from Subgraph (blocks ${fromBlock}-${toBlock})`
      );

      return transfers;
    } catch (error) {
      logger.error(
        `❌ Error querying Subgraph for historical transfers:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get transfers for a specific token within a block range
   * @param tokenAddress Token contract address
   * @param fromBlock Start block (inclusive)
   * @param toBlock End block (inclusive)
   * @param limit Maximum number of transfers (default: 1000)
   * @returns Array of transfers for the specified token
   */
  async getTransfersByTokenAndBlockRange(
    tokenAddress: string,
    fromBlock: number,
    toBlock: number,
    limit = 1000
  ) {
    try {
      logger.info(
        `📊 Querying Subgraph for ${tokenAddress} transfers: blocks ${fromBlock} → ${toBlock}`
      );

      const transfers = await this.client.getTransfers({
        first: limit,
        orderBy: 'blockNumber',
        orderDirection: 'asc',
        where: {
          token: tokenAddress.toLowerCase(),
          blockNumber_gte: fromBlock.toString(),
          blockNumber_lte: toBlock.toString(),
        },
      });

      logger.info(
        `✅ Retrieved ${transfers.length} transfers for ${tokenAddress} from Subgraph`
      );

      return transfers;
    } catch (error) {
      logger.error(
        `❌ Error querying Subgraph for token ${tokenAddress}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get account statistics from Subgraph
   * NOTE: This requires AccountStats entity to be deployed to Subgraph first
   * @param addresses Array of account addresses to query
   * @returns Array of AccountStats
   */
  async getAccountStats(addresses: string[]) {
    try {
      logger.info(
        `📊 Querying Subgraph for AccountStats: ${addresses.length} addresses`
      );

      // Note: This query will work after AccountStats is deployed to Subgraph
      // For now, we use getClient() to make a custom query
      const client = this.client.getClient();

      // Custom query for AccountStats (will be available after subgraph deployment)
      const query = `
        query GetAccountStats($addresses: [Bytes!]!) {
          accountStats(
            where: { account_in: $addresses }
            first: 1000
          ) {
            id
            account
            totalTransferCount
            totalSentCount
            totalReceivedCount
            totalVolumeTransferred
            firstTransactionTimestamp
            lastTransactionTimestamp
            isActive
            uniqueTokenCount
          }
        }
      `;

      const result = await client.request<{
        accountStats: Array<{
          id: string;
          account: string;
          totalTransferCount: string;
          totalSentCount: string;
          totalReceivedCount: string;
          totalVolumeTransferred: string;
          firstTransactionTimestamp: string;
          lastTransactionTimestamp: string;
          isActive: boolean;
          uniqueTokenCount: string;
        }>;
      }>(query, {
        addresses: addresses.map(addr => addr.toLowerCase()),
      });

      logger.info(
        `✅ Retrieved ${result.accountStats.length} AccountStats from Subgraph`
      );

      return result.accountStats;
    } catch (error) {
      logger.warn(
        `⚠️ AccountStats query failed (may not be deployed yet):`,
        error
      );
      return [];
    }
  }

  /**
   * Get all MSQ ecosystem token addresses
   * @returns Array of token addresses
   */
  async getAllTokenAddresses(): Promise<string[]> {
    try {
      const tokens = await this.client.getTokens(10, 0);
      return tokens.map(token => token.address.toString());
    } catch (error) {
      logger.error(`❌ Error fetching token addresses from Subgraph:`, error);
      throw error;
    }
  }

  /**
   * Check if Subgraph is synced and responsive
   * @returns true if Subgraph is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const tokens = await this.client.getTokens(1, 0);
      return tokens.length > 0;
    } catch (error) {
      logger.error(`❌ Subgraph health check failed:`, error);
      return false;
    }
  }

  /**
   * Get the underlying SubgraphClient for advanced usage
   * @returns SubgraphClient instance
   */
  getClient(): SubgraphClient {
    return this.client;
  }
}
