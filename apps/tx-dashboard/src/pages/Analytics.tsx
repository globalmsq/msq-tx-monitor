import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { cn } from '../utils/cn';
import {
  LazyVolumeChart,
  LazyTransactionChart,
  LazyAnomalyChart,
} from '../components/charts/LazyCharts';
import {
  wsService,
  ConnectionState,
  TransactionMessage,
} from '../services/websocket';
import { DetailedAnalysisModal } from '../components/DetailedAnalysisModal';
import { TOKEN_CONFIG } from '../config/tokens';

// Analytics API service
const ANALYTICS_BASE_URL = 'http://localhost:8000/api/v1/analytics';

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
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  subtitle?: string;
  color?: 'default' | 'green' | 'red' | 'yellow';
}

function MetricCard({
  title,
  value,
  change,
  icon,
  subtitle,
  color = 'default',
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
      <p className='text-lg lg:text-2xl font-bold text-white mt-1'>{value}</p>
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

type TimeRange = '1h' | '24h' | '7d' | '30d' | 'custom';

export function Analytics() {
  const [activeTab, setActiveTab] = useState<keyof typeof TOKEN_CONFIG>('MSQ');
  const [data, setData] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [autoRefresh] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Convert timeRange to hours
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
      case 'custom':
        return 24; // Default fallback
      default:
        return 24;
    }
  };

  // Calculate appropriate limit based on time range
  const getLimitFromTimeRange = (range: TimeRange): number => {
    switch (range) {
      case '1h':
        return 12; // 5-minute intervals for 1 hour
      case '24h':
        return 24;
      case '7d':
        return 168; // Show all 7 days worth of hourly data
      case '30d':
        return 720; // Show all 30 days worth of hourly data
      case 'custom':
        return 24;
      default:
        return 24;
    }
  };

  // Fetch analytics data with time range support and token filter
  const fetchAnalyticsData = useCallback(
    async (token: string = activeTab) => {
      try {
        setLoading(true);
        setError(null);

        const hours = getHoursFromTimeRange(timeRange);
        const limit = getLimitFromTimeRange(timeRange);
        const tokenParam = `&token=${token}`;
        const hoursParam = `&hours=${hours}`;

        const endpoints = [
          `realtime?${tokenParam.slice(1)}${hoursParam}`,
          `volume/hourly?hours=${hours}&limit=${limit}${tokenParam}`,
          `distribution/token?${tokenParam.slice(1)}${hoursParam}`,
          `addresses/top?metric=volume&limit=5${tokenParam}${hoursParam}`,
          `addresses/receivers?limit=5${tokenParam}${hoursParam}`,
          `addresses/senders?limit=5${tokenParam}${hoursParam}`,
          `anomalies?${tokenParam.slice(1)}${hoursParam}`,
          `anomalies/timeseries?hours=${hours}&limit=${limit}${tokenParam}`,
          `network?${tokenParam.slice(1)}${hoursParam}`,
        ];

        const requests = endpoints.map(endpoint =>
          fetch(`${ANALYTICS_BASE_URL}/${endpoint}`)
            .then(res => res.json())
            .catch(err => ({ error: err.message }))
        );

        const [
          realtimeRes,
          hourlyVolumeRes,
          tokenDistributionRes,
          topAddressesRes,
          topReceiversRes,
          topSendersRes,
          anomalyStatsRes,
          anomalyTimeSeriesRes,
          networkStatsRes,
        ] = await Promise.all(requests);

        // Process hourly volume data from API
        const processHourlyVolumeData = (
          apiResponse: any,
          _token: string
        ): HourlyVolumeData[] => {
          // If API returns real data, use it directly
          if (
            apiResponse &&
            apiResponse.success &&
            apiResponse.data &&
            apiResponse.data.length > 0
          ) {
            return apiResponse.data.map((item: any) => ({
              timestamp: item.hour,
              hour: item.hour,
              totalVolume: item.totalVolume,
              transactionCount: item.transactionCount,
              averageVolume: item.averageVolume,
              tokenSymbol: item.tokenSymbol,
            }));
          }

          // If no real data available, return empty array to show "No data" message
          return [];
        };

        const hourlyVolumeData = processHourlyVolumeData(
          hourlyVolumeRes,
          token
        );

        // Process anomaly time series data from API
        const processAnomalyTimeData = (
          apiResponse: any
        ): AnomalyTimeData[] => {
          // If API returns real data, use it directly
          if (
            apiResponse &&
            apiResponse.success &&
            apiResponse.data &&
            apiResponse.data.length > 0
          ) {
            return apiResponse.data.map((item: any) => ({
              timestamp: item.timestamp,
              hour: item.hour,
              anomalyCount: item.anomalyCount,
              averageScore: item.averageScore,
              highRiskCount: item.highRiskCount,
              totalTransactions: item.totalTransactions,
              anomalyRate: item.anomalyRate,
            }));
          }

          // If no real data available, return empty array to show "No data" message
          return [];
        };

        const anomalyTimeData = processAnomalyTimeData(anomalyTimeSeriesRes);

        // Use real hourly volume data (already filtered by token)
        const filteredHourlyVolume = hourlyVolumeData;

        // Extract token-specific stats from realtime data
        const tokenStats = realtimeRes.data?.tokenStats?.find(
          (stat: any) => stat.tokenSymbol === token
        );

        // Create token-specific realtime stats
        const tokenSpecificRealtime = tokenStats
          ? {
              totalTransactions: tokenStats.transactionCount || 0,
              totalVolume: tokenStats.totalVolume || '0',
              activeAddresses: tokenStats.uniqueAddresses24h || 0,
              transactionsLast24h: tokenStats.transactionCount || 0,
              volumeLast24h: tokenStats.volume24h || '0',
              activeTokens: 1, // Since we're showing data for one token
            }
          : {
              // Fallback for when token stats are not found
              totalTransactions: 0,
              totalVolume: '0',
              activeAddresses: 0,
              transactionsLast24h: 0,
              volumeLast24h: '0',
              activeTokens: 0,
            };

        setData({
          realtime: tokenSpecificRealtime,
          hourlyVolume: filteredHourlyVolume,
          tokenDistribution: tokenDistributionRes.data || [],
          topAddresses: topAddressesRes.data || [],
          topReceivers: topReceiversRes.data || [],
          topSenders: topSendersRes.data || [],
          anomalyStats: anomalyStatsRes.data,
          anomalyTimeData: anomalyTimeData,
          networkStats: networkStatsRes.data,
        });

        setLastUpdated(new Date());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch analytics data'
        );
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, timeRange]
  );

  // WebSocket message handler for real-time updates
  const handleWebSocketMessage = useCallback(
    (message: TransactionMessage) => {
      if (message.type === 'stats_update' && autoRefresh) {
        // Update specific metrics based on the received data
        if (message.data && typeof message.data === 'object') {
          const statsData = message.data as any;

          setData(prevData => ({
            ...prevData,
            realtime: {
              ...prevData.realtime,
              ...statsData.realtime,
            },
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
          fetchAnalyticsData(activeTab);
        }
      }
    },
    [autoRefresh, lastUpdated, activeTab, timeRange, fetchAnalyticsData]
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
    fetchAnalyticsData(activeTab);

    // Auto-refresh interval (only when auto-refresh is enabled)
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(
        () => fetchAnalyticsData(activeTab),
        5 * 60 * 1000
      );
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, activeTab, timeRange, fetchAnalyticsData]);

  const handleRefresh = useCallback(() => {
    fetchAnalyticsData(activeTab);
  }, [fetchAnalyticsData, activeTab]);

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    setLoading(true);
    fetchAnalyticsData(activeTab);
  };

  // Handle token tab change
  const handleTokenChange = (token: keyof typeof TOKEN_CONFIG) => {
    setActiveTab(token);
    setLoading(true);
    fetchAnalyticsData(token);
  };

  // Drill-down handlers
  const handleChartClick = async (
    type: 'address' | 'token' | 'timeperiod' | 'anomaly',
    identifier: string,
    additionalData?: any
  ) => {
    setModalLoading(true);

    try {
      // Fetch detailed data based on type and identifier
      let title = '';

      switch (type) {
        case 'address':
          title = `Address Analysis: ${identifier.slice(0, 6)}...${identifier.slice(-4)}`;
          break;
        case 'token':
          title = `Token Analysis: ${identifier}`;
          break;
        case 'timeperiod':
          title = `Time Period Analysis: ${new Date(additionalData?.start).toLocaleDateString()}`;
          break;
        case 'anomaly':
          title = `Anomaly Analysis: ${identifier}`;
          break;
      }

      // For now, generate mock detailed data since the backend endpoints don't exist yet
      const mockDetailedData = generateMockDetailedData(
        type,
        identifier,
        title
      );
      setModalData(mockDetailedData);
    } catch (error) {
      console.error('Failed to fetch detailed data:', error);
      // Show error state in modal
      setModalData({
        type,
        title: `Error loading ${type} details`,
        identifier,
        summary: { totalVolume: '0', transactionCount: 0 },
        transactions: [],
        trends: [],
      });
    } finally {
      setModalLoading(false);
    }
  };

  // Generate mock detailed data for demonstration
  const generateMockDetailedData = (
    type: string,
    identifier: string,
    title: string
  ) => {
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
      status: Math.random() > 0.1 ? 'success' : 'failed',
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
        value: Math.random() * 100,
        volume: (Math.random() * 1000 * 1e18).toString(),
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
      console.error('Export failed:', error);
    }
  };

  // CSV generation helper
  const generateCSV = (exportData: any): string => {
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
    if (exportData.tokenDistribution?.length > 0) {
      lines.push('Token Distribution');
      lines.push('Token,Transaction Count,Volume,Percentage');
      exportData.tokenDistribution.forEach((token: any) => {
        lines.push(
          `${token.tokenSymbol},${token.transactionCount},${token.volume},${token.percentage}%`
        );
      });
      lines.push('');
    }

    // Top addresses
    if (exportData.topAddresses?.length > 0) {
      lines.push('Top Addresses');
      lines.push('Address,Total Volume,Transaction Count,Unique Interactions');
      exportData.topAddresses.forEach((address: any) => {
        lines.push(
          `${address.address},${address.totalVolume},${address.transactionCount},${address.uniqueInteractions}`
        );
      });
      lines.push('');
    }

    return lines.join('\n');
  };

  // Helper functions for data formatting
  const formatNumber = (num: number | string) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  // Helper function for transaction counts (no decimals)
  const formatTransactionCount = (num: number | string) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (n >= 1e9) return Math.round(n / 1e9) + 'B';
    if (n >= 1e6) return Math.round(n / 1e6) + 'M';
    if (n >= 1e3) return Math.round(n / 1e3) + 'K';
    return Math.round(n).toLocaleString();
  };

  const formatVolume = (volume: string, token: string = activeTab) => {
    const decimals = TOKEN_CONFIG[token]?.decimals || 18;
    const num = parseFloat(volume) / Math.pow(10, decimals);
    return formatNumber(num);
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
            disabled={loading}
            className={cn(
              'p-2 rounded-lg transition-colors',
              loading
                ? 'text-white/40 cursor-not-allowed'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
            title='Refresh data'
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
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
            {(['1h', '24h', '7d', '30d'] as TimeRange[]).map(range => (
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
                      : '30 Days'}
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
      {loading ? (
        <div className='glass rounded-2xl p-6'>
          <div className='flex items-center justify-center py-12'>
            <RefreshCw className='w-8 h-8 text-primary-400 animate-spin' />
            <span className='ml-3 text-white/70'>
              Loading analytics data...
            </span>
          </div>
        </div>
      ) : (
        <div className='space-y-6'>
          {/* Key Metrics for Selected Token */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            <MetricCard
              title={`${activeTab} Transactions`}
              value={formatNumber(data.realtime?.totalTransactions || 0)}
              change={`+${formatNumber(data.realtime?.transactionsLast24h || 0)} (24h)`}
              icon={<Activity className='w-5 h-5' />}
            />
            <MetricCard
              title={`${activeTab} Volume`}
              value={formatVolume(data.realtime?.totalVolume || '0', activeTab)}
              change={`+${formatVolume(data.realtime?.volumeLast24h || '0', activeTab)} (24h)`}
              icon={<TrendingUp className='w-5 h-5' />}
            />
            <MetricCard
              title='Active Addresses'
              value={formatNumber(data.realtime?.activeAddresses || 0)}
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

          {/* Volume Trends */}
          <div className='glass rounded-2xl p-6'>
            <h3 className='text-lg font-bold text-white mb-4'>
              {activeTab} Volume Trends
            </h3>
            {data.hourlyVolume && data.hourlyVolume.length > 0 ? (
              <LazyVolumeChart
                data={data.hourlyVolume}
                height={400}
                showGrid={true}
                gradient={true}
                tokenSymbol={activeTab}
              />
            ) : (
              <div className='flex items-center justify-center py-12'>
                <span className='text-white/60'>
                  No volume data available for {activeTab}
                </span>
              </div>
            )}
          </div>

          {/* Transaction Trends and Addresses by Volume - Responsive Grid */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Transaction Trends */}
            <div className='glass rounded-2xl p-6'>
              <h3 className='text-lg font-bold text-white mb-4'>
                {activeTab} Transaction Trends
              </h3>
              {data.hourlyVolume && data.hourlyVolume.length > 0 ? (
                <LazyTransactionChart
                  data={data.hourlyVolume}
                  height={400}
                  showGrid={true}
                  tokenSymbol={activeTab}
                />
              ) : (
                <div className='flex items-center justify-center py-12'>
                  <span className='text-white/60'>
                    No transaction data available for {activeTab}
                  </span>
                </div>
              )}
            </div>

            {/* Top Addresses by Volume */}
            {data.topAddresses && data.topAddresses.length > 0 && (
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
                          <div className='text-white font-mono text-sm hover:text-primary-400 transition-colors'>
                            {address.address}
                          </div>
                          <div className='text-white/60 text-xs'>
                            {formatTransactionCount(address.transactionCount)}{' '}
                            transactions
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='text-white font-medium'>
                          {formatVolume(address.totalVolume, activeTab)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top Address Activity - Receivers and Senders */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Top Receivers */}
            <div className='glass rounded-2xl p-6'>
              <h3 className='text-lg font-bold text-white mb-4 flex items-center gap-2'>
                <span className='w-3 h-3 rounded-full bg-green-500'></span>
                Top {activeTab} Transaction Receivers
              </h3>
              {data.topReceivers && data.topReceivers.length > 0 ? (
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
                          className='cursor-pointer'
                          onClick={() =>
                            handleChartClick('address', address.address)
                          }
                        >
                          <div className='text-white font-mono text-sm hover:text-green-400 transition-colors'>
                            {address.address}
                          </div>
                          <div className='text-white/60 text-xs'>
                            {formatTransactionCount(address.transactionCount)}{' '}
                            transactions
                          </div>
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
              ) : (
                <div className='flex items-center justify-center py-12'>
                  <span className='text-white/60'>
                    No receiver data available
                  </span>
                </div>
              )}
            </div>

            {/* Top Senders */}
            <div className='glass rounded-2xl p-6'>
              <h3 className='text-lg font-bold text-white mb-4 flex items-center gap-2'>
                <span className='w-3 h-3 rounded-full bg-orange-500'></span>
                Top {activeTab} Transaction Senders
              </h3>
              {data.topSenders && data.topSenders.length > 0 ? (
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
                          className='cursor-pointer'
                          onClick={() =>
                            handleChartClick('address', address.address)
                          }
                        >
                          <div className='text-white font-mono text-sm hover:text-orange-400 transition-colors'>
                            {address.address}
                          </div>
                          <div className='text-white/60 text-xs'>
                            {formatTransactionCount(address.transactionCount)}{' '}
                            transactions
                          </div>
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
              ) : (
                <div className='flex items-center justify-center py-12'>
                  <span className='text-white/60'>
                    No sender data available
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Anomaly Detection Overview */}
          <div className='glass rounded-2xl p-6'>
            <h3 className='text-lg font-bold text-white mb-4'>
              {activeTab} Anomaly Detection Overview{' '}
              <span className='text-red-400'>(Not Working)</span>
            </h3>
            {data.anomalyStats ? (
              <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                <MetricCard
                  title='Total Anomalies'
                  value={formatNumber(data.anomalyStats.totalAnomalies || 0)}
                  icon={<AlertTriangle className='w-5 h-5' />}
                  color='yellow'
                />
                <MetricCard
                  title='Suspicious Addresses'
                  value={formatNumber(
                    data.anomalyStats.suspiciousAddresses || 0
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
                    data.anomalyStats.highRiskTransactions || 0
                  )}
                  icon={<AlertTriangle className='w-5 h-5' />}
                  color='red'
                />
              </div>
            ) : (
              <p className='text-white/70'>Anomaly data unavailable.</p>
            )}
          </div>

          {/* Anomaly Trends & Risk Analysis */}
          <div className='glass rounded-2xl p-6'>
            <h3 className='text-lg font-bold text-white mb-4'>
              {activeTab} Anomaly Trends & Risk Analysis{' '}
              <span className='text-red-400'>(Not Working)</span>
            </h3>
            {data.anomalyTimeData && data.anomalyTimeData.length > 0 ? (
              <LazyAnomalyChart
                data={data.anomalyTimeData}
                height={400}
                showGrid={true}
                riskThreshold={0.7}
              />
            ) : (
              <div className='flex items-center justify-center py-12'>
                <span className='text-white/60'>
                  No anomaly trend data available
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Analysis Modal */}
      <DetailedAnalysisModal
        isOpen={modalData !== null || modalLoading}
        onClose={closeModal}
        data={modalData}
        loading={modalLoading}
      />
    </div>
  );
}
