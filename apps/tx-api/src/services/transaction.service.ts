import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { Transaction, TransactionFilters, PaginationParams, TransactionListResponse, AddressTransactionSummary } from '../types/transaction.types';
import { RedisConnection } from '../cache/redis';

export class TransactionService {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Get transactions with filtering and pagination
   */
  async getTransactions(
    filters: TransactionFilters = {},
    pagination: PaginationParams
  ): Promise<TransactionListResponse> {
    const cacheKey = `transactions:${JSON.stringify({ filters, pagination })}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for transactions:', error);
    }

    // Build dynamic WHERE clause
    const { whereClause, params } = this.buildWhereClause(filters);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions
      ${whereClause}
    `;

    const [countResult] = await this.db.execute<RowDataPacket[]>(countQuery, params);
    const total = countResult[0].total;

    // Get paginated results
    const dataQuery = `
      SELECT
        id, hash, block_number, from_address, to_address,
        token_address, token_symbol, amount, amount_raw,
        timestamp, gas_used, gas_price, anomaly_score,
        JSON_EXTRACT(anomaly_flags, '$') as anomaly_flags,
        created_at, updated_at
      FROM transactions
      ${whereClause}
      ORDER BY timestamp DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await this.db.execute<RowDataPacket[]>(
      dataQuery,
      [...params, pagination.limit, pagination.offset]
    );

    const transactions = rows.map(row => ({
      ...row,
      anomaly_flags: row.anomaly_flags ? JSON.parse(row.anomaly_flags) : [],
      timestamp: new Date(row.timestamp),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    })) as Transaction[];

    const totalPages = Math.ceil(total / pagination.limit);

    const response: TransactionListResponse = {
      data: transactions,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1
      },
      filters
    };

    // Cache the response for 60 seconds
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(response), 60);
    } catch (error) {
      console.warn('Failed to cache transactions:', error);
    }

    return response;
  }

  /**
   * Get a single transaction by hash
   */
  async getTransactionByHash(hash: string): Promise<Transaction | null> {
    const cacheKey = `transaction:${hash}`;

    // Try cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for transaction:', error);
    }

    const query = `
      SELECT
        id, hash, block_number, from_address, to_address,
        token_address, token_symbol, amount, amount_raw,
        timestamp, gas_used, gas_price, anomaly_score,
        JSON_EXTRACT(anomaly_flags, '$') as anomaly_flags,
        created_at, updated_at
      FROM transactions
      WHERE hash = ?
    `;

    const [rows] = await this.db.execute<RowDataPacket[]>(query, [hash]);

    if (rows.length === 0) {
      return null;
    }

    const transaction = {
      ...rows[0],
      anomaly_flags: rows[0].anomaly_flags ? JSON.parse(rows[0].anomaly_flags) : [],
      timestamp: new Date(rows[0].timestamp),
      created_at: new Date(rows[0].created_at),
      updated_at: new Date(rows[0].updated_at)
    } as Transaction;

    // Cache for 5 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(transaction), 300);
    } catch (error) {
      console.warn('Failed to cache transaction:', error);
    }

    return transaction;
  }

  /**
   * Get transactions for a specific address
   */
  async getTransactionsByAddress(
    address: string,
    filters: TransactionFilters = {},
    pagination: PaginationParams
  ): Promise<TransactionListResponse> {
    const addressFilters = {
      ...filters,
      address_involved: address // This will be handled in buildWhereClause
    };

    return this.getTransactions(addressFilters, pagination);
  }

  /**
   * Get address transaction summary
   */
  async getAddressTransactionSummary(address: string): Promise<AddressTransactionSummary | null> {
    const cacheKey = `address_summary:${address}`;

    // Try cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for address summary:', error);
    }

    const query = `
      SELECT
        ? as address,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN from_address = ? THEN CAST(amount AS DECIMAL(65,0)) ELSE 0 END) as total_sent,
        SUM(CASE WHEN to_address = ? THEN CAST(amount AS DECIMAL(65,0)) ELSE 0 END) as total_received,
        MIN(timestamp) as first_transaction_date,
        MAX(timestamp) as last_transaction_date
      FROM transactions
      WHERE from_address = ? OR to_address = ?
    `;

    const [rows] = await this.db.execute<RowDataPacket[]>(
      query,
      [address, address, address, address, address]
    );

    if (rows.length === 0 || rows[0].total_transactions === 0) {
      return null;
    }

    // Get token breakdown
    const tokenQuery = `
      SELECT
        token_symbol,
        SUM(CASE WHEN from_address = ? THEN CAST(amount AS DECIMAL(65,0)) ELSE 0 END) as sent,
        SUM(CASE WHEN to_address = ? THEN CAST(amount AS DECIMAL(65,0)) ELSE 0 END) as received,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE from_address = ? OR to_address = ?
      GROUP BY token_symbol
    `;

    const [tokenRows] = await this.db.execute<RowDataPacket[]>(
      tokenQuery,
      [address, address, address, address]
    );

    const tokens: { [key: string]: any } = {};
    tokenRows.forEach(row => {
      tokens[row.token_symbol] = {
        sent: row.sent.toString(),
        received: row.received.toString(),
        transaction_count: row.transaction_count
      };
    });

    const summary: AddressTransactionSummary = {
      address,
      total_transactions: rows[0].total_transactions,
      total_sent: rows[0].total_sent.toString(),
      total_received: rows[0].total_received.toString(),
      first_transaction_date: new Date(rows[0].first_transaction_date),
      last_transaction_date: new Date(rows[0].last_transaction_date),
      tokens
    };

    // Cache for 2 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(summary), 120);
    } catch (error) {
      console.warn('Failed to cache address summary:', error);
    }

    return summary;
  }

  /**
   * Build dynamic WHERE clause for filtering
   */
  private buildWhereClause(filters: TransactionFilters): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.token) {
      conditions.push('token_symbol = ?');
      params.push(filters.token);
    }

    if (filters.from_address) {
      conditions.push('from_address = ?');
      params.push(filters.from_address);
    }

    if (filters.to_address) {
      conditions.push('to_address = ?');
      params.push(filters.to_address);
    }

    // Special case for address involved (either from or to)
    if ((filters as any).address_involved) {
      conditions.push('(from_address = ? OR to_address = ?)');
      params.push((filters as any).address_involved, (filters as any).address_involved);
    }

    if (filters.min_amount) {
      conditions.push('CAST(amount AS DECIMAL(65,0)) >= ?');
      params.push(filters.min_amount);
    }

    if (filters.max_amount) {
      conditions.push('CAST(amount AS DECIMAL(65,0)) <= ?');
      params.push(filters.max_amount);
    }

    if (filters.start_date) {
      conditions.push('timestamp >= ?');
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push('timestamp <= ?');
      params.push(filters.end_date);
    }

    if (filters.anomaly_threshold !== undefined) {
      conditions.push('anomaly_score >= ?');
      params.push(filters.anomaly_threshold);
    }

    if (filters.has_anomaly !== undefined) {
      if (filters.has_anomaly) {
        conditions.push('anomaly_score > 0');
      } else {
        conditions.push('anomaly_score = 0');
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { whereClause, params };
  }
}