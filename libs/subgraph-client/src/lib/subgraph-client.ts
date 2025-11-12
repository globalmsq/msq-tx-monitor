import { GraphQLClient } from 'graphql-request';
import {
  getSdk,
  GetTokenQuery,
  GetTokensQuery,
  GetTransfersQuery,
  GetTransfersByTokenQuery,
  GetTransfersByAddressQuery,
  GetTokenAccountQuery,
  GetTokenAccountsByTokenQuery,
  GetTokenAccountsByAddressQuery,
  GetDailySnapshotsQuery,
  GetLatestDailySnapshotQuery,
  GetHourlySnapshotsQuery,
  GetLatestHourlySnapshotQuery,
  GetTokenStatisticsQuery,
  Transfer_OrderBy,
  OrderDirection,
  Transfer_Filter,
} from '../generated/graphql';

/**
 * Configuration options for SubgraphClient
 */
export interface SubgraphClientConfig {
  /**
   * The Graph Subgraph endpoint URL
   * @default 'https://api.studio.thegraph.com/query/1704765/msq-tokens-subgraph/version/latest'
   */
  endpoint?: string;

  /**
   * Request timeout in milliseconds
   * @default 10000
   */
  timeout?: number;

  /**
   * Custom headers for requests
   */
  headers?: Record<string, string>;
}

/**
 * Filter options for transfer queries
 */
export interface TransferFilters {
  token?: string;
  from?: string;
  to?: string;
  blockTimestamp_gte?: string;
  blockTimestamp_lte?: string;
}

/**
 * Client for querying MSQ Tokens Subgraph on The Graph
 *
 * Provides type-safe methods for querying blockchain data including:
 * - Token information and statistics
 * - Transfer history and filtering
 * - Token account balances
 * - Daily and hourly snapshots for analytics
 *
 * @example
 * ```typescript
 * const client = new SubgraphClient();
 *
 * // Get token information
 * const token = await client.getToken('0x...');
 *
 * // Query transfers with filters
 * const transfers = await client.getTransfers({
 *   first: 100,
 *   orderBy: 'blockTimestamp',
 *   orderDirection: 'desc',
 *   where: { from: '0x...' }
 * });
 * ```
 */
export class SubgraphClient {
  private client: GraphQLClient;
  private sdk: ReturnType<typeof getSdk>;

  /**
   * Default Subgraph endpoint URL
   */
  static readonly DEFAULT_ENDPOINT =
    'https://api.studio.thegraph.com/query/1704765/msq-tokens-subgraph/version/latest';

  constructor(config: SubgraphClientConfig = {}) {
    const { endpoint = SubgraphClient.DEFAULT_ENDPOINT, headers = {} } = config;

    this.client = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      // GraphQLClient uses requestConfig.timeout instead of direct timeout property
      requestMiddleware: request => {
        return {
          ...request,
          signal: config.timeout
            ? AbortSignal.timeout(config.timeout)
            : request.signal,
        };
      },
    });

    this.sdk = getSdk(this.client);
  }

  /**
   * Get token information by ID
   * @param id Token ID (token address as Bytes)
   * @returns Token data or null if not found
   */
  async getToken(id: string): Promise<GetTokenQuery['token']> {
    const result = await this.sdk.GetToken({ id });
    return result.token;
  }

  /**
   * Get list of tokens ordered by holder count
   * @param first Number of tokens to return (default: 10)
   * @param skip Number of tokens to skip (default: 0)
   * @returns Array of token data
   */
  async getTokens(first = 10, skip = 0): Promise<GetTokensQuery['tokens']> {
    const result = await this.sdk.GetTokens({ first, skip });
    return result.tokens;
  }

  /**
   * Get transfers with flexible filtering and ordering
   * @param options Query options
   * @returns Array of transfer data
   */
  async getTransfers(
    options: {
      first?: number;
      skip?: number;
      orderBy?: Transfer_OrderBy;
      orderDirection?: OrderDirection;
      where?: Transfer_Filter;
    } = {}
  ): Promise<GetTransfersQuery['transfers']> {
    const result = await this.sdk.GetTransfers(options);
    return result.transfers;
  }

  /**
   * Get transfers for a specific token
   * @param token Token address (as String for filter)
   * @param first Number of transfers to return (default: 100)
   * @param skip Number of transfers to skip (default: 0)
   * @returns Array of transfer data
   */
  async getTransfersByToken(
    token: string,
    first = 100,
    skip = 0
  ): Promise<GetTransfersByTokenQuery['transfers']> {
    const result = await this.sdk.GetTransfersByToken({ token, first, skip });
    return result.transfers;
  }

  /**
   * Get transfers for a specific address (sent or received)
   * @param address Address to query (as Bytes)
   * @param first Number of transfers to return (default: 100)
   * @param skip Number of transfers to skip (default: 0)
   * @returns Array of transfer data
   */
  async getTransfersByAddress(
    address: string,
    first = 100,
    skip = 0
  ): Promise<GetTransfersByAddressQuery['transfers']> {
    const result = await this.sdk.GetTransfersByAddress({
      address,
      first,
      skip,
    });
    return result.transfers;
  }

  /**
   * Get token account information by ID
   * @param id Token account ID (format: tokenAddress-accountAddress)
   * @returns Token account data or null if not found
   */
  async getTokenAccount(
    id: string
  ): Promise<GetTokenAccountQuery['tokenAccount']> {
    const result = await this.sdk.GetTokenAccount({ id });
    return result.tokenAccount;
  }

  /**
   * Get token accounts (holders) for a specific token
   * @param token Token address (as String for filter)
   * @param first Number of accounts to return (default: 100)
   * @param skip Number of accounts to skip (default: 0)
   * @returns Array of token account data
   */
  async getTokenAccountsByToken(
    token: string,
    first = 100,
    skip = 0
  ): Promise<GetTokenAccountsByTokenQuery['tokenAccounts']> {
    const result = await this.sdk.GetTokenAccountsByToken({
      token,
      first,
      skip,
    });
    return result.tokenAccounts;
  }

  /**
   * Get all token accounts for a specific address
   * @param address Address to query (as Bytes)
   * @param first Number of accounts to return (default: 10)
   * @param skip Number of accounts to skip (default: 0)
   * @returns Array of token account data
   */
  async getTokenAccountsByAddress(
    address: string,
    first = 10,
    skip = 0
  ): Promise<GetTokenAccountsByAddressQuery['tokenAccounts']> {
    const result = await this.sdk.GetTokenAccountsByAddress({
      address,
      first,
      skip,
    });
    return result.tokenAccounts;
  }

  /**
   * Get daily snapshots for a token within a date range
   * @param token Token address (as String for filter)
   * @param startDate Start date as Unix timestamp (in seconds)
   * @param endDate End date as Unix timestamp (in seconds)
   * @param first Number of snapshots to return (default: 100)
   * @returns Array of daily snapshot data
   */
  async getDailySnapshots(
    token: string,
    startDate: number,
    endDate: number,
    first = 100
  ): Promise<GetDailySnapshotsQuery['dailySnapshots']> {
    const result = await this.sdk.GetDailySnapshots({
      token,
      date_gte: startDate.toString(),
      date_lte: endDate.toString(),
      first,
    });
    return result.dailySnapshots;
  }

  /**
   * Get the latest daily snapshot for a token
   * @param token Token address (as String for filter)
   * @returns Latest daily snapshot or empty array if not found
   */
  async getLatestDailySnapshot(
    token: string
  ): Promise<GetLatestDailySnapshotQuery['dailySnapshots']> {
    const result = await this.sdk.GetLatestDailySnapshot({ token });
    return result.dailySnapshots;
  }

  /**
   * Get hourly snapshots for a token within a time range
   * @param token Token address (as String for filter)
   * @param startHour Start hour as Unix timestamp (in seconds)
   * @param endHour End hour as Unix timestamp (in seconds)
   * @param first Number of snapshots to return (default: 100)
   * @returns Array of hourly snapshot data
   */
  async getHourlySnapshots(
    token: string,
    startHour: number,
    endHour: number,
    first = 100
  ): Promise<GetHourlySnapshotsQuery['hourlySnapshots']> {
    const result = await this.sdk.GetHourlySnapshots({
      token,
      hour_gte: startHour.toString(),
      hour_lte: endHour.toString(),
      first,
    });
    return result.hourlySnapshots;
  }

  /**
   * Get the latest hourly snapshot for a token
   * @param token Token address (as String for filter)
   * @returns Latest hourly snapshot or empty array if not found
   */
  async getLatestHourlySnapshot(
    token: string
  ): Promise<GetLatestHourlySnapshotQuery['hourlySnapshots']> {
    const result = await this.sdk.GetLatestHourlySnapshot({ token });
    return result.hourlySnapshots;
  }

  /**
   * Get comprehensive token statistics including recent daily snapshots
   * @param tokenId Token ID for token query (as ID/Bytes)
   * @param tokenAddress Token address for snapshots filter (as Bytes)
   * @returns Token data and 30 days of daily snapshots
   */
  async getTokenStatistics(
    tokenId: string,
    tokenAddress: string
  ): Promise<GetTokenStatisticsQuery> {
    const result = await this.sdk.GetTokenStatistics({
      tokenId,
      tokenAddress,
    });
    return result;
  }

  /**
   * Get the underlying GraphQL client for custom queries
   * @returns GraphQLClient instance
   */
  getClient(): GraphQLClient {
    return this.client;
  }

  /**
   * Get the generated SDK for direct access to all operations
   * @returns Generated SDK with all query methods
   */
  getSdk(): ReturnType<typeof getSdk> {
    return this.sdk;
  }
}
