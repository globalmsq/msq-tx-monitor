import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import {
  SubgraphClient,
  OrderDirection as SubgraphOrderDirection,
  Transfer_OrderBy,
  GetTransfersQuery,
} from '@msq-tx-monitor/subgraph-client';
import {
  GetTransactionsQueryDto,
  OrderDirection,
} from './dto/get-transactions-query.dto';
import {
  TransactionResponseDto,
  TransactionsResponseDto,
} from './dto/transaction-response.dto';
import { CacheTTL, CacheKeyPrefix } from '../config/cache.config';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly subgraphClient: SubgraphClient,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  /**
   * Get transactions with filtering and pagination
   */
  async getTransactions(
    query: GetTransactionsQueryDto
  ): Promise<TransactionsResponseDto> {
    const cacheKey = this.generateCacheKey('query', query);

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_QUERY, async () => {
      this.logger.log(
        `Fetching transactions with query: ${JSON.stringify(query)}`
      );

      try {
        const where: any = {};

        // Build filter object
        if (query.token) {
          where.token = query.token;
        }
        if (query.from) {
          where.from = query.from;
        }
        if (query.to) {
          where.to = query.to;
        }
        if (query.blockTimestamp_gte) {
          where.blockTimestamp_gte = query.blockTimestamp_gte;
        }
        if (query.blockTimestamp_lte) {
          where.blockTimestamp_lte = query.blockTimestamp_lte;
        }

        // Fetch from Subgraph
        const transfers = await this.subgraphClient.getTransfers({
          first: query.limit,
          skip: query.skip,
          orderBy: this.mapOrderBy(query.orderBy),
          orderDirection: this.mapOrderDirection(query.orderDirection),
          where: Object.keys(where).length > 0 ? where : undefined,
        });

        // Transform to response format
        const transactions = transfers.map(this.transformTransfer);

        return {
          transactions,
          total: transfers.length,
          limit: query.limit || 100,
          skip: query.skip || 0,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error fetching transactions: ${errorMessage}`);
        throw error;
      }
    });
  }

  /**
   * Get transactions by address (sender or receiver)
   */
  async getTransactionsByAddress(
    address: string,
    limit = 100,
    skip = 0
  ): Promise<TransactionResponseDto[]> {
    const cacheKey = `${CacheKeyPrefix.TRANSACTIONS}:address:${address}:${limit}:${skip}`;

    return this.withCache(
      cacheKey,
      CacheTTL.TRANSACTIONS_BY_ADDRESS,
      async () => {
        this.logger.log(`Fetching transactions for address: ${address}`);

        try {
          const transfers = await this.subgraphClient.getTransfersByAddress(
            address,
            limit,
            skip
          );

          return transfers.map(transfer => this.transformTransfer(transfer));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Error fetching transactions for address ${address}: ${errorMessage}`
          );
          throw error;
        }
      }
    );
  }

  /**
   * Get transactions by token
   */
  async getTransactionsByToken(
    token: string,
    limit = 100,
    skip = 0
  ): Promise<TransactionResponseDto[]> {
    const cacheKey = `${CacheKeyPrefix.TRANSACTIONS}:token:${token}:${limit}:${skip}`;

    return this.withCache(
      cacheKey,
      CacheTTL.TRANSACTIONS_BY_TOKEN,
      async () => {
        this.logger.log(`Fetching transactions for token: ${token}`);

        try {
          const transfers = await this.subgraphClient.getTransfersByToken(
            token,
            limit,
            skip
          );

          return transfers.map(transfer => this.transformTransfer(transfer));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Error fetching transactions for token ${token}: ${errorMessage}`
          );
          throw error;
        }
      }
    );
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(limit = 100): Promise<TransactionResponseDto[]> {
    const cacheKey = `${CacheKeyPrefix.TRANSACTIONS}:recent:${limit}`;

    return this.withCache(cacheKey, CacheTTL.TRANSACTIONS_RECENT, async () => {
      this.logger.log(`Fetching recent ${limit} transactions`);

      try {
        const transfers = await this.subgraphClient.getTransfers({
          first: limit,
          orderBy: 'blockTimestamp' as Transfer_OrderBy,
          orderDirection: 'desc' as SubgraphOrderDirection,
        });

        return transfers.map(transfer => this.transformTransfer(transfer));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Error fetching recent transactions: ${errorMessage}`
        );
        throw error;
      }
    });
  }

  /**
   * Transform Subgraph Transfer to Transaction Response DTO
   */
  private transformTransfer(
    transfer: GetTransfersQuery['transfers'][number]
  ): TransactionResponseDto {
    return {
      id: transfer.id,
      token: {
        id: transfer.token.id,
        symbol: transfer.token.symbol,
        name: transfer.token.name,
        decimals: transfer.token.decimals.toString(),
      },
      from: transfer.from,
      to: transfer.to,
      amount: transfer.amount,
      isMint: transfer.isMint,
      isBurn: transfer.isBurn,
      blockNumber: transfer.blockNumber,
      blockTimestamp: transfer.blockTimestamp,
      transactionHash: transfer.transactionHash,
      logIndex: transfer.logIndex,
    };
  }

  /**
   * Map DTO order by to Subgraph order by
   */
  private mapOrderBy(orderBy?: string): Transfer_OrderBy | undefined {
    if (!orderBy) return undefined;
    return orderBy as Transfer_OrderBy;
  }

  /**
   * Map DTO order direction to Subgraph order direction
   */
  private mapOrderDirection(
    direction?: OrderDirection
  ): SubgraphOrderDirection | undefined {
    if (!direction) return undefined;
    return direction as SubgraphOrderDirection;
  }

  /**
   * Generate cache key from prefix and parameters
   * Uses MD5 hash of serialized parameters for consistent key generation
   */
  private generateCacheKey(prefix: string, params: any): string {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex');
    return `${CacheKeyPrefix.TRANSACTIONS}:${prefix}:${hash}`;
  }

  /**
   * Generic cache wrapper with automatic cache miss handling
   * @param key - Cache key
   * @param ttl - Time to live in seconds
   * @param fn - Function to execute on cache miss
   * @returns Cached or freshly fetched data
   */
  private async withCache<T>(
    key: string,
    ttl: number,
    fn: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.cacheManager.get<T>(key);
    if (cached) {
      this.logger.debug(`Cache hit: ${key}`);
      return cached;
    }

    // Cache miss - fetch data
    this.logger.debug(`Cache miss: ${key}`);
    const result = await fn();

    // Store in cache with TTL (convert to milliseconds)
    await this.cacheManager.set(key, result, ttl * 1000);

    return result;
  }
}
