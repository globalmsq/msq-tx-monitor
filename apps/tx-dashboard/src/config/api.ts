/**
 * API Configuration
 * Central configuration for all API endpoints
 *
 * Uses relative paths when accessed through Nginx reverse proxy
 * Falls back to direct service URL for development
 */

// API Base URL - Uses Nginx reverse proxy at /api/v1
export const API_BASE_URL = '/api/v1';

// API Endpoints
export const API_ENDPOINTS = {
  ADDRESSES: {
    STATS: (address: string) => `${API_BASE_URL}/addresses/stats/${address}`,
    TRENDS: (address: string) => `${API_BASE_URL}/addresses/${address}/trends`,
    RANKINGS: `${API_BASE_URL}/addresses/rankings`,
    WHALES: `${API_BASE_URL}/addresses/whales`,
    ACTIVE_TRADERS: `${API_BASE_URL}/addresses/active-traders`,
    SUSPICIOUS: `${API_BASE_URL}/addresses/suspicious`,
  },
  TRANSACTIONS: {
    BY_ADDRESS: (address: string) =>
      `${API_BASE_URL}/transactions/address/${address}`,
    STREAM: `${API_BASE_URL}/transactions/stream`,
  },
  ANALYTICS: {
    HOURLY_VOLUME: `${API_BASE_URL}/analytics/hourly-volume`,
    ANOMALY_TIME: `${API_BASE_URL}/analytics/anomaly-time`,
    TOP_ADDRESSES: `${API_BASE_URL}/analytics/top-addresses`,
  },
};
