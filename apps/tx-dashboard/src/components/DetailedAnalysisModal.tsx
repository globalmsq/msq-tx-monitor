import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  Calendar,
  Activity,
  Users,
  Filter,
  Download,
} from 'lucide-react';
import { cn } from '../utils/cn';

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
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen) {
      setActiveView('summary');
      setCurrentPage(1);
      setTransactionFilter('all');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const formatVolume = (volume: string) => {
    const num = parseFloat(volume) / 1e18;
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(4);
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
      <div className='bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-white/10'>
          <div>
            <h2 className='text-xl font-bold text-white'>{data.title}</h2>
            <p className='text-white/60 mt-1'>
              Detailed analysis for {data.type}: {data.identifier}
            </p>
          </div>
          <div className='flex items-center gap-2'>
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
              onClick={() => setActiveView(tab.key as 'summary' | 'transactions' | 'trends')}
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
                    {formatVolume(data.summary.totalVolume)}
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

                {data.summary.uniqueAddresses && (
                  <div className='bg-white/5 rounded-lg p-4'>
                    <div className='flex items-center gap-2 mb-2'>
                      <Users className='w-4 h-4 text-green-400' />
                      <span className='text-white/60 text-sm'>
                        Unique Addresses
                      </span>
                    </div>
                    <div className='text-white font-bold text-lg'>
                      {data.summary.uniqueAddresses.toLocaleString()}
                    </div>
                  </div>
                )}

                {data.summary.riskScore && (
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
                  </h3>
                  <div className='text-white/70'>
                    <p>Start: {formatTime(data.timeRange.start)}</p>
                    <p>End: {formatTime(data.timeRange.end)}</p>
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
                      setTransactionFilter(e.target.value as 'all' | 'success' | 'failed' | 'high-risk');
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
                              {formatAddress(tx.from)}
                            </span>
                          </td>
                          <td className='p-3'>
                            <span className='font-mono text-white/70 text-sm'>
                              {formatAddress(tx.to)}
                            </span>
                          </td>
                          <td className='p-3'>
                            <div className='text-white text-sm'>
                              {formatVolume(tx.value)} {tx.tokenSymbol}
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
