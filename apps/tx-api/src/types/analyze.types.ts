// Transaction Analytics Types

export interface TransactionSummary {
  totalTransactions: number;
  totalVolume: string;
  averageTransactionSize: string;
  uniqueAddresses: number;
  activeTokens: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface TrendData {
  timestamp: Date;
  transactionCount: number;
  volume: string;
  averageSize: string;
  uniqueAddresses: number;
}

export interface TokenAnalytics {
  tokenAddress: string;
  tokenSymbol: string;
  totalTransactions: number;
  totalVolume: string;
  averageTransactionSize: string;
  uniqueAddresses: number;
  marketShare: number; // percentage
}

export interface VolumeAnalysis {
  totalVolume: string;
  volumeByToken: TokenAnalytics[];
  volumeByTimeFrame: {
    hour: TrendData[];
    day: TrendData[];
    week: TrendData[];
  };
  topAddressesByVolume: Array<{
    address: string;
    volume: string;
    transactionCount: number;
  }>;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  tokenAddress?: string;
  timeFrame?: 'hour' | 'day' | 'week' | 'month';
  limit?: number;
}

export interface AnalyticsResponse<T> {
  data: T;
  filters: AnalyticsFilters;
  timestamp: Date;
  cacheHit?: boolean;
}
