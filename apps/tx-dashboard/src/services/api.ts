/**
 * REST API service for transaction data
 * Handles initial data loading and pagination
 */

export interface ApiConfig {
  baseURL: string;
  timeout: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface CursorPaginationParams {
  limit: number;
  afterId?: number;
  beforeId?: number;
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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  cursor: {
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextId?: number;
    prevId?: number;
    total?: number;
  };
}

export interface ApiTransaction {
  id: number;
  hash: string;
  block_number: number;
  timestamp: string;
  from_address: string;
  to_address: string;
  token_address: string;
  token_symbol: string;
  amount: string;
  amount_raw: string;
  gas_used?: number;
  gas_price?: string;
  anomaly_score: number;
  anomaly_flags: string[];
  created_at: string;
  updated_at: string;
}

class ApiService {
  private config: ApiConfig;

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      baseURL:
        config.baseURL ||
        import.meta.env.VITE_API_ENDPOINT ||
        'http://localhost:8000/api/v1',
      timeout: config.timeout || 10000,
    };
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }

      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Build query string from filters and pagination
   */
  private buildQueryString(
    filters: TransactionFilters = {},
    pagination: PaginationParams = { page: 1, limit: 50 }
  ): string {
    const params = new URLSearchParams();

    // Add pagination
    params.append('page', pagination.page.toString());
    params.append('limit', pagination.limit.toString());

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return params.toString();
  }

  /**
   * Build query string from filters and cursor pagination
   */
  private buildCursorQueryString(
    filters: TransactionFilters = {},
    pagination: CursorPaginationParams = { limit: 50 }
  ): string {
    const params = new URLSearchParams();

    // Add cursor pagination
    params.append('limit', pagination.limit.toString());
    if (pagination.afterId !== undefined) {
      params.append('afterId', pagination.afterId.toString());
    }
    if (pagination.beforeId !== undefined) {
      params.append('beforeId', pagination.beforeId.toString());
    }

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return params.toString();
  }

  /**
   * Get paginated transaction list
   */
  async getTransactions(
    filters: TransactionFilters = {},
    pagination: PaginationParams = { page: 1, limit: 50 }
  ): Promise<PaginatedResponse<ApiTransaction>> {
    const queryString = this.buildQueryString(filters, pagination);
    const endpoint = `/transactions?${queryString}`;

    return this.request<PaginatedResponse<ApiTransaction>>(endpoint);
  }

  /**
   * Get cursor-paginated transaction list
   */
  async getTransactionsCursor(
    filters: TransactionFilters = {},
    pagination: CursorPaginationParams = { limit: 50 }
  ): Promise<CursorPaginatedResponse<ApiTransaction>> {
    const queryString = this.buildCursorQueryString(filters, pagination);
    const endpoint = `/transactions/cursor?${queryString}`;

    return this.request<CursorPaginatedResponse<ApiTransaction>>(endpoint);
  }

  /**
   * Get transaction by hash
   */
  async getTransactionByHash(hash: string): Promise<ApiTransaction> {
    const endpoint = `/transactions/${hash}`;
    return this.request<ApiTransaction>(endpoint);
  }

  /**
   * Get transactions for a specific address
   */
  async getTransactionsByAddress(
    address: string,
    filters: TransactionFilters = {},
    pagination: PaginationParams = { page: 1, limit: 50 }
  ): Promise<PaginatedResponse<ApiTransaction>> {
    const queryString = this.buildQueryString(filters, pagination);
    const endpoint = `/transactions/address/${address}?${queryString}`;

    return this.request<PaginatedResponse<ApiTransaction>>(endpoint);
  }

  /**
   * Get address transaction summary
   */
  async getAddressSummary(address: string): Promise<{
    totalTransactions: number;
    totalSent: string;
    totalReceived: string;
    avgTransactionSize: string;
    riskScore: number;
    firstTransactionDate: string;
    lastTransactionDate: string;
  }> {
    const endpoint = `/transactions/address/${address}/summary`;
    return this.request(endpoint);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const endpoint = '/health';
    return this.request(endpoint);
  }
}

// Singleton instance
export const apiService = new ApiService();

// Export utilities
export { ApiService };
