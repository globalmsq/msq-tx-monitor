// MSQ Ecosystem Token Addresses on Polygon Network
export const TOKEN_ADDRESSES = {
  MSQ: '0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499', // MSQ Token
  KWT: '0x435001Af7fC65B621B0043df99810B2f30860c5d', // KWT Token
  SUT: '0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55', // SUT Token
  P2UC: '0x8B3C6ff5911392dECB5B08611822280dEe0E4f64', // P2UC Token
} as const;

// ERC-20 Transfer Event Signature
export const TRANSFER_EVENT_SIGNATURE =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// ERC-20 Transfer Event ABI
export const TRANSFER_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
] as const;

// Minimal ERC-20 ABI for token metadata
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
] as const;

// Monitoring intervals in milliseconds
export const MONITORING_INTERVALS = {
  BLOCK_POLLING: 10000, // 10 seconds - reduced frequency to avoid rate limits
  EVENT_PROCESSING: 1000, // 1 second
  HEALTH_CHECK: 30000, // 30 seconds
  RECONNECT_DELAY: 5000, // 5 seconds
} as const;

// Event types for WebSocket broadcasting
export const EVENT_TYPES = {
  NEW_TRANSACTION: 'new_transaction',
  BLOCK_UPDATE: 'block_update',
  CONNECTION_STATUS: 'connection_status',
  ERROR: 'error',
} as const;

// Connection status types
export const CONNECTION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
} as const;
