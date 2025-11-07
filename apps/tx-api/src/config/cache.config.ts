/**
 * Cache configuration constants for tx-api
 */

/**
 * Cache TTL (Time To Live) values in seconds
 */
export const CacheTTL = {
  /**
   * General transaction queries with filters
   * Short TTL as query results change frequently
   */
  TRANSACTIONS_QUERY: 60, // 1 minute

  /**
   * Recent transactions endpoint
   * Shortest TTL as new transactions arrive constantly
   */
  TRANSACTIONS_RECENT: 30, // 30 seconds

  /**
   * Transactions by specific address
   * Longer TTL as address history is relatively stable
   */
  TRANSACTIONS_BY_ADDRESS: 300, // 5 minutes

  /**
   * Transactions by specific token
   * Longer TTL as token transaction history is stable
   */
  TRANSACTIONS_BY_TOKEN: 300, // 5 minutes
} as const;

/**
 * Cache key prefixes for organized key naming
 */
export const CacheKeyPrefix = {
  /**
   * Prefix for all transaction-related cache keys
   * Format: tx-api:transactions:{endpoint}:{params}
   */
  TRANSACTIONS: 'tx-api:transactions',
} as const;
