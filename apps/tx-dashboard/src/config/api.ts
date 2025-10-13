/**
 * API Configuration
 * Central configuration for all API endpoints
 *
 * Environment-aware configuration:
 * - Development (direct): Uses absolute URLs with port numbers
 * - Production (nginx): Uses relative paths through reverse proxy
 *
 * Environment Variables:
 * - VITE_TX_API_URL: Base URL for tx-api service (transactions, addresses)
 * - VITE_TX_ANALYZER_URL: Base URL for tx-analyzer service (analytics, statistics)
 */

// TX API Base URL (Transactions & Addresses)
// Default: '/api/v1' for nginx proxy mode
export const TX_API_BASE_URL = import.meta.env.VITE_TX_API_URL || '/api/v1';

// TX Analyzer Base URL (Analytics & Statistics)
// Default: '/api/v1' for nginx proxy mode
export const TX_ANALYZER_BASE_URL =
  import.meta.env.VITE_TX_ANALYZER_URL || '/api/v1';

// Legacy export for backward compatibility
export const API_BASE_URL = TX_API_BASE_URL;

// API Endpoints
export const API_ENDPOINTS = {
  ADDRESSES: {
    STATS: (address: string) => `${TX_API_BASE_URL}/addresses/stats/${address}`,
    TRENDS: (address: string) =>
      `${TX_API_BASE_URL}/addresses/${address}/trends`,
    RANKINGS: `${TX_API_BASE_URL}/addresses/rankings`,
    WHALES: `${TX_API_BASE_URL}/addresses/whales`,
    ACTIVE_TRADERS: `${TX_API_BASE_URL}/addresses/active-traders`,
    SUSPICIOUS: `${TX_API_BASE_URL}/addresses/suspicious`,
  },
  TRANSACTIONS: {
    BY_ADDRESS: (address: string) =>
      `${TX_API_BASE_URL}/transactions/address/${address}`,
    STREAM: `${TX_API_BASE_URL}/transactions/stream`,
  },
  ANALYTICS: {
    HOURLY_VOLUME: `${TX_ANALYZER_BASE_URL}/analytics/hourly-volume`,
    ANOMALY_TIME: `${TX_ANALYZER_BASE_URL}/analytics/anomaly-time`,
    TOP_ADDRESSES: `${TX_ANALYZER_BASE_URL}/analytics/top-addresses`,
  },
};
