import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  TrendingUp,
  Calendar,
  Activity,
  Users,
  Filter,
  Download,
  Info,
  Copy,
  Check,
  ExternalLink,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { formatVolume, formatAddress } from '@msq-tx-monitor/msq-common';
import { VolumeWithTooltip } from './VolumeWithTooltip';
import { TrendChart } from './TrendChart';

export interface DetailedData {
  type: 'address' | 'token' | 'timeperiod' | 'anomaly';
  title: string;
  identifier: string;
  timeRange?: {
    start: string;
    end: string;
  };
  summary: {
    totalVolume: string;
    transactionCount: number;
    uniqueAddresses?: number;
    riskScore?: number;
    tokenSymbol?: string; // Token context for proper volume formatting
    totalSent?: string;
    totalReceived?: string;
    sentTransactions?: number;
    receivedTransactions?: number;
  };
  transactions: DetailedTransaction[];
  trends: TrendDataPoint[];
  // Pagination metadata for API-based fetching
  paginationMeta?: {
    totalTransactions: number;
    currentToken?: string;
    apiEndpoint?: string;
  };
}

interface DetailedTransaction {
  hash: string;
  timestamp: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  gasUsed: string;
  gasPrice: string;
  status: 'success' | 'failed';
  riskScore?: number;
}

interface TrendDataPoint {
  timestamp: string;
  transactionCount: number;
  volume: string;
  sentCount: number;
  receivedCount: number;
  sentVolume: string;
  receivedVolume: string;
  avgAnomalyScore: number;
}

interface DetailedAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DetailedData | null;
  loading?: boolean;
  onFetchTransactions?: (
    page: number,
    filter?: string
  ) => Promise<{ transactions: DetailedTransaction[]; pagination: any }>;
}

export const DetailedAnalysisModal = React.memo(function DetailedAnalysisModal({
  isOpen,
  onClose,
  data,
  loading = false,
  onFetchTransactions,
}: DetailedAnalysisModalProps) {
  const [activeView, setActiveView] = useState<
    'summary' | 'transactions' | 'trends'
  >('summary');
  const [transactionFilter, setTransactionFilter] = useState<
    'all' | 'success' | 'failed' | 'high-risk' | 'received' | 'sent'
  >('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedItems, setCopiedItems] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [allTransactions, setAllTransactions] = useState<DetailedTransaction[]>(
    []
  );
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [paginationData, setPaginationData] = useState<any>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen) {
      setActiveView('summary');
      setCurrentPage(1);
      setTransactionFilter('all');
      // Initialize with provided transactions or empty array
      setAllTransactions(data?.transactions || []);
    }
  }, [isOpen, data?.identifier]);

  // Refetch transactions when filter changes
  useEffect(() => {
    if (!isOpen || !onFetchTransactions || !data?.identifier) return;

    const fetchFilteredTransactions = async () => {
      setIsLoadingPage(true);
      try {
        const filterParam =
          transactionFilter === 'all' ? undefined : transactionFilter;
        const result = await onFetchTransactions(1, filterParam);
        setAllTransactions(result.transactions);
        setPaginationData(result.pagination);
        setCurrentPage(1);
      } catch (error) {
        console.error('Failed to fetch filtered transactions:', error);
      } finally {
        setIsLoadingPage(false);
      }
    };

    fetchFilteredTransactions();
  }, [transactionFilter, isOpen, data?.identifier]);

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // Convert getFilteredTransactions to useCallback to maintain hooks order
  // Must be defined before early return to follow React's Rules of Hooks
  const getFilteredTransactions = useCallback(() => {
    // If we have API filtering capability, transactions are already filtered
    if (onFetchTransactions && data?.paginationMeta?.apiEndpoint) {
      return allTransactions;
    }

    // Otherwise, apply client-side filtering (legacy fallback)
    return allTransactions.filter(tx => {
      switch (transactionFilter) {
        case 'success':
          return tx.status === 'success';
        case 'failed':
          return tx.status === 'failed';
        case 'high-risk':
          return (tx.riskScore || 0) > 0.7;
        case 'received':
          return (
            data?.identifier &&
            tx.to.toLowerCase() === data.identifier.toLowerCase()
          );
        case 'sent':
          return (
            data?.identifier &&
            tx.from.toLowerCase() === data.identifier.toLowerCase()
          );
        default:
          return true;
      }
    });
  }, [
    allTransactions,
    transactionFilter,
    data?.identifier,
    !!onFetchTransactions,
    !!data?.paginationMeta?.apiEndpoint,
  ]);

  // Calculate total pages dynamically based on filter state
  // Must be defined before early return to follow React's Rules of Hooks
  const totalPages = useMemo(() => {
    // If we have pagination data from API, use it
    if (paginationData && paginationData.totalPages !== undefined) {
      return paginationData.totalPages;
    }

    // If using server-side filtering with API but no pagination data yet
    if (onFetchTransactions && data?.paginationMeta?.apiEndpoint) {
      if (
        data?.paginationMeta?.totalTransactions &&
        transactionFilter === 'all'
      ) {
        return Math.ceil(data.paginationMeta.totalTransactions / itemsPerPage);
      }
      // Default to at least 1 page
      return 1;
    }

    // For client-side filtering (legacy) - calculate directly without calling getFilteredTransactions
    let filteredCount = allTransactions.length;

    if (transactionFilter !== 'all') {
      filteredCount = allTransactions.filter(tx => {
        switch (transactionFilter) {
          case 'success':
            return tx.status === 'success';
          case 'failed':
            return tx.status === 'failed';
          case 'high-risk':
            return (tx.riskScore || 0) > 0.7;
          case 'received':
            return (
              data?.identifier &&
              tx.to.toLowerCase() === data.identifier.toLowerCase()
            );
          case 'sent':
            return (
              data?.identifier &&
              tx.from.toLowerCase() === data.identifier.toLowerCase()
            );
          default:
            return true;
        }
      }).length;
    }

    return Math.max(1, Math.ceil(filteredCount / itemsPerPage));
  }, [
    paginationData,
    transactionFilter,
    data?.paginationMeta,
    data?.identifier,
    allTransactions,
    onFetchTransactions,
    itemsPerPage,
  ]);

  // Helper function for consistent volume formatting (no decimals)
  const formatVolumeHelper = useCallback(
    (volume: string, tokenSymbol?: string) => {
      return formatVolume(volume, tokenSymbol, {
        precision: 0,
        showSymbol: false,
      });
    },
    []
  );

  // Helper function for consistent address formatting
  const formatAddressHelper = useCallback((address: string) => {
    return formatAddress(address);
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return `${diffSecs} ${diffSecs === 1 ? 'sec' : 'secs'} ago`;
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} ago`;
    } else if (diffDays < 30) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return time.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const formatFullTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const getTimeRangeLabel = (start: string, end: string): string => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMs = endTime - startTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours <= 1) return '1h';
    if (diffHours <= 24) return '24h';
    if (diffDays <= 7) return '7 days';
    if (diffDays <= 30) return '30 days';
    return `${Math.round(diffDays)} days`;
  };

  // Fetch transactions for a specific page
  const handlePageChange = async (newPage: number) => {
    // Use API pagination if available
    if (onFetchTransactions && data?.paginationMeta?.apiEndpoint) {
      setIsLoadingPage(true);
      try {
        const filterParam =
          transactionFilter === 'all' ? undefined : transactionFilter;
        const result = await onFetchTransactions(newPage, filterParam);
        setAllTransactions(result.transactions);
        setPaginationData(result.pagination);
        setCurrentPage(newPage);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setIsLoadingPage(false);
      }
    } else {
      // When no API pagination, use local pagination
      setCurrentPage(newPage);
    }
  };

  const getPaginatedTransactions = () => {
    const filtered = getFilteredTransactions();

    // If using API pagination, transactions are already paginated from API (regardless of filter)
    if (onFetchTransactions && data?.paginationMeta?.apiEndpoint) {
      return filtered;
    }

    // Only use local pagination when no API pagination is available
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  const handleCopyAddress = async () => {
    if (!data?.identifier) return;

    try {
      await navigator.clipboard.writeText(data.identifier);
      setCopiedItems({ ...copiedItems, mainAddress: true });
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, mainAddress: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleCopyItem = async (text: string, itemKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems({ ...copiedItems, [itemKey]: true });
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemKey]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenPolygonscan = () => {
    if (!data?.identifier) return;

    const polygonscanUrl = `https://polygonscan.com/address/${data.identifier}`;
    window.open(polygonscanUrl, '_blank', 'noopener,noreferrer');
  };

  const handleExportDetailed = () => {
    if (!data) return;

    const csvLines = [
      'MSQ Transaction Monitor - Detailed Analysis Export',
      `Type: ${data.type}`,
      `Identifier: ${data.identifier}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'Summary',
      `Total Volume,${data.summary.totalVolume}`,
      data.summary.totalReceived
        ? `Total Received,${data.summary.totalReceived}`
        : '',
      data.summary.totalSent ? `Total Sent,${data.summary.totalSent}` : '',
      `Transaction Count,${data.summary.transactionCount}`,
      data.summary.receivedTransactions
        ? `Received Transactions,${data.summary.receivedTransactions}`
        : '',
      data.summary.sentTransactions
        ? `Sent Transactions,${data.summary.sentTransactions}`
        : '',
      data.summary.uniqueAddresses
        ? `Unique Addresses,${data.summary.uniqueAddresses}`
        : '',
      data.summary.riskScore
        ? `Risk Score,${(data.summary.riskScore * 100).toFixed(1)}%`
        : '',
      '',
      'Transactions',
      'Hash,Timestamp,From,To,Value,Token,Gas Used,Gas Price,Status,Risk Score',
    ];

    data.transactions.forEach(tx => {
      csvLines.push(
        [
          tx.hash,
          tx.timestamp,
          tx.from,
          tx.to,
          tx.value,
          tx.tokenSymbol,
          tx.gasUsed,
          tx.gasPrice,
          tx.status,
          tx.riskScore ? (tx.riskScore * 100).toFixed(1) + '%' : 'N/A',
        ].join(',')
      );
    });

    const csvContent = csvLines.join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `detailed-analysis-${data.type}-${Date.now()}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center'>
        <div className='bg-gray-700 rounded-2xl p-6 max-w-md w-full mx-4'>
          <div className='flex items-center justify-center'>
            <div className='w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin' />
            <span className='ml-3 text-white'>
              Loading detailed analysis...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  const modalContent = (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4'>
      <div className='bg-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-white/10'>
          <div className='flex-1'>
            <h2 className='text-xl font-bold text-white'>{data.title}</h2>
            {data.type === 'address' && data.identifier && (
              <div className='flex items-center gap-2 mt-2'>
                <span className='text-sm text-gray-400 font-mono break-all'>
                  {data.identifier}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className='flex-shrink-0 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all'
                  title='Copy address'
                >
                  {copiedItems.mainAddress ? (
                    <Check className='w-4 h-4 text-green-400' />
                  ) : (
                    <Copy className='w-4 h-4' />
                  )}
                </button>
                <button
                  onClick={handleOpenPolygonscan}
                  className='flex-shrink-0 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all'
                  title='View on Polygonscan'
                >
                  <ExternalLink className='w-4 h-4' />
                </button>
                {copiedItems.mainAddress && (
                  <span className='text-xs text-green-400'>Copied!</span>
                )}
              </div>
            )}
          </div>
          <div className='flex items-center gap-2 ml-4'>
            <button
              onClick={handleExportDetailed}
              className='p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors'
            >
              <Download className='w-5 h-5' />
            </button>
            <button
              onClick={onClose}
              className='p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors'
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className='flex border-b border-white/10'>
          {[
            {
              key: 'summary',
              label: 'Summary',
              icon: <Activity className='w-4 h-4' />,
            },
            {
              key: 'transactions',
              label: 'Transactions',
              icon: <TrendingUp className='w-4 h-4' />,
            },
            {
              key: 'trends',
              label: 'Trends',
              icon: <Calendar className='w-4 h-4' />,
            },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveView(tab.key as 'summary' | 'transactions' | 'trends')
              }
              className={cn(
                'flex items-center gap-2 px-6 py-3 transition-colors',
                activeView === tab.key
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-white/60 hover:text-white'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className='p-6 overflow-y-auto max-h-[calc(90vh-200px)]'>
          {activeView === 'summary' && (
            <div className='space-y-6'>
              {/* Summary Cards */}
              <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                <div className='bg-white/20 rounded-lg p-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <TrendingUp className='w-4 h-4 text-primary-400' />
                    <span className='text-white/60 text-sm'>Total Volume</span>
                  </div>
                  <div className='text-white font-bold text-lg'>
                    <VolumeWithTooltip
                      formattedValue={formatVolumeHelper(
                        data.summary.totalVolume,
                        data.summary.tokenSymbol ||
                          data.transactions?.[0]?.tokenSymbol
                      )}
                      rawValue={data.summary.totalVolume}
                      tokenSymbol={
                        data.summary.tokenSymbol ||
                        data.transactions?.[0]?.tokenSymbol
                      }
                      receivedValue={data.summary.totalReceived}
                      sentValue={data.summary.totalSent}
                      showBreakdown={
                        !!(
                          data.summary.totalReceived !== undefined &&
                          data.summary.totalSent !== undefined
                        )
                      }
                    />
                    {data.summary.tokenSymbol && (
                      <span className='text-white/60 text-sm ml-1'>
                        {data.summary.tokenSymbol}
                      </span>
                    )}
                  </div>
                  {data.summary.totalReceived !== undefined &&
                    data.summary.totalSent !== undefined && (
                    <div className='flex items-center gap-3 mt-2 text-xs text-white/60'>
                      <div className='flex items-center gap-1'>
                        <ArrowDown size={12} className='text-blue-400' />
                        <span>
                          {formatVolumeHelper(
                            data.summary.totalReceived,
                            data.summary.tokenSymbol ||
                              data.transactions?.[0]?.tokenSymbol
                          )}
                        </span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <ArrowUp size={12} className='text-orange-400' />
                        <span>
                          {formatVolumeHelper(
                            data.summary.totalSent,
                            data.summary.tokenSymbol ||
                              data.transactions?.[0]?.tokenSymbol
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className='bg-white/20 rounded-lg p-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Activity className='w-4 h-4 text-blue-400' />
                    <span className='text-white/60 text-sm'>Transactions</span>
                  </div>
                  <div className='text-white font-bold text-lg'>
                    {data.summary.transactionCount.toLocaleString()}
                  </div>
                  {data.summary.sentTransactions !== undefined &&
                    data.summary.receivedTransactions !== undefined &&
                    (data.summary.sentTransactions > 0 ||
                      data.summary.receivedTransactions > 0) && (
                      <div className='flex items-center gap-3 mt-2 text-xs text-white/60'>
                        <div className='flex items-center gap-1'>
                          <ArrowDown size={12} className='text-blue-400' />
                          <span>
                            {data.summary.receivedTransactions.toLocaleString()}
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <ArrowUp size={12} className='text-orange-400' />
                          <span>
                            {data.summary.sentTransactions.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                </div>

                {data.summary.uniqueAddresses !== undefined && (
                  <div className='bg-white/20 rounded-lg p-4'>
                    <div className='flex items-center gap-2 mb-2'>
                      <Users className='w-4 h-4 text-green-400' />
                      <span className='text-white/60 text-sm flex items-center gap-1'>
                        Unique Addresses
                        <div className='relative group inline-flex'>
                          <Info className='w-3 h-3 text-white/40 cursor-help' />
                          <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10'>
                            Number of unique addresses that have interacted with
                            this address
                            <div className='absolute top-full left-1/2 transform -translate-x-1/2 -mt-1'>
                              <div className='border-4 border-transparent border-t-gray-800'></div>
                            </div>
                          </div>
                        </div>
                      </span>
                    </div>
                    <div className='text-white font-bold text-lg'>
                      {data.summary.uniqueAddresses.toLocaleString()}
                    </div>
                  </div>
                )}

                {data.summary.riskScore !== undefined && (
                  <div className='bg-white/20 rounded-lg p-4'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full',
                          data.summary.riskScore > 0.7
                            ? 'bg-red-400'
                            : data.summary.riskScore > 0.4
                              ? 'bg-yellow-400'
                              : 'bg-green-400'
                        )}
                      />
                      <span className='text-white/60 text-sm'>Risk Score</span>
                    </div>
                    <div className='text-white font-bold text-lg'>
                      {(data.summary.riskScore * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>

              {/* Time Range */}
              {data.timeRange && (
                <div className='bg-white/20 rounded-lg p-4'>
                  <h3 className='text-white font-medium mb-3 flex items-center gap-2'>
                    <Calendar className='w-4 h-4' />
                    Time Range
                    <span className='ml-auto px-2 py-1 bg-primary-400/20 text-primary-400 text-xs font-bold rounded'>
                      {getTimeRangeLabel(
                        data.timeRange.start,
                        data.timeRange.end
                      )}
                    </span>
                  </h3>
                  <div className='text-white/70'>
                    <p>
                      {formatTime(data.timeRange.start)} ~{' '}
                      {formatTime(data.timeRange.end)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeView === 'transactions' && (
            <div className='space-y-4'>
              {/* Filter Controls */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Filter className='w-4 h-4 text-white/60' />
                  <span className='text-white/60 text-sm'>Filter:</span>
                  <select
                    value={transactionFilter}
                    onChange={e => {
                      setTransactionFilter(
                        e.target.value as
                          | 'all'
                          | 'success'
                          | 'failed'
                          | 'high-risk'
                          | 'received'
                          | 'sent'
                      );
                      setCurrentPage(1);
                    }}
                    className='bg-white/10 text-white text-sm rounded px-3 py-1 border border-white/20'
                  >
                    <option value='all'>All Transactions</option>
                    <option value='success'>Successful Only</option>
                    <option value='failed'>Failed Only</option>
                    <option value='high-risk'>High Risk Only</option>
                    <option value='received'>Received Only</option>
                    <option value='sent'>Sent Only</option>
                  </select>
                </div>

                <div className='text-white/60 text-sm'>
                  {paginationData?.total !== undefined
                    ? `${paginationData.total.toLocaleString()} transactions`
                    : transactionFilter === 'all'
                      ? `${(data?.paginationMeta?.totalTransactions || data?.summary.transactionCount || 0).toLocaleString()} transactions`
                      : `${getFilteredTransactions().length.toLocaleString()} transactions`}
                </div>
              </div>

              {/* Transactions Table */}
              <div className='bg-white/20 rounded-lg overflow-hidden relative'>
                {isLoadingPage && (
                  <div className='absolute inset-0 bg-black/20 flex items-center justify-center z-10'>
                    <div className='w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin' />
                  </div>
                )}
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-white/30'>
                      <tr>
                        <th className='text-left p-3 text-white/60 font-medium'>
                          txHash
                        </th>
                        <th className='text-left p-3 text-white/60 font-medium'>
                          Time
                        </th>
                        <th className='text-left p-3 text-white/60 font-medium'>
                          From
                        </th>
                        <th className='text-left p-3 text-white/60 font-medium'>
                          To
                        </th>
                        <th className='text-left p-3 text-white/60 font-medium'>
                          Amount
                        </th>
                        <th className='text-left p-3 text-white/60 font-medium'>
                          Status
                        </th>
                        <th className='text-left p-3 text-white/60 font-medium'>
                          Risk
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedTransactions().length === 0 ? (
                        <tr>
                          <td colSpan={7} className='p-8 text-center'>
                            <div className='text-white/60'>
                              <div className='text-lg mb-2'>
                                No transactions found
                              </div>
                              <div className='text-sm'>
                                {transactionFilter !== 'all'
                                  ? 'Try changing the filter or selecting a different time period'
                                  : 'This address has no transactions in the selected time period'}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        getPaginatedTransactions().map((tx, index) => {
                          const txKey = `${tx.hash}_${index}`;
                          return (
                            <tr
                              key={tx.hash}
                              className='border-b border-white/20 hover:bg-white/20'
                            >
                              <td className='p-3'>
                                <div className='flex items-center gap-2'>
                                  <span className='font-mono text-white text-sm'>
                                    {formatAddress(tx.hash)}
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleCopyItem(tx.hash, `hash_${txKey}`)
                                    }
                                    className='p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all'
                                    title='Copy transaction hash'
                                  >
                                    {copiedItems[`hash_${txKey}`] ? (
                                      <Check className='w-3 h-3 text-green-400' />
                                    ) : (
                                      <Copy className='w-3 h-3' />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className='p-3'>
                                <div className='relative inline-block group'>
                                  <span className='text-white/70 text-sm cursor-help'>
                                    {getRelativeTime(tx.timestamp)}
                                  </span>
                                  <div className='absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10'>
                                    {formatFullTime(tx.timestamp)}
                                    <div className='absolute top-full left-4 -mt-1'>
                                      <div className='border-4 border-transparent border-t-gray-800'></div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className='p-3'>
                                <div className='flex items-center gap-2'>
                                  <span
                                    className={cn(
                                      'font-mono text-sm',
                                      tx.from.toLowerCase() ===
                                        data?.identifier?.toLowerCase()
                                        ? 'text-primary-400 font-bold'
                                        : 'text-white/70'
                                    )}
                                  >
                                    {formatAddressHelper(tx.from)}
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleCopyItem(tx.from, `from_${txKey}`)
                                    }
                                    className='p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all'
                                    title='Copy from address'
                                  >
                                    {copiedItems[`from_${txKey}`] ? (
                                      <Check className='w-3 h-3 text-green-400' />
                                    ) : (
                                      <Copy className='w-3 h-3' />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className='p-3'>
                                <div className='flex items-center gap-2'>
                                  <span
                                    className={cn(
                                      'font-mono text-sm',
                                      tx.to.toLowerCase() ===
                                        data?.identifier?.toLowerCase()
                                        ? 'text-primary-400 font-bold'
                                        : 'text-white/70'
                                    )}
                                  >
                                    {formatAddressHelper(tx.to)}
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleCopyItem(tx.to, `to_${txKey}`)
                                    }
                                    className='p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all'
                                    title='Copy to address'
                                  >
                                    {copiedItems[`to_${txKey}`] ? (
                                      <Check className='w-3 h-3 text-green-400' />
                                    ) : (
                                      <Copy className='w-3 h-3' />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className='p-3'>
                                <div className='text-white text-sm'>
                                  <VolumeWithTooltip
                                    formattedValue={formatVolumeHelper(
                                      tx.value,
                                      tx.tokenSymbol
                                    )}
                                    rawValue={tx.value}
                                    tokenSymbol={tx.tokenSymbol}
                                  />
                                </div>
                              </td>
                              <td className='p-3'>
                                <span
                                  className={cn(
                                    'px-2 py-1 rounded text-xs font-medium',
                                    tx.status === 'success'
                                      ? 'bg-green-500/20 text-green-400'
                                      : 'bg-red-500/20 text-red-400'
                                  )}
                                >
                                  {tx.status}
                                </span>
                              </td>
                              <td className='p-3'>
                                {tx.riskScore ? (
                                  <span
                                    className={cn(
                                      'px-2 py-1 rounded text-xs font-medium',
                                      tx.riskScore > 0.7
                                        ? 'bg-red-500/20 text-red-400'
                                        : tx.riskScore > 0.4
                                          ? 'bg-yellow-500/20 text-yellow-400'
                                          : 'bg-green-500/20 text-green-400'
                                    )}
                                  >
                                    {(tx.riskScore * 100).toFixed(0)}%
                                  </span>
                                ) : (
                                  <span className='text-white/40 text-xs'>
                                    N/A
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='flex items-center justify-between p-4 border-t border-white/10'>
                    <div className='text-white/60 text-sm'>
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className='flex gap-2'>
                      <button
                        onClick={() =>
                          handlePageChange(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1 || isLoadingPage}
                        className='px-3 py-1 text-sm text-white/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          handlePageChange(
                            Math.min(totalPages, currentPage + 1)
                          )
                        }
                        disabled={currentPage === totalPages || isLoadingPage}
                        className='px-3 py-1 text-sm text-white/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'trends' && (
            <div className='space-y-4'>
              {data.trends && data.trends.length > 0 ? (
                <>
                  {/* Summary Statistics */}
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
                    <div className='bg-gray-800/50 rounded-lg p-4'>
                      <div className='text-white/60 text-xs mb-1'>
                        Total Volume
                      </div>
                      <div className='text-white text-lg font-semibold'>
                        {(() => {
                          const tokenSymbol = data.summary.tokenSymbol || 'MSQ';
                          const totalVol = data.trends
                            .reduce(
                              (sum, t) => sum + BigInt(t.volume || 0),
                              BigInt(0)
                            )
                            .toString();
                          const totalSent = data.trends
                            .reduce(
                              (sum, t) => sum + BigInt(t.sentVolume || 0),
                              BigInt(0)
                            )
                            .toString();
                          const totalReceived = data.trends
                            .reduce(
                              (sum, t) => sum + BigInt(t.receivedVolume || 0),
                              BigInt(0)
                            )
                            .toString();
                          return (
                            <VolumeWithTooltip
                              formattedValue={formatVolumeHelper(
                                totalVol,
                                tokenSymbol
                              )}
                              rawValue={totalVol}
                              tokenSymbol={tokenSymbol}
                              receivedValue={totalReceived}
                              sentValue={totalSent}
                              showBreakdown={true}
                            />
                          );
                        })()}
                      </div>
                      {/* Add received/sent breakdown display */}
                      {(() => {
                        const tokenSymbol = data.summary.tokenSymbol || 'MSQ';
                        const totalSent = data.trends
                          .reduce(
                            (sum, t) => sum + BigInt(t.sentVolume || 0),
                            BigInt(0)
                          )
                          .toString();
                        const totalReceived = data.trends
                          .reduce(
                            (sum, t) => sum + BigInt(t.receivedVolume || 0),
                            BigInt(0)
                          )
                          .toString();

                        return (
                          <div className='flex items-center gap-3 mt-2 text-xs text-white/60'>
                            <div className='flex items-center gap-1'>
                              <ArrowDown size={12} className='text-blue-400' />
                              <span>
                                {formatVolumeHelper(totalReceived, tokenSymbol)}
                              </span>
                            </div>
                            <div className='flex items-center gap-1'>
                              <ArrowUp size={12} className='text-orange-400' />
                              <span>
                                {formatVolumeHelper(totalSent, tokenSymbol)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className='bg-gray-800/50 rounded-lg p-4'>
                      <div className='text-white/60 text-xs mb-1'>
                        Transactions
                      </div>
                      <div className='text-white text-lg font-semibold'>
                        {data.trends
                          .reduce((sum, t) => sum + t.transactionCount, 0)
                          .toLocaleString()}
                      </div>
                      {/* Add received/sent transaction count breakdown */}
                      {(() => {
                        const totalSentCount = data.trends.reduce(
                          (sum, t) => sum + t.sentCount,
                          0
                        );
                        const totalReceivedCount = data.trends.reduce(
                          (sum, t) => sum + t.receivedCount,
                          0
                        );

                        return (
                          <div className='flex items-center gap-3 mt-2 text-xs text-white/60'>
                            <div className='flex items-center gap-1'>
                              <ArrowDown size={12} className='text-blue-400' />
                              <span>{totalReceivedCount.toLocaleString()}</span>
                            </div>
                            <div className='flex items-center gap-1'>
                              <ArrowUp size={12} className='text-orange-400' />
                              <span>{totalSentCount.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className='bg-gray-800/50 rounded-lg p-4'>
                      <div className='text-white/60 text-xs mb-1'>
                        Avg Tx/Period
                      </div>
                      <div className='text-white text-lg font-semibold'>
                        {(
                          data.trends.reduce(
                            (sum, t) => sum + t.transactionCount,
                            0
                          ) / data.trends.length
                        ).toFixed(1)}
                      </div>
                    </div>
                    <div className='bg-gray-800/50 rounded-lg p-4'>
                      <div className='text-white/60 text-xs mb-1'>
                        Avg Risk Score
                      </div>
                      <div className='text-white text-lg font-semibold'>
                        {(
                          data.trends.reduce(
                            (sum, t) => sum + t.avgAnomalyScore,
                            0
                          ) / data.trends.length
                        ).toFixed(3)}
                      </div>
                    </div>
                  </div>

                  {/* Trend Charts */}
                  <TrendChart
                    data={data.trends}
                    tokenSymbol={data.summary.tokenSymbol || 'MSQ'}
                  />
                </>
              ) : (
                <div className='text-center text-white/60 py-12'>
                  <TrendingUp className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>No trend data available for this time period</p>
                  <p className='text-sm mt-2'>
                    Try selecting a longer time range to see trends
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, modalRoot);
});
