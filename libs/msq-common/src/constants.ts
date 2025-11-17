/**
 * MSQ Token constants
 */

export const MSQ_TOKENS = {
  MSQ: {
    symbol: 'MSQ',
    name: 'MSQUARE',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000001', // Placeholder
  },
  SUT: {
    symbol: 'SUT',
    name: 'SUPER TRUST',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000002', // Placeholder
  },
  KWT: {
    symbol: 'KWT',
    name: 'Korean Won Token',
    decimals: 6, // KWT uses 6 decimals (like USDC)
    address: '0x0000000000000000000000000000000000000003', // Placeholder
  },
  P2UC: {
    symbol: 'P2UC',
    name: 'Point to You Coin',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000004', // Placeholder
  },
} as const;

// Constants and configuration
export const MSQ_CONSTANTS = {
  CHAIN_ID: 137, // Polygon Mainnet
  BLOCK_CONFIRMATION: 12,
  DEFAULT_SCAN_INTERVAL: 5000,
  WHALE_ALERT_THRESHOLD: '1000000000000000000000000', // 1M tokens
  HIGH_RISK_THRESHOLD: 0.8,
  CRITICAL_RISK_THRESHOLD: 0.95,
} as const;

// Filter constants for UI
export const FILTER_TOKENS = Object.values(MSQ_TOKENS).map(
  token => token.symbol
);
