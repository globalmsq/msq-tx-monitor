import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  AlertTriangle,
  Download,
  RefreshCw,
  Coins,
  Calendar,
  ArrowDown,
  ArrowUp,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '../utils/cn';
import {
  LazyVolumeChart,
  LazyTransactionChart,
  LazyAnomalyChart,
} from '../components/charts/LazyCharts';
import {
  StatsCardSkeleton,
  ChartSkeleton,
  TopAddressesSkeleton,
  AnomalyStatsSkeleton,
} from '../components/LoadingSkeleton';
import {
  wsService,
  ConnectionState,
  TransactionMessage,
} from '../services/websocket';
import {
  DetailedAnalysisModal,
  DetailedData,
} from '../components/DetailedAnalysisModal';
import { TOKEN_CONFIG } from '../config/tokens';
import {
  formatNumber,
  formatVolume,
  logger,
  formatAddress,
} from '@msq-tx-monitor/msq-common';
import { VolumeWithTooltip } from '../components/VolumeWithTooltip';
import { API_BASE_URL } from '../config/api';
import {
  fetchAddressDetails as fetchAddressDetailsUtil,
  fetchTransactionsPage as fetchTransactionsPageUtil,
  TimeRange as UtilTimeRange,
} from '../utils/addressAnalytics';

// Helper function to process hourly volume data from API
function processHourlyVolumeData(
  apiResponse: ApiResponse<HourlyVolumeApiItem[]>,
  _token: string
): HourlyVolumeData[] {
  if (apiResponse && apiResponse.data && apiResponse.data.length > 0) {
    return apiResponse.data.map((item: HourlyVolumeApiItem) => ({
      timestamp: item.hour,
      hour: item.hour,
      totalVolume: item.totalVolume,
      transactionCount: item.transactionCount,
      averageVolume: item.averageVolume,
      tokenSymbol: item.tokenSymbol,
    }));
  }
  return [];
}

// Helper function to process anomaly time series data from API
function processAnomalyTimeData(
  apiResponse: ApiResponse<AnomalyTimeApiItem[]>
): AnomalyTimeData[] {
  if (apiResponse && apiResponse.data && apiResponse.data.length > 0) {
    return apiResponse.data.map((item: AnomalyTimeApiItem) => ({
      timestamp: item.timestamp || item.hour,
      hour: item.hour,
      anomalyCount: item.anomalyCount,
      averageScore: item.averageScore ?? item.averageRiskScore ?? 0,
      highRiskCount: item.highRiskCount,
      totalTransactions: item.totalTransactions ?? 0,
      anomalyRate: item.anomalyRate ?? 0,
    }));
  }
  return [];
}

interface TokenDistribution {
  tokenSymbol: string;
  transactionCount: number;
  volume: string;
  percentage: number;
  color: string;
}

interface TopAddress {
  address: string;
  totalVolume: string;
  totalReceived: string;
  totalSent: string;
  transactionCount: number;
  uniqueInteractions: number;
}

interface RealtimeStats {
  totalTransactions: number;
  totalVolume: string;
  activeAddresses: number;
  transactionsLast24h: number;
  volumeLast24h: string;
  activeTokens: number;
}

interface AnomalyStats {
  totalAnomalies: number;
  suspiciousAddresses: number;
  averageAnomalyScore: number;
  highRiskTransactions: number;
}

interface HourlyVolumeData {
  timestamp: string;
  hour: string;
  totalVolume: string;
  transactionCount: number;
  averageVolume: string;
  tokenSymbol?: string;
}

interface AnomalyTimeData {
  timestamp: string;
  hour: string;
  anomalyCount: number;
  averageScore: number;
  highRiskCount: number;
  totalTransactions: number;
  anomalyRate: number;
}

interface AnalyticsData {
  realtime?: RealtimeStats;
  hourlyVolume?: HourlyVolumeData[];
  tokenDistribution?: TokenDistribution[];
  topAddresses?: TopAddress[];
  topReceivers?: TopAddress[];
  topSenders?: TopAddress[];
  anomalyStats?: AnomalyStats;
  anomalyTimeData?: AnomalyTimeData[];
  networkStats?: unknown;
  timestamp?: string;
  timeRange?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  rawValue?: string | number; // Raw value for tooltip
  tokenSymbol?: string; // Token symbol for volume tooltip
  change?: string;
  icon: React.ReactNode;
  subtitle?: string;
  color?: 'default' | 'green' | 'red' | 'yellow';
  isVolume?: boolean; // Whether this is a volume metric that needs tooltip
}

// API Response types - matches backend StatisticsResponse
interface ApiResponse<T> {
  data: T;
  filters?: Record<string, any>;
  timestamp: string;
  cached: boolean;
  ttl?: number;
}

interface HourlyVolumeApiItem {
  hour: string;
  totalVolume: string;
  transactionCount: number;
  averageVolume: string;
  tokenSymbol: string;
}

interface AnomalyTimeApiItem {
  timestamp?: string;
  hour: string;
  anomalyCount: number;
  averageScore?: number;
  averageRiskScore?: number; // Backward compatibility
  highRiskCount: number;
  totalTransactions?: number;
  anomalyRate?: number;
}

interface TokenStatApiItem {
  tokenSymbol: string;
  transactionCount: number;
  volume: string;
  volume24h: string;
  totalVolume: string;
  uniqueAddresses24h: number;
  percentage: number;
}

function MetricCard({
  title,
  value,
  rawValue,
  tokenSymbol,
  change,
  icon,
  subtitle,
  color = 'default',
  isVolume = false,
}: MetricCardProps) {
  const colorClasses = {
    default: 'text-white',
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
  };

  const changeColorClass = change
    ? change.startsWith('+')
      ? 'text-green-400'
      : change.startsWith('-')
        ? 'text-red-400'
        : 'text-white/70'
    : '';

  return (
    <div className='glass rounded-xl p-4 lg:p-6 animate-fade-in'>
      <div className='flex items-center justify-between mb-3'>
        <div className={cn('p-2 rounded-lg bg-white/10', colorClasses[color])}>
          {icon}
        </div>
        {change && (
          <span
            className={cn('text-xs lg:text-sm font-medium', changeColorClass)}
          >
            {change}
          </span>
        )}
      </div>
      <h3 className='text-white/70 text-xs lg:text-sm font-medium truncate'>
        {title}
      </h3>
      <p className='text-lg lg:text-2xl font-bold text-white mt-1'>
        {isVolume && rawValue ? (
          <VolumeWithTooltip
            formattedValue={value.toString()}
            rawValue={rawValue}
            tokenSymbol={tokenSymbol}
          />
        ) : (
          value
        )}
      </p>
      {subtitle && <p className='text-white/60 text-xs mt-1'>{subtitle}</p>}
    </div>
  );
}

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ isActive, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
          : 'text-white/70 hover:text-white hover:bg-white/5'
      )}
    >
      {children}
    </button>
  );
}

type TimeRange = '1h' | '24h' | '7d' | '30d' | '3m' | '6m' | '1y' | 'all';

interface LoadingStates {
  realtime: boolean;
  hourlyVolume: boolean;
  tokenDistribution: boolean;
  topAddresses: boolean;
  topReceivers: boolean;
  topSenders: boolean;
  anomalyStats: boolean;
  anomalyTimeData: boolean;
  networkStats: boolean;
}

export function Analytics() {
  const [activeTab, setActiveTab] = useState<keyof typeof TOKEN_CONFIG>('MSQ');
  const [data, setData] = useState<AnalyticsData>({});
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    realtime: true,
    hourlyVolume: true,
    tokenDistribution: true,
    topAddresses: true,
    topReceivers: true,
    topSenders: true,
    anomalyStats: true,
    anomalyTimeData: true,
    networkStats: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [autoRefresh] = useState(false);
  const [modalData, setModalData] = useState<DetailedData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Create ref to store the latest fetchAnalyticsData function to break dependency chains
  const fetchAnalyticsDataRef = useRef<(token?: string) => Promise<void>>();

  // Calculate appropriate limit based on time range
  const getLimitFromTimeRange = (range: TimeRange): number => {
    switch (range) {
      case '1h':
        return 60; // 1-minute intervals = 60 points
      case '24h':
        return 24; // Hourly = 24 points
      case '7d':
        return 168; // Hourly = 168 points (7 * 24)
      case '30d':
        return 30; // Daily = 30 points
      case '3m':
        return 90; // Daily = 90 points
      case '6m':
        return 26; // Weekly = ~26 points
      case '1y':
        return 52; // Weekly = 52 points
      case 'all':
        return 104; // Weekly = 104 points (~2 years)
      default:
        return 24;
    }
  };

  // Convert TimeRange to actual hours for API timeframe parameter
  const getHoursFromTimeRange = (range: TimeRange): number => {
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

  // Get display label for time range
  const getTimeRangeLabel = (range: TimeRange): string => {
    switch (range) {
      case '1h':
        return '1h';
      case '24h':
        return '24h';
      case '7d':
        return '7d';
      case '30d':
        return '30d';
      case '3m':
        return '3m';
      case '6m':
        return '6m';
      case '1y':
        return '1y';
      case 'all':
        return 'all';
      default:
        return '24h';
    }
  };

  // Fetch analytics data with time range support and token filter
  const fetchAnalyticsData = useCallback(
    async (token: string = activeTab) => {
      try {
        // Reset all loading states
        setLoadingStates({
          realtime: true,
          hourlyVolume: true,
          tokenDistribution: true,
          topAddresses: true,
          topReceivers: true,
          topSenders: true,
          anomalyStats: true,
          anomalyTimeData: true,
          networkStats: true,
        });
        setError(null);

        const limit = getLimitFromTimeRange(timeRange);
        const hours = getHoursFromTimeRange(timeRange);
        const tokenParam = `&token=${token}`;

        // Fetch realtime stats
        fetch(`${API_BASE_URL}/analytics/realtime?${tokenParam.slice(1)}&hours=${hours}`)
          .then(res => res.json())
          .then((realtimeRes: ApiResponse<unknown>) => {
            const tokenStats = (
              realtimeRes.data as { tokenStats?: TokenStatApiItem[] }
            )?.tokenStats?.find(
              (stat: TokenStatApiItem) => stat.tokenSymbol === token
            );

            const tokenSpecificRealtime = tokenStats
              ? {
                  totalTransactions: tokenStats.transactionCount || 0,
                  totalVolume: tokenStats.totalVolume || '0',
                  activeAddresses: tokenStats.uniqueAddresses24h || 0,
                  transactionsLast24h: tokenStats.transactionCount || 0,
                  volumeLast24h: tokenStats.volume24h || '0',
                  activeTokens: 1,
                }
              : {
                  totalTransactions: 0,
                  totalVolume: '0',
                  activeAddresses: 0,
                  transactionsLast24h: 0,
                  volumeLast24h: '0',
                  activeTokens: 0,
                };

            setData(prev => ({ ...prev, realtime: tokenSpecificRealtime }));
            setLoadingStates(prev => ({ ...prev, realtime: false }));
          })
          .catch(err => {
            logger.error('Realtime fetch error:', err);
          });

        // Smart API selection based on time range for volume data
        let volumeEndpoint: string;
        if (timeRange === '1h') {
          // Use minute-level API for 1 hour (1-minute intervals)
          volumeEndpoint = `${API_BASE_URL}/analytics/volume/minutes`;
        } else if (timeRange === '24h' || timeRange === '7d') {
          // Use hourly API for 24h and 7d
          volumeEndpoint = `${API_BASE_URL}/analytics/volume/hourly`;
        } else if (timeRange === '30d' || timeRange === '3m') {
          // Use daily API for 30d and 3m
          volumeEndpoint = `${API_BASE_URL}/analytics/volume/daily`;
        } else {
          // Use weekly API for 6m, 1y, all
          volumeEndpoint = `${API_BASE_URL}/analytics/volume/weekly`;
        }

        fetch(`${volumeEndpoint}?limit=${limit}${tokenParam}`)
          .then(res => res.json())
          .then((hourlyVolumeRes: ApiResponse<HourlyVolumeApiItem[]>) => {
            const hourlyVolumeData = processHourlyVolumeData(
              hourlyVolumeRes,
              token
            );
            setData(prev => ({ ...prev, hourlyVolume: hourlyVolumeData }));
            setLoadingStates(prev => ({ ...prev, hourlyVolume: false }));
          })
          .catch(err => {
            logger.error('Volume fetch error:', err);
          });

        // Fetch token distribution
        fetch(
          `${API_BASE_URL}/analytics/distribution/token?${tokenParam.slice(1)}`
        )
          .then(res => res.json())
          .then((tokenDistributionRes: ApiResponse<TokenDistribution[]>) => {
            setData(prev => ({
              ...prev,
              tokenDistribution: tokenDistributionRes.data || [],
            }));
            setLoadingStates(prev => ({ ...prev, tokenDistribution: false }));
          })
          .catch(err => {
            logger.error('Token distribution fetch error:', err);
          });

        // Fetch top addresses (slowest API)
        fetch(
          `${API_BASE_URL}/analytics/addresses/top?metric=volume&limit=5${tokenParam}&hours=${hours}`
        )
          .then(res => res.json())
          .then((topAddressesRes: ApiResponse<TopAddress[]>) => {
            setData(prev => ({
              ...prev,
              topAddresses: topAddressesRes.data || [],
            }));
            setLoadingStates(prev => ({ ...prev, topAddresses: false }));
          })
          .catch(err => {
            logger.error('Top addresses fetch error:', err);
          });

        // Fetch top receivers
        fetch(
          `${API_BASE_URL}/analytics/addresses/receivers?limit=5${tokenParam}&hours=${hours}`
        )
          .then(res => res.json())
          .then((topReceiversRes: ApiResponse<TopAddress[]>) => {
            setData(prev => ({
              ...prev,
              topReceivers: topReceiversRes.data || [],
            }));
            setLoadingStates(prev => ({ ...prev, topReceivers: false }));
          })
          .catch(err => {
            logger.error('Top receivers fetch error:', err);
          });

        // Fetch top senders
        fetch(
          `${API_BASE_URL}/analytics/addresses/senders?limit=5${tokenParam}&hours=${hours}`
        )
          .then(res => res.json())
          .then((topSendersRes: ApiResponse<TopAddress[]>) => {
            setData(prev => ({
              ...prev,
              topSenders: topSendersRes.data || [],
            }));
            setLoadingStates(prev => ({ ...prev, topSenders: false }));
          })
          .catch(err => {
            logger.error('Top senders fetch error:', err);
          });

        // Fetch anomaly stats
        fetch(`${API_BASE_URL}/analytics/anomalies?${tokenParam.slice(1)}`)
          .then(res => res.json())
          .then((anomalyStatsRes: ApiResponse<AnomalyStats>) => {
            setData(prev => ({ ...prev, anomalyStats: anomalyStatsRes.data }));
            setLoadingStates(prev => ({ ...prev, anomalyStats: false }));
          })
          .catch(err => {
            logger.error('Anomaly stats fetch error:', err);
          });

        // Smart API selection based on time range for anomaly timeseries
        let anomalyEndpoint: string;
        if (timeRange === '1h') {
          // Use minute-level API for 1 hour (1-minute intervals)
          anomalyEndpoint = `${API_BASE_URL}/analytics/anomalies/timeseries/minutes`;
        } else if (timeRange === '24h' || timeRange === '7d') {
          // Use hourly API for 24h and 7d
          anomalyEndpoint = `${API_BASE_URL}/analytics/anomalies/timeseries/hourly`;
        } else if (timeRange === '30d' || timeRange === '3m') {
          // Use daily API for 30d and 3m
          anomalyEndpoint = `${API_BASE_URL}/analytics/anomalies/timeseries/daily`;
        } else {
          // Use weekly API for 6m, 1y, all
          anomalyEndpoint = `${API_BASE_URL}/analytics/anomalies/timeseries/weekly`;
        }

        fetch(`${anomalyEndpoint}?limit=${limit}${tokenParam}`)
          .then(res => res.json())
          .then((anomalyTimeSeriesRes: ApiResponse<AnomalyTimeApiItem[]>) => {
            const anomalyTimeData =
              processAnomalyTimeData(anomalyTimeSeriesRes);
            setData(prev => ({ ...prev, anomalyTimeData }));
            setLoadingStates(prev => ({ ...prev, anomalyTimeData: false }));
          })
          .catch(err => {
            logger.error('Anomaly time series fetch error:', err);
          });

        // Fetch network stats
        fetch(`${API_BASE_URL}/analytics/network?${tokenParam.slice(1)}`)
          .then(res => res.json())
          .then((networkStatsRes: ApiResponse<unknown>) => {
            setData(prev => ({ ...prev, networkStats: networkStatsRes.data }));
            setLoadingStates(prev => ({ ...prev, networkStats: false }));
          })
          .catch(err => {
            logger.error('Network stats fetch error:', err);
          });

        setLastUpdated(new Date());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch analytics data'
        );
        logger.error('Analytics fetch error:', err);
      }
    },
    [activeTab, timeRange]
  );

  // Update ref whenever fetchAnalyticsData changes
  useEffect(() => {
    fetchAnalyticsDataRef.current = fetchAnalyticsData;
  }, [fetchAnalyticsData]);

  // WebSocket message handler for real-time updates
  const handleWebSocketMessage = useCallback(
    (message: TransactionMessage) => {
      if (message.type === 'stats_update' && autoRefresh) {
        // Update specific metrics based on the received data
        if (message.data && typeof message.data === 'object') {
          const statsData = message.data as Partial<AnalyticsData>;

          setData(prevData => ({
            ...prevData,
            realtime: {
              ...prevData.realtime,
              ...statsData.realtime,
            } as RealtimeStats,
          }));

          setLastUpdated(new Date());
        }
      } else if (message.type === 'new_transaction' && autoRefresh) {
        // Optionally trigger a data refresh for new transactions
        // This prevents too frequent updates
        const now = Date.now();
        const lastUpdate = lastUpdated.getTime();

        // Only refresh if last update was more than 30 seconds ago
        if (now - lastUpdate > 30000) {
          fetchAnalyticsDataRef.current?.(activeTab);
        }
      }
    },
    [autoRefresh, lastUpdated, activeTab]
  );

  // WebSocket connection management
  useEffect(() => {
    // Subscribe to messages
    const unsubscribeMessages = wsService.subscribe(handleWebSocketMessage);

    // Connect to WebSocket
    wsService.connect();

    // Send analytics subscription message
    const subscribeToAnalytics = () => {
      if (wsService.isConnected()) {
        wsService.send({
          type: 'subscribe',
          channel: 'analytics',
          data: { timeRange },
        });
      }
    };

    // Subscribe when connected
    if (wsService.isConnected()) {
      subscribeToAnalytics();
    } else {
      // Listen for connection and then subscribe
      const connectHandler = (state: ConnectionState) => {
        if (state === ConnectionState.CONNECTED) {
          subscribeToAnalytics();
        }
      };
      const unsubscribeConnect =
        wsService.onConnectionStateChange(connectHandler);

      return () => {
        unsubscribeMessages();
        unsubscribeConnect();
      };
    }

    return () => {
      unsubscribeMessages();
      // Don't disconnect here as other components might be using it
    };
  }, [handleWebSocketMessage, timeRange]);

  // Data fetching effect
  useEffect(() => {
    fetchAnalyticsDataRef.current?.(activeTab);

    // Auto-refresh interval (only when auto-refresh is enabled)
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(
        () => fetchAnalyticsDataRef.current?.(activeTab),
        5 * 60 * 1000
      );
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, activeTab, timeRange]);

  const handleRefresh = useCallback(() => {
    fetchAnalyticsDataRef.current?.(activeTab);
  }, [activeTab]);

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    // fetchAnalyticsData will be called by useEffect when timeRange changes
  };

  // Handle token tab change
  const handleTokenChange = (token: keyof typeof TOKEN_CONFIG) => {
    setActiveTab(token);
    // fetchAnalyticsData will be called by useEffect when activeTab changes
  };

  // Handle address click to show details
  const handleAddressClick = useCallback(
    async (address: string) => {
      setModalLoading(true);
      try {
        // Use timeRange directly - all time ranges are now supported
        const utilTimeRange: UtilTimeRange = timeRange;

        const detailedData = await fetchAddressDetailsUtil(
          address,
          activeTab,
          utilTimeRange
        );
        setModalData(detailedData);
      } catch (error) {
        logger.error('Failed to fetch address details:', error);
      } finally {
        setModalLoading(false);
      }
    },
    [activeTab, timeRange]
  );

  // Handle transaction pagination in modal
  const handleFetchModalTransactions = useCallback(
    async (page: number, filter?: string) => {
      if (!modalData?.identifier) {
        return { transactions: [], pagination: {} };
      }

      // Use timeRange directly - all time ranges are now supported
      const utilTimeRange: UtilTimeRange = timeRange;

      return fetchTransactionsPageUtil(
        modalData.identifier,
        page,
        activeTab,
        utilTimeRange,
        filter
      );
    },
    [modalData?.identifier, activeTab, timeRange]
  );

  // Drill-down handlers
  const handleChartClick = async (
    type: 'address' | 'token' | 'timeperiod' | 'anomaly',
    identifier: string,
    additionalData?: Record<string, unknown>
  ) => {
    setModalLoading(true);

    try {
      let detailedData: DetailedData;
      let title = '';

      switch (type) {
        case 'address':
          // Fetch real data from API for addresses - use handleAddressClick
          await handleAddressClick(identifier);
          return; // handleAddressClick already sets modalData, so return early

        case 'token':
          title = `Token Analysis: ${identifier}`;
          // For now, keep mock data for token type
          detailedData = generateMockDetailedData(type, identifier, title);
          break;

        case 'timeperiod':
          title = `Time Period Analysis: ${
            additionalData &&
            typeof additionalData === 'object' &&
            'start' in additionalData
              ? new Date(additionalData.start as string).toLocaleDateString()
              : 'Unknown Period'
          }`;
          // For now, keep mock data for timeperiod type
          detailedData = generateMockDetailedData(type, identifier, title);
          break;

        case 'anomaly':
          title = `Anomaly Analysis: ${identifier}`;
          // For now, keep mock data for anomaly type
          detailedData = generateMockDetailedData(type, identifier, title);
          break;

        default:
          title = `Analysis: ${identifier}`;
          detailedData = generateMockDetailedData(type, identifier, title);
      }

      setModalData(detailedData);
    } catch (error) {
      logger.error('Failed to fetch detailed data:', error);
      // Show error state in modal
      setModalData({
        type,
        title: `Error loading ${type} details`,
        identifier,
        summary: { totalVolume: '0', transactionCount: 0 },
        transactions: [],
        trends: [],
      } as DetailedData);
    } finally {
      setModalLoading(false);
    }
  };

  // Generate mock detailed data for demonstration
  const generateMockDetailedData = (
    type: 'address' | 'token' | 'timeperiod' | 'anomaly',
    identifier: string,
    title: string
  ): DetailedData => {
    const now = Date.now();
    const transactions = Array.from({ length: 25 }, (_, i) => ({
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      timestamp: new Date(now - i * 3600000).toISOString(),
      from: `0x${Math.random().toString(16).substr(2, 40)}`,
      to: `0x${Math.random().toString(16).substr(2, 40)}`,
      value: (Math.random() * 1000 * 1e18).toString(),
      tokenSymbol: ['MSQ', 'SUT', 'KWT', 'P2UC'][Math.floor(Math.random() * 4)],
      gasUsed: (Math.random() * 100000).toFixed(0),
      gasPrice: (Math.random() * 50).toFixed(0),
      status: (Math.random() > 0.1 ? 'success' : 'failed') as
        | 'success'
        | 'failed',
      riskScore: Math.random(),
    }));

    return {
      type,
      title,
      identifier,
      timeRange: {
        start: new Date(now - 24 * 3600000).toISOString(),
        end: new Date(now).toISOString(),
      },
      summary: {
        totalVolume: (Math.random() * 10000 * 1e18).toString(),
        transactionCount: transactions.length,
        uniqueAddresses: Math.floor(Math.random() * 50) + 10,
        riskScore:
          type === 'anomaly' ? Math.random() * 0.3 + 0.7 : Math.random() * 0.5,
      },
      transactions,
      trends: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(now - (23 - i) * 3600000).toISOString(),
        transactionCount: Math.floor(Math.random() * 100),
        volume: (Math.random() * 1000 * 1e18).toString(),
        sentCount: Math.floor(Math.random() * 50),
        receivedCount: Math.floor(Math.random() * 50),
        sentVolume: (Math.random() * 500 * 1e18).toString(),
        receivedVolume: (Math.random() * 500 * 1e18).toString(),
        avgAnomalyScore: Math.random() * 0.5,
      })),
    };
  };

  const closeModal = () => {
    setModalData(null);
  };

  const handleExport = () => {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        timeRange,
        realtime: data.realtime,
        tokenDistribution: data.tokenDistribution,
        topAddresses: data.topAddresses,
        anomalyStats: data.anomalyStats,
      };

      // Convert to CSV format
      const csvContent = generateCSV(exportData);

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `analytics-${timeRange}-${Date.now()}.csv`
        );
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      logger.error('Export failed:', error);
    }
  };

  // CSV generation helper
  const generateCSV = (exportData: AnalyticsData): string => {
    const lines: string[] = [];

    // Add metadata
    lines.push('MSQ Transaction Monitor - Analytics Export');
    lines.push(`Generated: ${exportData.timestamp}`);
    lines.push(`Time Range: ${exportData.timeRange}`);
    lines.push(''); // Empty line

    // Realtime stats
    if (exportData.realtime) {
      lines.push('Realtime Statistics');
      lines.push('Metric,Value');
      Object.entries(exportData.realtime).forEach(([key, value]) => {
        lines.push(`${key},${value}`);
      });
      lines.push('');
    }

    // Token distribution
    if (
      exportData.tokenDistribution &&
      exportData.tokenDistribution.length > 0
    ) {
      lines.push('Token Distribution');
      lines.push('Token,Transaction Count,Volume,Percentage');
      exportData.tokenDistribution?.forEach((token: TokenDistribution) => {
        lines.push(
          `${token.tokenSymbol},${token.transactionCount},${token.volume},${token.percentage}%`
        );
      });
      lines.push('');
    }

    // Top addresses
    if (exportData.topAddresses && exportData.topAddresses.length > 0) {
      lines.push('Top Addresses');
      lines.push('Address,Total Volume,Transaction Count,Unique Interactions');
      exportData.topAddresses?.forEach((address: TopAddress) => {
        lines.push(
          `${address.address},${address.totalVolume},${address.transactionCount},${address.uniqueInteractions}`
        );
      });
      lines.push('');
    }

    return lines.join('\n');
  };

  // Helper function for transaction counts (no decimals, full numbers with commas)
  const formatTransactionCount = (num: number | string) => {
    return formatNumber(num, { precision: 0, compact: false });
  };

  // Handle address copy to clipboard
  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  if (error) {
    return (
      <div className='glass rounded-2xl p-6'>
        <div className='text-center'>
          <AlertTriangle className='w-12 h-12 text-red-400 mx-auto mb-4' />
          <h2 className='text-xl font-bold text-white mb-2'>
            Analytics Unavailable
          </h2>
          <p className='text-white/70 mb-4'>{error}</p>
          <button
            onClick={handleRefresh}
            className='px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors'
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl lg:text-3xl font-bold text-white'>
            Analytics Dashboard
          </h1>
          <p className='text-white/70 mt-1'>
            Real-time transaction and network analytics
          </p>
        </div>

        <div className='flex items-center gap-3'>
          {/* Connection Status */}

          <div className='text-sm text-white/60'>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={handleRefresh}
            disabled={Object.values(loadingStates).some(state => state)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              Object.values(loadingStates).some(state => state)
                ? 'text-white/40 cursor-not-allowed'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
            title='Refresh data'
          >
            <RefreshCw
              className={cn(
                'w-5 h-5',
                Object.values(loadingStates).some(state => state) &&
                  'animate-spin'
              )}
            />
          </button>
          <button
            onClick={handleExport}
            className='p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors'
            title='Export data'
          >
            <Download className='w-5 h-5' />
          </button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4'>
        <div className='flex items-center gap-2'>
          <Calendar className='w-4 h-4 text-white/60' />
          <span className='text-sm text-white/60'>Time Range:</span>
          <div className='flex gap-1'>
            {(
              ['1h', '24h', '7d', '30d', '3m', '6m', '1y', 'all'] as TimeRange[]
            ).map(range => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={cn(
                  'px-3 py-1 rounded text-xs transition-colors',
                  timeRange === range
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                {range === '1h'
                  ? '1 Hour'
                  : range === '24h'
                    ? '24 Hours'
                    : range === '7d'
                      ? '7 Days'
                      : range === '30d'
                        ? '30 Days'
                        : range === '3m'
                          ? '3 Months'
                          : range === '6m'
                            ? '6 Months'
                            : range === '1y'
                              ? '1 Year'
                              : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className='flex flex-wrap gap-2'>
        {Object.keys(TOKEN_CONFIG).map(token => (
          <TabButton
            key={token}
            isActive={activeTab === token}
            onClick={() =>
              handleTokenChange(token as keyof typeof TOKEN_CONFIG)
            }
          >
            {token}
          </TabButton>
        ))}
      </div>

      {/* Content */}
      <div className='space-y-6'>
        {/* Key Metrics for Selected Token */}
        {loadingStates.realtime ? (
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
        ) : (
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            <MetricCard
              title={`${activeTab} Transactions`}
              value={formatNumber(data.realtime?.totalTransactions || 0, {
                precision: 0,
                compact: false,
              })}
              change={`+${formatNumber(data.realtime?.transactionsLast24h || 0, { precision: 0, compact: false })} (${getTimeRangeLabel(timeRange)})`}
              icon={<Activity className='w-5 h-5' />}
            />
            <MetricCard
              title={`${activeTab} Volume`}
              value={formatVolume(data.realtime?.totalVolume || '0', activeTab)}
              rawValue={data.realtime?.totalVolume || '0'}
              tokenSymbol={activeTab}
              change={`+${formatVolume(data.realtime?.volumeLast24h || '0', activeTab)} (${getTimeRangeLabel(timeRange)})`}
              icon={<TrendingUp className='w-5 h-5' />}
              isVolume={true}
            />
            <MetricCard
              title='Active Addresses'
              value={formatNumber(data.realtime?.activeAddresses || 0, {
                precision: 0,
                compact: false,
              })}
              subtitle={`Trading ${activeTab}`}
              icon={<Users className='w-5 h-5' />}
            />
            <MetricCard
              title='Token Price'
              value='$0.00'
              subtitle='24h change'
              icon={<Coins className='w-5 h-5' />}
            />
          </div>
        )}

        {/* Volume Trends */}
        {loadingStates.hourlyVolume ? (
          <ChartSkeleton />
        ) : data.hourlyVolume && data.hourlyVolume.length > 0 ? (
          <div className='glass rounded-2xl p-6'>
            <h3 className='text-lg font-bold text-white mb-4'>
              {activeTab} Volume Trends
            </h3>
            <LazyVolumeChart
              data={data.hourlyVolume}
              height={400}
              showGrid={true}
              gradient={true}
              tokenSymbol={activeTab}
            />
          </div>
        ) : null}

        {/* Transaction Trends and Addresses by Volume - Responsive Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Transaction Trends */}
          {loadingStates.hourlyVolume ? (
            <ChartSkeleton />
          ) : data.hourlyVolume && data.hourlyVolume.length > 0 ? (
            <div className='glass rounded-2xl p-6'>
              <h3 className='text-lg font-bold text-white mb-4'>
                {activeTab} Transaction Trends
              </h3>
              <LazyTransactionChart
                data={data.hourlyVolume}
                height={350}
                showGrid={true}
                tokenSymbol={activeTab}
              />
            </div>
          ) : null}

          {/* Top Addresses by Volume */}
          {loadingStates.topAddresses ? (
            <TopAddressesSkeleton />
          ) : data.topAddresses && data.topAddresses.length > 0 ? (
            <div className='glass rounded-2xl p-6'>
              <h3 className='text-lg font-bold text-white mb-4'>
                Top {activeTab} Addresses by Volume
              </h3>
              <div className='space-y-3'>
                {data.topAddresses.slice(0, 5).map((address, index) => (
                  <div
                    key={address.address}
                    className='flex items-center justify-between py-2 border-b border-white/10 last:border-b-0'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm'>
                        {index + 1}
                      </div>
                      <div
                        className='cursor-pointer'
                        onClick={() =>
                          handleChartClick('address', address.address)
                        }
                      >
                        <div className='text-white font-mono text-sm hover:text-primary-400 transition-colors flex items-center gap-2'>
                          <span className='hidden lg:inline'>
                            {address.address}
                          </span>
                          <span className='inline lg:hidden'>
                            {formatAddress(address.address)}
                          </span>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleCopyAddress(address.address);
                            }}
                            className='text-white/60 hover:text-white transition-colors flex-shrink-0'
                            title='Copy address'
                          >
                            {copiedAddress === address.address ? (
                              <Check size={14} className='text-green-400' />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                        <div className='text-white/60 text-xs'>
                          {formatTransactionCount(address.transactionCount)}{' '}
                          transactions
                        </div>
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='text-white font-medium'>
                        <VolumeWithTooltip
                          formattedValue={formatVolume(
                            address.totalVolume,
                            activeTab,
                            {
                              precision: 0,
                            }
                          )}
                          rawValue={address.totalVolume}
                          tokenSymbol={activeTab}
                          receivedValue={address.totalReceived}
                          sentValue={address.totalSent}
                          showBreakdown={true}
                        />
                      </div>
                      <div className='flex items-center justify-end gap-3 mt-1 text-xs text-white/60'>
                        <div className='flex items-center gap-1'>
                          <ArrowDown size={12} className='text-blue-400' />
                          <span>
                            {formatVolume(address.totalReceived, activeTab, {
                              precision: 0,
                            })}
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <ArrowUp size={12} className='text-orange-400' />
                          <span>
                            {formatVolume(address.totalSent, activeTab, {
                              precision: 0,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Top Address Activity - Receivers and Senders */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Top Receivers */}
          {loadingStates.topReceivers ? (
            <TopAddressesSkeleton />
          ) : data.topReceivers && data.topReceivers.length > 0 ? (
            <div className='glass rounded-2xl p-6'>
              <h3 className='text-lg font-bold text-white mb-4 flex items-center gap-2'>
                <span className='w-3 h-3 rounded-full bg-green-500'></span>
                Top {activeTab} Transaction Receivers
              </h3>
              <div className='space-y-3'>
                {data.topReceivers.slice(0, 5).map((address, index) => (
                  <div
                    key={address.address}
                    className='flex items-center justify-between py-2 border-b border-white/10 last:border-b-0'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm'>
                        {index + 1}
                      </div>
                      <div
                        className='cursor-pointer flex items-center gap-2'
                        onClick={() =>
                          handleChartClick('address', address.address)
                        }
                      >
                        <div className='text-white font-mono text-sm hover:text-green-400 transition-colors'>
                          <span className='hidden lg:inline'>
                            {address.address}
                          </span>
                          <span className='inline lg:hidden'>
                            {formatAddress(address.address)}
                          </span>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleCopyAddress(address.address);
                          }}
                          className='text-white/60 hover:text-white transition-colors flex-shrink-0'
                          title='Copy address'
                        >
                          {copiedAddress === address.address ? (
                            <Check size={14} className='text-green-400' />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='text-white font-medium'>
                        {formatTransactionCount(address.transactionCount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Top Senders */}
          {loadingStates.topSenders ? (
            <TopAddressesSkeleton />
          ) : data.topSenders && data.topSenders.length > 0 ? (
            <div className='glass rounded-2xl p-6'>
              <h3 className='text-lg font-bold text-white mb-4 flex items-center gap-2'>
                <span className='w-3 h-3 rounded-full bg-orange-500'></span>
                Top {activeTab} Transaction Senders
              </h3>
              <div className='space-y-3'>
                {data.topSenders.slice(0, 5).map((address, index) => (
                  <div
                    key={address.address}
                    className='flex items-center justify-between py-2 border-b border-white/10 last:border-b-0'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm'>
                        {index + 1}
                      </div>
                      <div
                        className='cursor-pointer flex items-center gap-2'
                        onClick={() =>
                          handleChartClick('address', address.address)
                        }
                      >
                        <div className='text-white font-mono text-sm hover:text-orange-400 transition-colors'>
                          <span className='hidden lg:inline'>
                            {address.address}
                          </span>
                          <span className='inline lg:hidden'>
                            {formatAddress(address.address)}
                          </span>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleCopyAddress(address.address);
                          }}
                          className='text-white/60 hover:text-white transition-colors flex-shrink-0'
                          title='Copy address'
                        >
                          {copiedAddress === address.address ? (
                            <Check size={14} className='text-green-400' />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='text-white font-medium'>
                        {formatTransactionCount(address.transactionCount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Anomaly Detection Overview */}
        {loadingStates.anomalyStats ? (
          <AnomalyStatsSkeleton />
        ) : data.anomalyStats ? (
          <div className='glass rounded-2xl p-6'>
            <h3 className='text-lg font-bold text-white mb-4'>
              {activeTab} Anomaly Detection Overview{' '}
              <span className='text-red-400'>(Not Working)</span>
            </h3>
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
              <MetricCard
                title='Total Anomalies'
                value={formatNumber(data.anomalyStats.totalAnomalies || 0, {
                  compact: false,
                })}
                icon={<AlertTriangle className='w-5 h-5' />}
                color='yellow'
              />
              <MetricCard
                title='Suspicious Addresses'
                value={formatNumber(
                  data.anomalyStats.suspiciousAddresses || 0,
                  { compact: false }
                )}
                icon={<Users className='w-5 h-5' />}
                color='red'
              />
              <MetricCard
                title='Average Risk Score'
                value={`${(data.anomalyStats.averageAnomalyScore * 100 || 0).toFixed(1)}%`}
                icon={<BarChart3 className='w-5 h-5' />}
              />
              <MetricCard
                title='High Risk Transactions'
                value={formatNumber(
                  data.anomalyStats.highRiskTransactions || 0,
                  { compact: false }
                )}
                icon={<AlertTriangle className='w-5 h-5' />}
                color='red'
              />
            </div>
          </div>
        ) : null}

        {/* Anomaly Trends & Risk Analysis */}
        {loadingStates.anomalyTimeData ? (
          <ChartSkeleton />
        ) : data.anomalyTimeData && data.anomalyTimeData.length > 0 ? (
          <div className='glass rounded-2xl p-6'>
            <h3 className='text-lg font-bold text-white mb-4'>
              {activeTab} Anomaly Trends & Risk Analysis{' '}
              <span className='text-red-400'>(Not Working)</span>
            </h3>
            <LazyAnomalyChart
              data={data.anomalyTimeData}
              height={400}
              showGrid={true}
              riskThreshold={0.7}
            />
          </div>
        ) : null}
      </div>

      {/* Detailed Analysis Modal */}
      <DetailedAnalysisModal
        isOpen={modalData !== null || modalLoading}
        onClose={closeModal}
        data={modalData}
        loading={modalLoading}
        onFetchTransactions={handleFetchModalTransactions}
      />
    </div>
  );
}
