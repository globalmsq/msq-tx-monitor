/**
 * TX Types Library
 * Shared TypeScript type definitions for MSQ Transaction Monitor
 */

// Transaction Types
export interface Transaction {
  id: string;
  hash: string;
  blockNumber: number;
  transactionIndex: number;
  fromAddress: string;
  toAddress: string;
  value: string;
  tokenAddress: string;
  tokenSymbol: string;
  gasUsed?: number;
  gasPrice?: number;
  timestamp: Date;
  anomalyScore: number;
  isAnomaly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Address Statistics Types
export interface AddressStatistics {
  id: string;
  address: string;
  tokenAddress: string;
  tokenSymbol: string;
  totalSent: string;
  totalReceived: string;
  transactionCountSent: number;
  transactionCountReceived: number;
  firstSeen: Date;
  lastSeen: Date;
  avgTransactionSize: string;
  maxTransactionSize: string;
  riskScore: number;
  isWhale: boolean;
  isSuspicious: boolean;
  updatedAt: Date;
}

// Anomaly Types
export interface Anomaly {
  id: string;
  transactionHash: string;
  anomalyType:
    | 'volume'
    | 'frequency'
    | 'behavioral'
    | 'pattern'
    | 'time_based'
    | 'whale';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  description: string;
  metadata: Record<string, any>;
  detectedAt: Date;
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  falsePositive: boolean;
}

// Token Types
export interface Token {
  id: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'transaction' | 'anomaly' | 'statistics' | 'error';
  data: any;
  timestamp: Date;
}

// Statistics Types
export interface SystemStatistics {
  totalTransactions: number;
  totalAddresses: number;
  totalAnomalies: number;
  avgTransactionSize: string;
  lastBlockProcessed: number;
  updatedAt: Date;
}

// Filter Types
export interface TransactionFilters {
  fromAddress?: string;
  toAddress?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  startDate?: Date;
  endDate?: Date;
  minValue?: string;
  maxValue?: string;
  isAnomaly?: boolean;
  page?: number;
  limit?: number;
}

export interface AnomalyFilters {
  anomalyType?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  reviewed?: boolean;
  falsePositive?: boolean;
  page?: number;
  limit?: number;
}

// Configuration Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface ChainScannerConfig {
  rpcUrl: string;
  backupRpcUrls: string[];
  chainId: number;
  blockConfirmation: number;
  scanIntervalMs: number;
  tokenAddresses: Record<string, string>;
}

// Export all types
export * from './transaction';
export * from './address';
export * from './anomaly';
export * from './token';
export * from './api';
export * from './websocket';
export * from './statistics';
export * from './config';
