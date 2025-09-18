import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transaction.service';
import {
  TransactionFilters,
  PaginationParams,
} from '../types/transaction.types';
import { config } from '../config';

export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  /**
   * @swagger
   * /transactions:
   *   get:
   *     summary: List transactions with filtering and pagination
   *     description: Get a paginated list of blockchain transactions with optional filtering
   *     tags: [Transactions]
   *     parameters:
   *       - $ref: '#/components/parameters/TokenFilter'
   *       - name: from_address
   *         in: query
   *         description: Filter by sender address
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]{40}$'
   *       - name: to_address
   *         in: query
   *         description: Filter by recipient address
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]{40}$'
   *       - name: min_amount
   *         in: query
   *         description: Minimum transaction amount in wei
   *         schema:
   *           type: string
   *       - name: max_amount
   *         in: query
   *         description: Maximum transaction amount in wei
   *         schema:
   *           type: string
   *       - name: start_date
   *         in: query
   *         description: Start date for filtering (ISO string)
   *         schema:
   *           type: string
   *           format: date-time
   *       - name: end_date
   *         in: query
   *         description: End date for filtering (ISO string)
   *         schema:
   *           type: string
   *           format: date-time
   *       - name: anomaly_threshold
   *         in: query
   *         description: Minimum anomaly score (0-1)
   *         schema:
   *           type: number
   *           minimum: 0
   *           maximum: 1
   *       - name: has_anomaly
   *         in: query
   *         description: Filter transactions with/without anomalies
   *         schema:
   *           type: boolean
   *       - name: page
   *         in: query
   *         description: Page number for pagination
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - $ref: '#/components/parameters/LimitParam'
   *     responses:
   *       200:
   *         description: Successfully retrieved transactions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Transaction'
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                     total:
   *                       type: integer
   *                     totalPages:
   *                       type: integer
   *                     hasNext:
   *                       type: boolean
   *                     hasPrev:
   *                       type: boolean
   *                 filters:
   *                   type: object
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         $ref: '#/components/schemas/Error'
   *       429:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  getTransactions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
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
        anomaly_threshold: req.query.anomaly_threshold
          ? parseFloat(req.query.anomaly_threshold as string)
          : undefined,
        has_anomaly: req.query.has_anomaly
          ? req.query.has_anomaly === 'true'
          : undefined,
      };

      // Remove undefined values
      Object.keys(filters).forEach(
        key =>
          filters[key as keyof TransactionFilters] === undefined &&
          delete filters[key as keyof TransactionFilters]
      );

      const result = await this.transactionService.getTransactions(
        filters,
        pagination
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /transactions/{hash}:
   *   get:
   *     summary: Get a specific transaction by hash
   *     description: Retrieve detailed information about a specific transaction using its hash
   *     tags: [Transactions]
   *     parameters:
   *       - name: hash
   *         in: path
   *         required: true
   *         description: Transaction hash (0x prefixed 64-character hex string)
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]{64}$'
   *           example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
   *     responses:
   *       200:
   *         description: Successfully retrieved transaction
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   $ref: '#/components/schemas/Transaction'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Invalid transaction hash format
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: Transaction not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       429:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  getTransactionByHash = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { hash } = req.params;

      if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid transaction hash format',
            details:
              'Transaction hash must be a valid 64-character hex string with 0x prefix',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const transaction =
        await this.transactionService.getTransactionByHash(hash);

      if (!transaction) {
        res.status(404).json({
          error: {
            code: 404,
            message: 'Transaction not found',
            details: `No transaction found with hash: ${hash}`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        data: transaction,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /transactions/address/{address}:
   *   get:
   *     summary: Get transactions for a specific address
   *     description: Retrieve all transactions (sent or received) for a specific Ethereum address with filtering and pagination
   *     tags: [Transactions]
   *     parameters:
   *       - name: address
   *         in: path
   *         required: true
   *         description: Ethereum address (0x prefixed 40-character hex string)
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]{40}$'
   *           example: '0x1234567890abcdef1234567890abcdef12345678'
   *       - $ref: '#/components/parameters/TokenFilter'
   *       - name: min_amount
   *         in: query
   *         description: Minimum transaction amount in wei
   *         schema:
   *           type: string
   *       - name: max_amount
   *         in: query
   *         description: Maximum transaction amount in wei
   *         schema:
   *           type: string
   *       - name: start_date
   *         in: query
   *         description: Start date for filtering (ISO string)
   *         schema:
   *           type: string
   *           format: date-time
   *       - name: end_date
   *         in: query
   *         description: End date for filtering (ISO string)
   *         schema:
   *           type: string
   *           format: date-time
   *       - name: anomaly_threshold
   *         in: query
   *         description: Minimum anomaly score (0-1)
   *         schema:
   *           type: number
   *           minimum: 0
   *           maximum: 1
   *       - name: has_anomaly
   *         in: query
   *         description: Filter transactions with/without anomalies
   *         schema:
   *           type: boolean
   *       - name: page
   *         in: query
   *         description: Page number for pagination
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - $ref: '#/components/parameters/LimitParam'
   *     responses:
   *       200:
   *         description: Successfully retrieved transactions for address
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Transaction'
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                     total:
   *                       type: integer
   *                     totalPages:
   *                       type: integer
   *                     hasNext:
   *                       type: boolean
   *                     hasPrev:
   *                       type: boolean
   *                 filters:
   *                   type: object
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Invalid address format
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       429:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  getTransactionsByAddress = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { address } = req.params;

      // Validate Ethereum address format
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid address format',
            details:
              'Address must be a valid 40-character hex string with 0x prefix',
            timestamp: new Date().toISOString(),
          },
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
        anomaly_threshold: req.query.anomaly_threshold
          ? parseFloat(req.query.anomaly_threshold as string)
          : undefined,
        has_anomaly: req.query.has_anomaly
          ? req.query.has_anomaly === 'true'
          : undefined,
      };

      // Remove undefined values
      Object.keys(filters).forEach(
        key =>
          filters[key as keyof TransactionFilters] === undefined &&
          delete filters[key as keyof TransactionFilters]
      );

      const result = await this.transactionService.getTransactionsByAddress(
        address,
        filters,
        pagination
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /transactions/address/{address}/summary:
   *   get:
   *     summary: Get transaction summary for a specific address
   *     description: Retrieve aggregated transaction statistics and summary data for a specific Ethereum address
   *     tags: [Transactions]
   *     parameters:
   *       - name: address
   *         in: path
   *         required: true
   *         description: Ethereum address (0x prefixed 40-character hex string)
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]{40}$'
   *           example: '0x1234567890abcdef1234567890abcdef12345678'
   *     responses:
   *       200:
   *         description: Successfully retrieved address transaction summary
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   properties:
   *                     address:
   *                       type: string
   *                       description: Ethereum address
   *                     total_transactions:
   *                       type: integer
   *                       description: Total number of transactions
   *                     total_sent:
   *                       type: string
   *                       description: Total amount sent in wei
   *                     total_received:
   *                       type: string
   *                       description: Total amount received in wei
   *                     sent_count:
   *                       type: integer
   *                       description: Number of sent transactions
   *                     received_count:
   *                       type: integer
   *                       description: Number of received transactions
   *                     first_transaction:
   *                       type: string
   *                       format: date-time
   *                       description: Date of first transaction
   *                     last_transaction:
   *                       type: string
   *                       format: date-time
   *                       description: Date of last transaction
   *                     token_breakdown:
   *                       type: object
   *                       description: Transaction breakdown by token
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Invalid address format
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: Address not found or no transactions
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       429:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  getAddressSummary = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { address } = req.params;

      // Validate Ethereum address format
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid address format',
            details:
              'Address must be a valid 40-character hex string with 0x prefix',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const summary =
        await this.transactionService.getAddressTransactionSummary(address);

      if (!summary) {
        res.status(404).json({
          error: {
            code: 404,
            message: 'No transactions found for address',
            details: `No transactions found for address: ${address}`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        data: summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
