// Statistics Types for tx-analyzer compatibility

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

// Volume statistics
export interface VolumeStats {
  hour: string;
  tokenSymbol: string;
  transactionCount: number;
  totalVolume: string;
  uniqueAddresses?: number;
  averageVolume: string;
  gasUsed?: string;
  anomalyCount?: number;
}

// Token statistics
export interface TokenStatistics {
  tokenSymbol: string;
  totalTransactions: number;
  totalVolume: string;
  averageTransactionSize: string;
  uniqueAddresses: number;
}

// Anomaly statistics
export interface AnomalyStatistics {
  timestamp: string;
  hour: string;
  totalTransactions: number;
  anomalyCount: number;
  averageScore: number;
  highRiskCount: number;
  anomalyRate: number;
}
