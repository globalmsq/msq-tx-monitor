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