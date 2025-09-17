import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transaction.service';
import { TransactionFilters, PaginationParams } from '../types/transaction.types';
import { config } from '../config';

export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    // Service will be injected via middleware
    this.transactionService = null as any;
  }

  /**
   * GET /api/v1/transactions
   * List transactions with filtering and pagination
   */
  getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.transactionService = new TransactionService(req.db);

      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(
        parseInt(req.query.limit as string) || config.pagination.defaultLimit,
        config.pagination.maxLimit
      );
      const offset = (page - 1) * limit;

      const pagination: PaginationParams = { page, limit, offset };

      // Parse filters
      const filters: TransactionFilters = {
        token: req.query.token as string,
        from_address: req.query.from_address as string,
        to_address: req.query.to_address as string,
        min_amount: req.query.min_amount as string,
        max_amount: req.query.max_amount as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        anomaly_threshold: req.query.anomaly_threshold ? parseFloat(req.query.anomaly_threshold as string) : undefined,
        has_anomaly: req.query.has_anomaly ? req.query.has_anomaly === 'true' : undefined
      };

      // Remove undefined values
      Object.keys(filters).forEach(key =>
        filters[key as keyof TransactionFilters] === undefined && delete filters[key as keyof TransactionFilters]
      );

      const result = await this.transactionService.getTransactions(filters, pagination);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/transactions/:hash
   * Get a specific transaction by hash
   */
  getTransactionByHash = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.transactionService = new TransactionService(req.db);

      const { hash } = req.params;

      if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid transaction hash format',
            details: 'Transaction hash must be a valid 64-character hex string with 0x prefix',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const transaction = await this.transactionService.getTransactionByHash(hash);

      if (!transaction) {
        res.status(404).json({
          error: {
            code: 404,
            message: 'Transaction not found',
            details: `No transaction found with hash: ${hash}`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        data: transaction,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/transactions/address/:address
   * Get transactions for a specific address
   */
  getTransactionsByAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.transactionService = new TransactionService(req.db);

      const { address } = req.params;

      // Validate Ethereum address format
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid address format',
            details: 'Address must be a valid 40-character hex string with 0x prefix',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(
        parseInt(req.query.limit as string) || config.pagination.defaultLimit,
        config.pagination.maxLimit
      );
      const offset = (page - 1) * limit;

      const pagination: PaginationParams = { page, limit, offset };

      // Parse additional filters
      const filters: TransactionFilters = {
        token: req.query.token as string,
        min_amount: req.query.min_amount as string,
        max_amount: req.query.max_amount as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        anomaly_threshold: req.query.anomaly_threshold ? parseFloat(req.query.anomaly_threshold as string) : undefined,
        has_anomaly: req.query.has_anomaly ? req.query.has_anomaly === 'true' : undefined
      };

      // Remove undefined values
      Object.keys(filters).forEach(key =>
        filters[key as keyof TransactionFilters] === undefined && delete filters[key as keyof TransactionFilters]
      );

      const result = await this.transactionService.getTransactionsByAddress(address, filters, pagination);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/transactions/address/:address/summary
   * Get transaction summary for a specific address
   */
  getAddressSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.transactionService = new TransactionService(req.db);

      const { address } = req.params;

      // Validate Ethereum address format
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid address format',
            details: 'Address must be a valid 40-character hex string with 0x prefix',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const summary = await this.transactionService.getAddressTransactionSummary(address);

      if (!summary) {
        res.status(404).json({
          error: {
            code: 404,
            message: 'No transactions found for address',
            details: `No transactions found for address: ${address}`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        data: summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };
}