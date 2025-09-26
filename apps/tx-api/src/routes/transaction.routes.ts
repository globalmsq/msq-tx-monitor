import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';

export const transactionRoutes = Router();
const transactionController = new TransactionController();

/**
 * @route GET /api/v1/transactions
 * @description Get list of transactions with filtering and pagination
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {string} [from_address] - Filter by sender address
 * @query {string} [to_address] - Filter by recipient address
 * @query {string} [min_amount] - Filter by minimum amount
 * @query {string} [max_amount] - Filter by maximum amount
 * @query {string} [start_date] - Filter by start date (ISO string)
 * @query {string} [end_date] - Filter by end date (ISO string)
 * @query {number} [anomaly_threshold] - Filter by minimum anomaly score
 * @query {boolean} [has_anomaly] - Filter transactions with/without anomalies
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=20] - Number of results per page (max 100)
 * @returns {TransactionListResponse} Paginated transaction list
 */
transactionRoutes.get('/', transactionController.getTransactions);

/**
 * @route GET /api/v1/transactions/cursor
 * @description Get list of transactions with cursor-based pagination (optimized for real-time data)
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {string} [from_address] - Filter by sender address
 * @query {string} [to_address] - Filter by recipient address
 * @query {string} [min_amount] - Filter by minimum amount
 * @query {string} [max_amount] - Filter by maximum amount
 * @query {string} [start_date] - Filter by start date (ISO string)
 * @query {string} [end_date] - Filter by end date (ISO string)
 * @query {number} [anomaly_threshold] - Filter by minimum anomaly score
 * @query {boolean} [has_anomaly] - Filter transactions with/without anomalies
 * @query {number} [afterId] - Get transactions after this ID (for pagination)
 * @query {number} [beforeId] - Get transactions before this ID (for pagination)
 * @query {number} [limit=20] - Number of results per page (max 100)
 * @returns {CursorTransactionListResponse} Cursor-paginated transaction list
 */
transactionRoutes.get('/cursor', transactionController.getTransactionsCursor);

/**
 * @route GET /api/v1/transactions/:hash
 * @description Get a specific transaction by hash
 * @param {string} hash - Transaction hash (0x prefixed 64-char hex)
 * @returns {Transaction} Transaction details
 */
transactionRoutes.get('/:hash', transactionController.getTransactionByHash);

/**
 * @route GET /api/v1/transactions/address/:address
 * @description Get transactions for a specific address (sent or received)
 * @param {string} address - Ethereum address (0x prefixed 40-char hex)
 * @query {string} [token] - Filter by token symbol
 * @query {string} [min_amount] - Filter by minimum amount
 * @query {string} [max_amount] - Filter by maximum amount
 * @query {string} [start_date] - Filter by start date (ISO string)
 * @query {string} [end_date] - Filter by end date (ISO string)
 * @query {number} [anomaly_threshold] - Filter by minimum anomaly score
 * @query {boolean} [has_anomaly] - Filter transactions with/without anomalies
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=20] - Number of results per page (max 100)
 * @returns {TransactionListResponse} Paginated transaction list for the address
 */
transactionRoutes.get(
  '/address/:address',
  transactionController.getTransactionsByAddress
);

/**
 * @route GET /api/v1/transactions/address/:address/summary
 * @description Get transaction summary statistics for a specific address
 * @param {string} address - Ethereum address (0x prefixed 40-char hex)
 * @returns {AddressTransactionSummary} Address transaction summary
 */
transactionRoutes.get(
  '/address/:address/summary',
  transactionController.getAddressSummary
);
