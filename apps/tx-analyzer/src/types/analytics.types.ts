// Base types for statistics
export interface StatisticsFilters {
  startDate?: string;
  endDate?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  limit?: number;
  offset?: number;
}

export interface StatisticsResponse<T> {
  data: T;
  filters?: StatisticsFilters | Record<string, any>;
  timestamp: Date;
  cached: boolean;
  ttl?: number;
}

// Real-time statistics
export interface RealtimeStats {
  totalTransactions: number;
  totalVolume: string;
  activeAddresses: number;
  averageTransactionSize: string;
  transactionsLast24h: number;
  volumeLast24h: string;
  activeTokens: number;
  currentBlockNumber: number;
  tokenStats: TokenRealtimeStats[];
  lastUpdated: Date;
}

export interface TokenRealtimeStats {
  tokenSymbol: string;
  tokenAddress: string;
  transactionCount: number;
  volume24h: string;
  totalVolume: string;
  uniqueAddresses24h: number;
  averageTransactionSize: string;
  priceChange24h?: number;
}

// Volume statistics
export interface HourlyVolumeStats {
  hour: string;
  tokenSymbol: string;
  transactionCount: number;
  totalVolume: string;
  uniqueAddresses: number;
  averageVolume: string;
  gasUsed: string;
  anomalyCount: number;
}

export interface DailyVolumeStats {
  hour: string; // Standardized to 'hour' for consistency across all timeseries endpoints
  tokenSymbol: string;
  transactionCount: number;
  totalVolume: string;
  uniqueAddresses: number;
  averageVolume: string;
  gasUsed: string;
  anomalyCount: number;
  highestTransaction: string;
  peakHour: number;
}

export interface WeeklyVolumeStats {
  hour: string; // ISO week number format 'YYYY-WW'
  tokenSymbol: string;
  transactionCount: number;
  totalVolume: string;
  uniqueAddresses: number;
  averageVolume: string;
  gasUsed: string;
  anomalyCount: number;
  highestTransaction: string;
  peakDay: number; // 1-7 (MySQL DAYOFWEEK: 1=Sunday, 7=Saturday)
}

// Token statistics
export interface TokenStats {
  tokenSymbol: string;
  tokenAddress: string;
  totalTransactions: number;
  totalVolume: string;
  uniqueHolders: number;
  averageTransactionSize: string;
  medianTransactionSize: string;
  largestTransaction: string;
  smallestTransaction: string;
  transactionDistribution: TransactionSizeDistribution[];
  volumeTrend: VolumeTrendPoint[];
  topHolders: TopHolder[];
  velocity: TokenVelocity;
}

export interface TransactionSizeDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface VolumeTrendPoint {
  date: string;
  volume: string;
  transactionCount: number;
}

export interface TopHolder {
  address: string;
  balance: string;
  percentage: number;
  transactionCount: number;
  lastActivity: Date;
  isWhale: boolean;
  riskScore: number;
}

export interface TokenVelocity {
  daily: number;
  weekly: number;
  monthly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// Address statistics
export interface TopAddressFilters {
  metric: 'volume' | 'transactions' | 'unique_interactions';
  tokenSymbol?: string;
  limit: number;
  timeframe: '24h' | '7d' | '30d' | '3m' | '6m' | '1y' | 'all';
}

export interface TopAddress {
  address: string;
  totalVolume: string;
  totalSent: string;
  totalReceived: string;
  transactionCount: number;
  uniqueInteractions: number;
  firstSeen: Date;
  lastSeen: Date;
  isWhale: boolean;
  isSuspicious: boolean;
  riskScore: number;
  behavioralFlags: string[];
  tokenBreakdown: AddressTokenBreakdown[];
}

export interface AddressTokenBreakdown {
  tokenSymbol: string;
  volume: string;
  transactionCount: number;
  lastActivity: Date;
}

// Anomaly statistics
export interface AnomalyStats {
  totalAnomalies: number;
  highRiskTransactions: number;
  mediumRiskTransactions: number;
  lowRiskTransactions: number;
  averageAnomalyScore: number;
  suspiciousAddresses: number;
  anomalyTrends: AnomalyTrendPoint[];
  riskDistribution: RiskDistribution[];
  flaggedPatterns: FlaggedPattern[];
}

export interface AnomalyTrendPoint {
  timestamp: string;
  hour: string;
  totalTransactions: number;
  anomalyCount: number;
  averageScore: number;
  averageRiskScore: number; // For backward compatibility
  highRiskCount: number;
  anomalyRate: number;
}

export interface RiskDistribution {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  percentage: number;
  range: string;
}

export interface FlaggedPattern {
  pattern: string;
  description: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  firstDetected: Date;
  lastDetected: Date;
}

// Network statistics
export interface NetworkStats {
  averageBlockTime: number;
  transactionThroughput: number;
  networkCongestion: number;
  averageGasPrice: string;
  gasPriceTrend: GasPriceTrendPoint[];
  blockUtilization: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  networkHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface GasPriceTrendPoint {
  timestamp: string;
  gasPrice: string;
  transactionCount: number;
  blockNumber: number;
}

// Token distribution
export interface TokenDistribution {
  tokenSymbol: string;
  transactionCount: number;
  volume: string;
  percentage: number;
  color: string;
}

// Aggregation job types
export interface AggregationJob {
  type: 'hourly' | 'daily' | 'weekly' | 'monthly';
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  duration?: number;
  error?: string;
}

// Cache key patterns
export const CACHE_KEYS = {
  REALTIME_STATS: 'stats:realtime',
  HOURLY_VOLUME: 'stats:volume:hourly:{startDate}:{endDate}:{token}',
  DAILY_VOLUME: 'stats:volume:daily:{startDate}:{endDate}:{token}',
  TOKEN_STATS: 'stats:token:{symbol}:{timeframe}',
  TOP_ADDRESSES: 'stats:addresses:top:{metric}:{timeframe}:{token}',
  ANOMALY_STATS: 'stats:anomalies:{startDate}:{endDate}:{token}',
  NETWORK_STATS: 'stats:network:{timeframe}',
  TOKEN_DISTRIBUTION: 'stats:distribution:token:{timeframe}',
} as const;

// Cache TTL (in seconds)
export const CACHE_TTL = {
  REALTIME: 60, // 1 minute
  HOURLY: 300, // 5 minutes
  DAILY: 1800, // 30 minutes
  WEEKLY: 3600, // 1 hour
  MONTHLY: 7200, // 2 hours
} as const;
