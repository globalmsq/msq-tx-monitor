import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { cn } from '../utils/cn';
import { formatVolume, formatAddress } from '@msq-tx-monitor/msq-common';

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
  };
  transactions: DetailedTransaction[];
  trends: TrendDataPoint[];
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
  value: number;
  volume: string;
}

interface DetailedAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DetailedData | null;
  loading?: boolean;
}

export function DetailedAnalysisModal({
  isOpen,
  onClose,
  data,
  loading = false,
}: DetailedAnalysisModalProps) {
  const [activeView, setActiveView] = useState<
    'summary' | 'transactions' | 'trends'
  >('summary');
  const [transactionFilter, setTransactionFilter] = useState<
    'all' | 'success' | 'failed' | 'high-risk'
  >('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen) {
      setActiveView('summary');
      setCurrentPage(1);
      setTransactionFilter('all');
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  // Helper function for consistent volume formatting (1 decimal place)
  const formatVolumeHelper = (volume: string, tokenSymbol?: string) => {
    return formatVolume(volume, tokenSymbol, {
      precision: 1,
      showSymbol: false,
    });
  };

  // Helper function for consistent address formatting
  const formatAddressHelper = (address: string) => {
    return formatAddress(address);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getFilteredTransactions = () => {
    if (!data?.transactions) return [];

    return data.transactions.filter(tx => {
      switch (transactionFilter) {
        case 'success':
          return tx.status === 'success';
        case 'failed':
          return tx.status === 'failed';
        case 'high-risk':
          return (tx.riskScore || 0) > 0.7;
        default:
          return true;
      }
    });
  };

  const getPaginatedTransactions = () => {
    const filtered = getFilteredTransactions();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = Math.ceil(getFilteredTransactions().length / itemsPerPage);

  const handleCopyAddress = async () => {
    if (!data?.identifier) return;

    try {
      await navigator.clipboard.writeText(data.identifier);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
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
      `Transaction Count,${data.summary.transactionCount}`,
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

  if (loading) {
    return (
      <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center'>
        <div className='bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4'>
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

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
      <div className='bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden'>
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
                  {copied ? (
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
                {copied && (
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
                <div className='bg-white/5 rounded-lg p-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <TrendingUp className='w-4 h-4 text-primary-400' />
                    <span className='text-white/60 text-sm'>Total Volume</span>
                  </div>
                  <div className='text-white font-bold text-lg'>
                    {formatVolumeHelper(
                      data.summary.totalVolume,
                      data.summary.tokenSymbol ||
                        data.transactions?.[0]?.tokenSymbol
                    )}
                    {data.summary.tokenSymbol && (
                      <span className='text-white/60 text-sm ml-1'>
                        {data.summary.tokenSymbol}
                      </span>
                    )}
                  </div>
                </div>

                <div className='bg-white/5 rounded-lg p-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Activity className='w-4 h-4 text-blue-400' />
                    <span className='text-white/60 text-sm'>Transactions</span>
                  </div>
                  <div className='text-white font-bold text-lg'>
                    {data.summary.transactionCount.toLocaleString()}
                  </div>
                </div>

                {data.summary.uniqueAddresses !== undefined && (
                  <div className='bg-white/5 rounded-lg p-4'>
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
                  <div className='bg-white/5 rounded-lg p-4'>
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
                <div className='bg-white/5 rounded-lg p-4'>
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
                      );
                      setCurrentPage(1);
                    }}
                    className='bg-white/10 text-white text-sm rounded px-3 py-1 border border-white/20'
                  >
                    <option value='all'>All Transactions</option>
                    <option value='success'>Successful Only</option>
                    <option value='failed'>Failed Only</option>
                    <option value='high-risk'>High Risk Only</option>
                  </select>
                </div>

                <div className='text-white/60 text-sm'>
                  {getFilteredTransactions().length} transactions
                </div>
              </div>

              {/* Transactions Table */}
              <div className='bg-white/5 rounded-lg overflow-hidden'>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-white/10'>
                      <tr>
                        <th className='text-left p-3 text-white/60 font-medium'>
                          Hash
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
                          Value
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
                      {getPaginatedTransactions().map((tx, _index) => (
                        <tr
                          key={tx.hash}
                          className='border-b border-white/10 hover:bg-white/5'
                        >
                          <td className='p-3'>
                            <span className='font-mono text-white text-sm'>
                              {formatAddress(tx.hash)}
                            </span>
                          </td>
                          <td className='p-3 text-white/70 text-sm'>
                            {formatTime(tx.timestamp)}
                          </td>
                          <td className='p-3'>
                            <span className='font-mono text-white/70 text-sm'>
                              {formatAddressHelper(tx.from)}
                            </span>
                          </td>
                          <td className='p-3'>
                            <span className='font-mono text-white/70 text-sm'>
                              {formatAddressHelper(tx.to)}
                            </span>
                          </td>
                          <td className='p-3'>
                            <div className='text-white text-sm'>
                              {formatVolumeHelper(tx.value, tx.tokenSymbol)}{' '}
                              {tx.tokenSymbol}
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
                              <span className='text-white/40 text-xs'>N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
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
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className='px-3 py-1 text-sm text-white/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
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
              <div className='text-center text-white/60 py-12'>
                <TrendingUp className='w-12 h-12 mx-auto mb-4 opacity-50' />
                <p>Trend analysis visualization coming soon</p>
                <p className='text-sm mt-2'>
                  This will show time-series data for the selected {data.type}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
