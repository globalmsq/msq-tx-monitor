import { Injectable, Logger } from '@nestjs/common';
import {
  SubgraphClient,
  OrderDirection as SubgraphOrderDirection,
  Transfer_OrderBy,
  GetTransfersQuery,
} from '@msq-tx-monitor/subgraph-client';
import { GetTransactionsQueryDto, OrderDirection } from './dto/get-transactions-query.dto';
import {
  TransactionResponseDto,
  TransactionsResponseDto,
} from './dto/transaction-response.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly subgraphClient: SubgraphClient) {}

  /**
   * Get transactions with filtering and pagination
   */
  async getTransactions(
    query: GetTransactionsQueryDto
  ): Promise<TransactionsResponseDto> {
    this.logger.log(`Fetching transactions with query: ${JSON.stringify(query)}`);

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching transactions: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get transactions by address (sender or receiver)
   */
  async getTransactionsByAddress(
    address: string,
    limit = 100,
    skip = 0
  ): Promise<TransactionResponseDto[]> {
    this.logger.log(`Fetching transactions for address: ${address}`);

    try {
      const transfers = await this.subgraphClient.getTransfersByAddress(
        address,
        limit,
        skip
      );

      return transfers.map((transfer) => this.transformTransfer(transfer));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error fetching transactions for address ${address}: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Get transactions by token
   */
  async getTransactionsByToken(
    token: string,
    limit = 100,
    skip = 0
  ): Promise<TransactionResponseDto[]> {
    this.logger.log(`Fetching transactions for token: ${token}`);

    try {
      const transfers = await this.subgraphClient.getTransfersByToken(
        token,
        limit,
        skip
      );

      return transfers.map((transfer) => this.transformTransfer(transfer));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error fetching transactions for token ${token}: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(limit = 100): Promise<TransactionResponseDto[]> {
    this.logger.log(`Fetching recent ${limit} transactions`);

    try {
      const transfers = await this.subgraphClient.getTransfers({
        first: limit,
        orderBy: 'blockTimestamp' as Transfer_OrderBy,
        orderDirection: 'desc' as SubgraphOrderDirection,
      });

      return transfers.map((transfer) => this.transformTransfer(transfer));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching recent transactions: ${errorMessage}`);
      throw error;
    }
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
}
