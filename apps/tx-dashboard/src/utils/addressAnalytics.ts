import { DetailedData } from '../components/DetailedAnalysisModal';
import { logger } from '@msq-tx-monitor/msq-common';
import { API_BASE_URL } from '../config/api';

export type TimeRange = '1h' | '24h' | '7d' | '30d' | '3m' | '6m' | '1y' | 'all';

interface StatsResponse {
  data?: {
    address: string;
    total_transactions: number;
    total_sent: string;
    total_received: string;
    total_volume: string;
    token_breakdown?: Record<
      string,
      {
        sent: string;
        received: string;
        volume: string;
        transaction_count: number;
      }
    >;
    anomaly_statistics?: {
      avg_anomaly_score: number;
    };
    total_sent_transactions?: number;
    total_received_transactions?: number;
  };
}

interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  timestamp: string;
  gasUsed: string;
  gasPrice: string;
  status: 'success' | 'failed';
  riskScore?: number;
}

interface TransactionApiResponse {
  data?: any[];
  pagination?: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

export const getHoursFromTimeRange = (range: TimeRange): number => {
  switch (range) {
    case '1h':
      return 1;
    case '24h':
      return 24;
    case '7d':
      return 168; // 7 * 24
    case '30d':
      return 720; // 30 * 24
    case '3m':
      return 2160; // 90 * 24
    case '6m':
      return 4320; // 180 * 24
    case '1y':
      return 8760; // 365 * 24
    case 'all':
      return 43800; // 365 * 24 * 5 (~5 years)
    default:
      return 24;
  }
};

export const getIntervalFromTimeRange = (
  range: TimeRange
): 'minutes' | 'hourly' | 'daily' | 'weekly' => {
  switch (range) {
    case '1h':
      return 'minutes'; // 60 data points (1-minute intervals)
    case '24h':
    case '7d':
      return 'hourly'; // 24-168 data points
    case '30d':
    case '3m':
      return 'daily'; // 30-90 data points
    case '6m':
    case '1y':
      return 'weekly'; // ~26-52 data points
    case 'all':
      return 'daily'; // Backend will auto-switch to monthly
    default:
      return 'hourly';
  }
};

export const fetchAddressDetails = async (
  address: string,
  token: string,
  timeRangeParam: TimeRange = '24h',
  page: number = 1
): Promise<DetailedData> => {
  const now = Date.now();
  const hours = getHoursFromTimeRange(timeRangeParam);

  let statsData: StatsResponse | null = null;
  let transactionsData: TransactionApiResponse | null = null;
  let trendsData: any[] = [];

  try {
    // Try to fetch stats data with time range and token filter
    const statsResponse = await fetch(
      `${API_BASE_URL}/addresses/stats/${address}?hours=${hours}&token=${token}`
    );
    if (statsResponse.ok) {
      statsData = await statsResponse.json();
    }
  } catch (error) {
    logger.warn(
      'Failed to fetch address stats, will use transaction data instead:',
      error
    );
  }

  try {
    // Fetch trends data with dynamic interval based on time range
    const interval = getIntervalFromTimeRange(timeRangeParam);
    const trendsResponse = await fetch(
      `${API_BASE_URL}/addresses/${address}/trends?token=${token}&hours=${hours}&interval=${interval}`
    );
    if (trendsResponse.ok) {
      const trends = await trendsResponse.json();
      trendsData = trends?.data?.trends || [];
    }
  } catch (error) {
    logger.warn('Failed to fetch trends data:', error);
  }

  try {
    // Fetch transactions with pagination
    const transactionsResponse = await fetch(
      `${API_BASE_URL}/transactions/address/${address}?hours=${hours}&page=${page}&limit=10&token=${token}`
    );
    if (!transactionsResponse.ok) {
      throw new Error('Failed to fetch transactions');
    }
    transactionsData = await transactionsResponse.json();
  } catch (error) {
    logger.error('Failed to fetch transactions:', error);
    throw error;
  }

  // Transform transaction data - handle API field names properly
  const transactions: TransactionData[] =
    transactionsData?.data?.map((tx: Record<string, unknown>) => ({
      hash: String(tx.hash || tx.transaction_hash || ''),
      timestamp: String(tx.timestamp || tx.blockTimestamp || ''),
      from: String(tx.from_address || tx.from || tx.fromAddress || ''),
      to: String(tx.to_address || tx.to || tx.toAddress || ''),
      value: String(tx.amount || tx.value || '0'),
      tokenSymbol: String(tx.token_symbol || tx.tokenSymbol || token),
      gasUsed: String(tx.gas_used || tx.gasUsed || '0'),
      gasPrice: String(tx.gas_price || tx.gasPrice || '0'),
      status: (tx.status === 1 || tx.status === 'success'
        ? 'success'
        : 'failed') as 'success' | 'failed',
      riskScore: Number(
        tx.anomaly_score || tx.riskScore || tx.anomalyScore || 0
      ),
    })) || [];

  // Calculate statistics from transactions if stats API failed
  let summary;
  if (statsData?.data) {
    // Use stats API data if available
    // Check if we have token-specific data in token_breakdown
    const tokenData = statsData.data.token_breakdown?.[token];
    if (tokenData) {
      // Use token-specific data
      summary = {
        totalVolume: tokenData.volume || '0',
        transactionCount: tokenData.transaction_count || 0,
        uniqueAddresses:
          (statsData.data.total_sent_transactions || 0) +
          (statsData.data.total_received_transactions || 0),
        riskScore: statsData.data.anomaly_statistics?.avg_anomaly_score || 0,
        totalSent: tokenData.sent || '0',
        totalReceived: tokenData.received || '0',
        sentTransactions: statsData.data.total_sent_transactions || 0,
        receivedTransactions: statsData.data.total_received_transactions || 0,
      };
    } else {
      // Fallback to total volume (all tokens)
      summary = {
        totalVolume: statsData.data.total_volume || '0',
        transactionCount: statsData.data.total_transactions || 0,
        uniqueAddresses:
          (statsData.data.total_sent_transactions || 0) +
          (statsData.data.total_received_transactions || 0),
        riskScore: statsData.data.anomaly_statistics?.avg_anomaly_score || 0,
        totalSent: statsData.data.total_sent || '0',
        totalReceived: statsData.data.total_received || '0',
        sentTransactions: statsData.data.total_sent_transactions || 0,
        receivedTransactions: statsData.data.total_received_transactions || 0,
      };
    }
  } else {
    // Calculate from transactions data
    const totalVolume = transactions.reduce(
      (sum: bigint, tx: TransactionData) => {
        try {
          return sum + BigInt(tx.value || 0);
        } catch {
          return sum;
        }
      },
      BigInt(0)
    );

    const uniqueAddrs = new Set<string>();
    transactions.forEach((tx: TransactionData) => {
      if (tx.from && tx.from !== address) uniqueAddrs.add(tx.from);
      if (tx.to && tx.to !== address) uniqueAddrs.add(tx.to);
    });

    summary = {
      totalVolume: totalVolume.toString(),
      transactionCount: transactions.length,
      uniqueAddresses: uniqueAddrs.size,
      riskScore:
        transactions.reduce(
          (sum: number, tx: TransactionData) => sum + (tx.riskScore || 0),
          0
        ) / Math.max(transactions.length, 1),
      totalSent: '0', // Cannot calculate from transaction list alone
      totalReceived: '0', // Cannot calculate from transaction list alone
      sentTransactions: 0,
      receivedTransactions: 0,
    };
  }

  // Set time range based on user selection
  const timeRange = {
    start: new Date(now - hours * 60 * 60 * 1000).toISOString(),
    end: new Date(now).toISOString(),
  };

  return {
    type: 'address' as const,
    title: `${token} Address Detail`,
    identifier: address,
    timeRange,
    summary: {
      ...summary,
      tokenSymbol: token, // Add token context for proper volume formatting
    },
    transactions,
    trends: trendsData,
    paginationMeta: {
      totalTransactions:
        transactionsData?.pagination?.total || summary.transactionCount,
      currentToken: token,
      apiEndpoint: `${API_BASE_URL}/transactions/address/${address}`,
    },
  };
};

export const fetchTransactionsPage = async (
  identifier: string,
  page: number,
  token: string,
  timeRange: TimeRange = '24h',
  filter?: string
): Promise<{ transactions: any[]; pagination: any }> => {
  const hours = getHoursFromTimeRange(timeRange);

  try {
    const filterParam = filter ? `&filter=${filter}` : '';
    const response = await fetch(
      `${API_BASE_URL}/transactions/address/${identifier}?hours=${hours}&page=${page}&limit=10&token=${token}${filterParam}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch transactions page');
    }
    const data = await response.json();

    // Transform transaction data
    const transactions =
      data?.data?.map((tx: Record<string, unknown>) => ({
        hash: String(tx.hash || tx.transaction_hash || ''),
        timestamp: String(tx.timestamp || tx.blockTimestamp || ''),
        from: String(tx.from_address || tx.from || tx.fromAddress || ''),
        to: String(tx.to_address || tx.to || tx.toAddress || ''),
        value: String(tx.amount || tx.value || '0'),
        tokenSymbol: String(tx.token_symbol || tx.tokenSymbol || token),
        gasUsed: String(tx.gas_used || tx.gasUsed || '0'),
        gasPrice: String(tx.gas_price || tx.gasPrice || '0'),
        status: (tx.status === 1 || tx.status === 'success'
          ? 'success'
          : 'failed') as 'success' | 'failed',
        riskScore: Number(
          tx.risk_score || tx.anomalyScore || tx.riskScore || 0
        ),
      })) || [];

    // Return both transactions and pagination metadata
    return {
      transactions,
      pagination: data?.pagination || {
        total: 0,
        totalPages: 0,
        page: 1,
        limit: 10,
      },
    };
  } catch (error) {
    logger.error('Failed to fetch transaction page:', error);
    return {
      transactions: [],
      pagination: { total: 0, totalPages: 0, page: 1, limit: 10 },
    };
  }
};
