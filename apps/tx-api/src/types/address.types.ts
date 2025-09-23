export interface AddressRanking {
  address: string;
  total_volume: string;
  transaction_count: number;
  first_seen: Date;
  last_seen: Date;
  rank: number;
}

export interface AddressSearch {
  address: string;
  transaction_count: number;
  total_volume: string;
  last_activity: Date;
  label?: string;
}

export interface AddressRankingFilters {
  token?: string;
  time_period?: 'day' | 'week' | 'month' | 'all';
  min_volume?: string;
  min_transactions?: number;
}

export interface TopAddressesResponse {
  data: AddressRanking[];
  filters: AddressRankingFilters;
  period: {
    start_date: Date;
    end_date: Date;
  };
  timestamp: Date;
}

// Enhanced address statistics and behavioral analysis interfaces
export interface BehavioralCategory {
  whale: boolean; // Top 1% by volume
  activeTrader: boolean; // High frequency trader
  dormantAccount: boolean; // Inactive for 30+ days
  suspiciousPattern: boolean; // Anomalous behavior detected
  highRisk: boolean; // High risk score
}

export interface AddressScores {
  volume: number; // Volume percentile score
  frequency: number; // Transaction frequency score
  recency: number; // Recent activity score
  diversity: number; // Trading diversity score
  composite: number; // Weighted composite score
}

export interface AddressProfile {
  address: string;
  tokenAddress?: string;
  rank: number;
  percentile: number;
  category: BehavioralCategory;
  scores: AddressScores;
  label?: string;
  metadata: {
    totalVolume: string;
    transactionCount: number;
    lastActivity: Date;
    daysSinceFirstSeen: number;
  };
}

export interface AddressStatisticsDetail {
  address: string;
  tokenAddress: string;
  totalSent: string;
  totalReceived: string;
  transactionCountSent: number;
  transactionCountReceived: number;
  firstSeen: Date | null;
  lastSeen: Date | null;
  avgTransactionSize: string;
  avgTransactionSizeSent: string;
  avgTransactionSizeReceived: string;
  maxTransactionSize: string;
  maxTransactionSizeSent: string;
  maxTransactionSizeReceived: string;
  riskScore: string;
  isWhale: boolean;
  isSuspicious: boolean;
  isActive: boolean;
  behavioralFlags: Record<string, unknown> | null;
  lastActivityType: string | null;
  addressLabel: string | null;
  dormancyPeriod: number;
  velocityScore: string;
  diversityScore: string;
}

export interface RankingStatistics {
  totalAddresses: number;
  whaleCount: number;
  activeTraderCount: number;
  dormantCount: number;
  suspiciousCount: number;
  averageVolume: number;
  medianVolume: number;
  volumePercentiles: {
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface AddressListResponse<T> {
  data: T[];
  statistics?: RankingStatistics;
  filters: {
    tokenAddress?: string;
    limit: number;
    minRiskScore?: number;
    minTransactions?: number;
  };
  timestamp: Date;
}
