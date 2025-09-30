import { DetailedData } from '../components/DetailedAnalysisModal';
import { logger } from '@msq-tx-monitor/msq-common';

export type TimeRange = '1h' | '24h' | '7d' | '30d' | 'custom';

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
    case 'custom':
      return 24; // Default fallback
    default:
      return 24;
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

  try {
    // Try to fetch stats data with time range and token filter
    const statsResponse = await fetch(
      `http://localhost:8000/api/v1/addresses/stats/${address}?hours=${hours}&token=${token}`
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
    // Fetch transactions with pagination
    const transactionsResponse = await fetch(
      `http://localhost:8000/api/v1/transactions/address/${address}?hours=${hours}&page=${page}&limit=10&token=${token}`
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
    trends: [], // Trends data can be added later if API provides it
    paginationMeta: {
      totalTransactions:
        transactionsData?.pagination?.total || summary.transactionCount,
      currentToken: token,
      apiEndpoint: `http://localhost:8000/api/v1/transactions/address/${address}`,
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
      `http://localhost:8000/api/v1/transactions/address/${identifier}?hours=${hours}&page=${page}&limit=10&token=${token}${filterParam}`
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
