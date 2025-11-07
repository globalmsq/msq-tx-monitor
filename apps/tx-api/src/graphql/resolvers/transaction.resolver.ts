import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { Logger, Inject } from '@nestjs/common';
import { TransactionsService } from '../../transactions/transactions.service';
import { TransactionModel } from '../models/transaction.model';
import { PaginatedTransactions } from '../models/pagination.model';
import { TransactionFilterInput } from '../inputs/transaction-filter.input';
import { PaginationInput } from '../inputs/pagination.input';
import { DATALOADERS, DataLoaders } from '../dataloaders/dataloader.provider';

/**
 * Transaction GraphQL resolver
 * Provides queries for transaction data
 */
@Resolver(() => TransactionModel)
export class TransactionResolver {
  private readonly logger = new Logger(TransactionResolver.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    @Inject(DATALOADERS) private readonly dataloaders: DataLoaders
  ) {}

  /**
   * Get paginated list of transactions with optional filters
   */
  @Query(() => PaginatedTransactions, {
    description: 'Get paginated list of transactions with optional filters',
    complexity: ({ childComplexity, args }) => {
      return childComplexity * (args.pagination?.limit || 100);
    },
  })
  async transactions(
    @Args('filter', { nullable: true }) filter?: TransactionFilterInput,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput
  ): Promise<PaginatedTransactions> {
    this.logger.log(
      `GraphQL Query: transactions - Filter: ${JSON.stringify(filter)}`
    );

    const result = await this.transactionsService.getTransactions({
      limit: pagination?.limit || 100,
      skip: pagination?.skip || 0,
      orderBy: filter?.sortBy as any,
      orderDirection: filter?.sortOrder as any,
      token: filter?.token,
      from: filter?.from,
      to: filter?.to,
      blockTimestamp_gte: filter?.blockTimestampGte,
      blockTimestamp_lte: filter?.blockTimestampLte,
    });

    return {
      items: result.transactions,
      total: result.total,
      limit: result.limit,
      skip: result.skip,
      hasMore: result.skip + result.transactions.length < result.total,
    };
  }

  /**
   * Get recent transactions
   */
  @Query(() => [TransactionModel], {
    description: 'Get recent transactions',
    complexity: ({ childComplexity, args }) => {
      return childComplexity * (args.limit || 100);
    },
  })
  async recentTransactions(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 })
    limit: number
  ): Promise<TransactionModel[]> {
    this.logger.log(`GraphQL Query: recentTransactions - Limit: ${limit}`);
    return this.transactionsService.getRecentTransactions(limit);
  }

  /**
   * Get transactions by address (sender or receiver)
   */
  @Query(() => [TransactionModel], {
    description: 'Get transactions by address (sender or receiver)',
  })
  async transactionsByAddress(
    @Args('address') address: string,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput
  ): Promise<TransactionModel[]> {
    this.logger.log(
      `GraphQL Query: transactionsByAddress - Address: ${address}`
    );
    return this.transactionsService.getTransactionsByAddress(
      address,
      pagination?.limit || 100,
      pagination?.skip || 0
    );
  }

  /**
   * Get transactions by token address
   */
  @Query(() => [TransactionModel], {
    description: 'Get transactions by token address',
  })
  async transactionsByToken(
    @Args('token') token: string,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput
  ): Promise<TransactionModel[]> {
    this.logger.log(`GraphQL Query: transactionsByToken - Token: ${token}`);
    return this.transactionsService.getTransactionsByToken(
      token,
      pagination?.limit || 100,
      pagination?.skip || 0
    );
  }
}
