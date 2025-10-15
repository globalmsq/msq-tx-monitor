import React, { useState, useCallback, useEffect } from 'react';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  Wallet,
  Calendar,
} from 'lucide-react';
import { cn } from '../utils/cn';
import {
  DetailedAnalysisModal,
  DetailedData,
} from '../components/DetailedAnalysisModal';
import { AddressCategoryBox } from '../components/AddressCategoryBox';
import { logger } from '@msq-tx-monitor/msq-common';
import {
  fetchAddressDetails,
  fetchTransactionsPage,
  TimeRange as UtilTimeRange,
} from '../utils/addressAnalytics';
import { API_BASE_URL } from '../config/api';

type TimeRange = '1h' | '24h' | '7d' | '30d' | '3m' | '6m' | '1y' | 'all';

interface AddressRanking {
  address: string;
  total_volume?: string;
  total_sent?: string;
  total_received?: string;
  transaction_count?: number;
  first_seen?: string;
  last_seen?: string;
  rank?: number;
}

export function Addresses() {
  const [selectedToken, setSelectedToken] = useState<string>('MSQ');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  // Separate state for each category
  const [rankingsData, setRankingsData] = useState<AddressRanking[]>([]);
  const [whalesData, setWhalesData] = useState<AddressRanking[]>([]);
  const [activeData, setActiveData] = useState<AddressRanking[]>([]);
  const [suspiciousData, setSuspiciousData] = useState<AddressRanking[]>([]);

  // Loading states for each category
  const [loadingStates, setLoadingStates] = useState({
    rankings: false,
    whales: false,
    active: false,
    suspicious: false,
  });

  // Modal state
  const [selectedAddressData, setSelectedAddressData] =
    useState<DetailedData | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Copy state
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const tokens = ['MSQ', 'KWT', 'SUT', 'P2UC'];
  const limit = 10; // Top 10 per category

  // Convert timeRange to hours for API calls
  const getHoursFromTimeRange = (range: TimeRange): number | undefined => {
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
        return undefined; // No time filter
      default:
        return 168;
    }
  };

  // Fetch all categories in parallel
  const fetchAllCategories = useCallback(async () => {
    // Set all loading states to true
    setLoadingStates({
      rankings: true,
      whales: true,
      active: true,
      suspicious: true,
    });

    try {
      const params = new URLSearchParams();
      params.append('token', selectedToken);

      // Add hours filter based on time range
      const hours = getHoursFromTimeRange(timeRange);
      if (hours !== undefined) {
        params.append('hours', hours.toString());
      }

      params.append('limit', limit.toString());

      // Fetch all categories in parallel
      const [rankingsRes, whalesRes, activeRes, suspiciousRes] =
        await Promise.all([
          fetch(`${API_BASE_URL}/addresses/rankings?${params}`),
          fetch(`${API_BASE_URL}/addresses/whales?${params}`),
          fetch(`${API_BASE_URL}/addresses/active-traders?${params}`),
          fetch(`${API_BASE_URL}/addresses/suspicious?${params}`),
        ]);

      // Parse all responses in parallel
      const [rankingsData, whalesData, activeData, suspiciousData] =
        await Promise.all([
          rankingsRes.json(),
          whalesRes.json(),
          activeRes.json(),
          suspiciousRes.json(),
        ]);

      // Update each category's data
      setRankingsData(rankingsData.data || []);
      setWhalesData(whalesData.data || []);
      setActiveData(activeData.data || []);
      setSuspiciousData(suspiciousData.data || []);
    } catch (error) {
      logger.error('Failed to fetch addresses:', error);
      // Reset all data on error
      setRankingsData([]);
      setWhalesData([]);
      setActiveData([]);
      setSuspiciousData([]);
    } finally {
      // Set all loading states to false
      setLoadingStates({
        rankings: false,
        whales: false,
        active: false,
        suspicious: false,
      });
    }
  }, [selectedToken, timeRange]);

  // Fetch all categories when filters change
  useEffect(() => {
    fetchAllCategories();
  }, [fetchAllCategories]);

  // Handle time range change
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  // Handle address click to show details
  const handleAddressClick = useCallback(
    async (address: string) => {
      setIsModalLoading(true);
      try {
        // Convert local timeRange to UtilTimeRange (simplified mapping)
        const utilTimeRange: UtilTimeRange =
          timeRange === '1h' ||
          timeRange === '24h' ||
          timeRange === '7d' ||
          timeRange === '30d'
            ? timeRange
            : '24h'; // Default to 24h for custom ranges

        const detailedData = await fetchAddressDetails(
          address,
          selectedToken,
          utilTimeRange
        );
        setSelectedAddressData(detailedData);
      } catch (error) {
        logger.error('Failed to fetch address details:', error);
      } finally {
        setIsModalLoading(false);
      }
    },
    [selectedToken, timeRange]
  );

  // Handle transaction pagination in modal
  const handleFetchModalTransactions = useCallback(
    async (page: number, filter?: string) => {
      if (!selectedAddressData?.identifier) {
        return { transactions: [], pagination: {} };
      }

      // Convert local timeRange to UtilTimeRange
      const utilTimeRange: UtilTimeRange =
        timeRange === '1h' ||
        timeRange === '24h' ||
        timeRange === '7d' ||
        timeRange === '30d'
          ? timeRange
          : '24h';

      return fetchTransactionsPage(
        selectedAddressData.identifier,
        page,
        selectedToken,
        utilTimeRange,
        filter
      );
    },
    [selectedAddressData?.identifier, selectedToken, timeRange]
  );

  const closeModal = useCallback(() => {
    setSelectedAddressData(null);
  }, []);

  // Handle copy address to clipboard
  const handleCopyAddress = useCallback(
    (address: string, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent row click event
      navigator.clipboard.writeText(address).then(() => {
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
      });
    },
    []
  );

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl lg:text-3xl font-bold text-white'>
            Address Analytics
          </h1>
          <p className='text-white/60 text-sm mt-1'>
            Explore and analyze blockchain addresses
          </p>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <Calendar className='w-4 h-4 text-white/60' />
          <span className='text-sm text-white/60'>Time Range:</span>
          <div className='flex gap-1 flex-wrap'>
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
                              : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Token Selection */}
      <div className='flex flex-wrap gap-2'>
        {tokens.map(token => (
          <button
            key={token}
            onClick={() => setSelectedToken(token)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              selectedToken === token
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            )}
          >
            {token}
          </button>
        ))}
      </div>

      {/* 4-Box Grid Layout */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Top Rankings */}
        <AddressCategoryBox
          title='Top Rankings'
          icon={<TrendingUp className='w-5 h-5' />}
          iconColor='text-primary-400'
          addresses={rankingsData}
          isLoading={loadingStates.rankings}
          selectedToken={selectedToken}
          onAddressClick={handleAddressClick}
          onCopyAddress={handleCopyAddress}
          copiedAddress={copiedAddress}
          limit={10}
        />

        {/* Whales */}
        <AddressCategoryBox
          title='Whales'
          icon={<Wallet className='w-5 h-5' />}
          iconColor='text-purple-400'
          addresses={whalesData}
          isLoading={loadingStates.whales}
          selectedToken={selectedToken}
          onAddressClick={handleAddressClick}
          onCopyAddress={handleCopyAddress}
          copiedAddress={copiedAddress}
          limit={10}
        />

        {/* Active Traders */}
        <AddressCategoryBox
          title='Active Traders'
          icon={<Activity className='w-5 h-5' />}
          iconColor='text-green-400'
          addresses={activeData}
          isLoading={loadingStates.active}
          selectedToken={selectedToken}
          onAddressClick={handleAddressClick}
          onCopyAddress={handleCopyAddress}
          copiedAddress={copiedAddress}
          limit={10}
        />

        {/* Suspicious Addresses */}
        <AddressCategoryBox
          title='Suspicious'
          icon={<AlertTriangle className='w-5 h-5' />}
          iconColor='text-red-400'
          addresses={suspiciousData}
          isLoading={loadingStates.suspicious}
          selectedToken={selectedToken}
          onAddressClick={handleAddressClick}
          onCopyAddress={handleCopyAddress}
          copiedAddress={copiedAddress}
          limit={10}
        />
      </div>

      {/* Address Detail Modal */}
      <DetailedAnalysisModal
        isOpen={!!selectedAddressData || isModalLoading}
        onClose={closeModal}
        data={selectedAddressData}
        loading={isModalLoading}
        onFetchTransactions={handleFetchModalTransactions}
      />
    </div>
  );
}
