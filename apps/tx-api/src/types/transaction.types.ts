export interface Transaction {
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
  data: Transaction[];
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
  data: Transaction[];
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
