import { Controller, Get, Query, Param, Logger } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { GetTransactionsQueryDto } from './dto/get-transactions-query.dto.js';
import {
  TransactionResponseDto,
  TransactionsResponseDto,
} from './dto/transaction-response.dto.js';

@Controller('transactions')
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * GET /api/v1/transactions
   * Get transactions with filtering and pagination
   */
  @Get()
  async getTransactions(
    @Query() query: GetTransactionsQueryDto
  ): Promise<TransactionsResponseDto> {
    this.logger.log(`GET /transactions - Query: ${JSON.stringify(query)}`);
    return this.transactionsService.getTransactions(query);
  }

  /**
   * GET /api/v1/transactions/recent
   * Get recent transactions
   */
  @Get('recent')
  async getRecentTransactions(
    @Query('limit') limit?: number
  ): Promise<TransactionResponseDto[]> {
    this.logger.log(`GET /transactions/recent - Limit: ${limit || 100}`);
    return this.transactionsService.getRecentTransactions(limit || 100);
  }

  /**
   * GET /api/v1/transactions/address/:address
   * Get transactions by address (sender or receiver)
   */
  @Get('address/:address')
  async getTransactionsByAddress(
    @Param('address') address: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number
  ): Promise<TransactionResponseDto[]> {
    this.logger.log(
      `GET /transactions/address/${address} - Limit: ${limit || 100}, Skip: ${skip || 0}`
    );
    return this.transactionsService.getTransactionsByAddress(
      address,
      limit || 100,
      skip || 0
    );
  }

  /**
   * GET /api/v1/transactions/token/:token
   * Get transactions by token address
   */
  @Get('token/:token')
  async getTransactionsByToken(
    @Param('token') token: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number
  ): Promise<TransactionResponseDto[]> {
    this.logger.log(
      `GET /transactions/token/${token} - Limit: ${limit || 100}, Skip: ${skip || 0}`
    );
    return this.transactionsService.getTransactionsByToken(
      token,
      limit || 100,
      skip || 0
    );
  }
}
