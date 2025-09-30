import { Transaction as SharedTransaction } from '@msq-tx-monitor/tx-types';

// Database-specific transaction interface (snake_case naming for DB compatibility)
export interface DatabaseTransaction {
  id: number;
  hash: string;
  block_number: number;
  from_address: string;
  to_address: string;
  token_address: string;
  token_symbol: string;
  amount: string;
  amount_raw: string;
  timestamp: Date;
  gas_used?: number;
  gas_price?: string;
  anomaly_score: number;
  anomaly_flags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface TransactionFilters {
  token?: string;
  from_address?: string;
  to_address?: string;
  min_amount?: string;
  max_amount?: string;
  start_date?: string;
  end_date?: string;
  anomaly_threshold?: number;
  has_anomaly?: boolean;
  filter?: 'all' | 'sent' | 'received' | 'success' | 'failed' | 'high-risk';
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface CursorPaginationParams {
  limit: number;
  afterId?: number;
  beforeId?: number;
}

export interface TransactionListResponse {
  data: DatabaseTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: TransactionFilters;
}

export interface CursorTransactionListResponse {
  data: DatabaseTransaction[];
  cursor: {
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextId?: number;
    prevId?: number;
    total?: number;
  };
  filters: TransactionFilters;
}

export interface AddressTransactionSummary {
  address: string;
  total_transactions: number;
  total_sent: string;
  total_received: string;
  first_transaction_date: Date;
  last_transaction_date: Date;
  tokens: {
    [token_symbol: string]: {
      sent: string;
      received: string;
      transaction_count: number;
    };
  };
}

// Adapter functions for converting between shared and database types
export function adaptSharedToDatabase(
  tx: SharedTransaction
): DatabaseTransaction {
  return {
    id: parseInt(tx.id),
    hash: tx.hash,
    block_number: tx.blockNumber,
    from_address: tx.fromAddress,
    to_address: tx.toAddress,
    token_address: tx.tokenAddress,
    token_symbol: tx.tokenSymbol,
    amount: tx.value,
    amount_raw: tx.value,
    timestamp: tx.timestamp,
    gas_used: tx.gasUsed,
    gas_price: tx.gasPrice?.toString(),
    anomaly_score: tx.anomalyScore,
    anomaly_flags: tx.isAnomaly ? ['anomaly'] : [],
    created_at: tx.createdAt,
    updated_at: tx.updatedAt,
  };
}

export function adaptDatabaseToShared(
  dbTx: DatabaseTransaction
): SharedTransaction {
  return {
    id: dbTx.id.toString(),
    hash: dbTx.hash,
    blockNumber: dbTx.block_number,
    transactionIndex: 0, // Not stored in DB
    fromAddress: dbTx.from_address,
    toAddress: dbTx.to_address,
    value: dbTx.amount,
    tokenAddress: dbTx.token_address,
    tokenSymbol: dbTx.token_symbol,
    gasUsed: dbTx.gas_used,
    gasPrice: dbTx.gas_price ? parseInt(dbTx.gas_price) : undefined,
    timestamp: dbTx.timestamp,
    anomalyScore: dbTx.anomaly_score,
    isAnomaly: dbTx.anomaly_flags.length > 0,
    createdAt: dbTx.created_at,
    updatedAt: dbTx.updated_at,
  };
}

// Export alias for backward compatibility
export type Transaction = DatabaseTransaction;
