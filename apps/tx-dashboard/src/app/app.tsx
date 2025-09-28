import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  Activity,
  BarChart3,
  Settings,
  Wallet,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { AddressSearchInput } from '../components/filters/AddressSearchInput';
import { InitialLoadingSkeleton, LoadMoreButton, InitialStatsLoadingSkeleton } from '../components/LoadingSkeleton';
import { cn } from '../utils/cn';
import {
  TransactionProvider,
  useConnectionState,
  useTransactionData,
  useTransactionFilters,
} from '../contexts/TransactionContext';
import { Transaction } from '../types/transaction';

function ConnectionStatus() {
  const { isConnected, connectionState } = useConnectionState();

  return (
    <div className='flex items-center space-x-2 text-sm'>
      {isConnected ? (
        <>
          <Wifi className='w-4 h-4 text-green-400' />
          <span className='text-green-400'>Connected</span>
        </>
      ) : (
        <>
          <WifiOff className='w-4 h-4 text-red-400' />
          <span className='text-red-400 capitalize'>{connectionState}</span>
        </>
      )}
    </div>
  );
}


function StatsCards() {
  const { stats, isInitialLoad } = useTransactionData();
  const { filters } = useTransactionFilters();

  // Filter token stats based on selected tokens
  const filteredTokenStats = stats.tokenStats.filter(tokenStat =>
    filters.tokens.includes(tokenStat.tokenSymbol)
  );

  const generalStats = [
    {
      label: 'Total Transactions',
      value: stats.totalTransactions.toLocaleString(),
      change: stats.transactionsChange24h >= 0
        ? `+${stats.transactionsChange24h.toFixed(1)}%`
        : `${stats.transactionsChange24h.toFixed(1)}%`,
    },
    {
      label: 'Active Addresses',
      value: stats.activeAddresses.toLocaleString(),
      change: stats.addressesChange24h >= 0
        ? `+${stats.addressesChange24h.toFixed(1)}%`
        : `${stats.addressesChange24h.toFixed(1)}%`,
    },
  ];

  if (isInitialLoad) {
    return <InitialStatsLoadingSkeleton />;
  }

  return (
    <div className='space-y-6'>
      {/* General Statistics */}
      <div className='grid grid-cols-2 gap-3 lg:gap-6'>
        {generalStats.map((stat, index) => (
          <div
            key={index}
            className='glass rounded-xl lg:rounded-2xl p-4 lg:p-6 animate-fade-in'
          >
            <h3 className='text-white/70 text-xs lg:text-sm font-medium truncate'>
              {stat.label}
            </h3>
            <p className='text-lg lg:text-2xl font-bold text-white mt-1 lg:mt-2'>
              {stat.value}
            </p>
            <p
              className={cn(
                'text-xs lg:text-sm mt-1',
                stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
              )}
            >
              <span className='hidden sm:inline'>
                {stat.change} from last 24h
              </span>
              <span className='sm:hidden'>{stat.change}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Token-specific Statistics */}
      {filteredTokenStats.length > 0 && (
        <div>
          <h3 className='text-white/70 text-sm font-medium mb-3'>
            Token Statistics
          </h3>
          <div className='grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4'>
            {filteredTokenStats.map((tokenStat, _index) => (
              <div
                key={tokenStat.tokenAddress}
                className='glass rounded-xl p-4 animate-fade-in'
              >
                <h4 className='text-white font-medium text-sm mb-3 flex items-center'>
                  <span className='w-2 h-2 rounded-full bg-primary-500 mr-2'></span>
                  {tokenStat.tokenSymbol}
                </h4>
                <div className='space-y-2 text-xs'>
                  <div className='flex justify-between'>
                    <span className='text-white/60'>24h Volume:</span>
                    <span className='text-white'>{tokenStat.volume24h}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-white/60'>Total Volume:</span>
                    <span className='text-white'>{tokenStat.totalVolume}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-white/60'>Transactions:</span>
                    <span className='text-white'>
                      {tokenStat.transactionCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionFeed() {
  const {
    filteredRecentTransactions,
    isLoading,
    isInitialLoad,
    hasMore,
    loadMore,
    totalCount
  } = useTransactionData();
  const { filters, updateFilters, toggleTokenFilter } = useTransactionFilters();
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const tokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
    setIsModalOpen(false);
  };

  const handleAddressSearch = (value: string) => {
    updateFilters({ addressSearch: value });
  };

  const getFilterSummary = () => {
    const summaryParts = [];
    if (filters.addressSearch) {
      summaryParts.push(
        `Address: ${filters.addressSearch.slice(0, 10)}${filters.addressSearch.length > 10 ? '...' : ''}`
      );
    }
    if (filters.amountRange.min || filters.amountRange.max) {
      summaryParts.push(
        `Amount: ${filters.amountRange.min || '0'} - ${filters.amountRange.max || '∞'}`
      );
    }
    if (filters.timeRange.from || filters.timeRange.to) {
      summaryParts.push('Time filtered');
    }
    if (filters.riskLevel !== 'all') {
      summaryParts.push(`Risk: ${filters.riskLevel}`);
    }
    return summaryParts;
  };

  const filterSummary = getFilterSummary();

  return (
    <div className='glass rounded-2xl p-6'>
      <h2 className='text-xl font-bold text-white mb-4'>
        Live Transaction Feed
      </h2>

      {/* Token Selection */}
      <div className='mb-6'>
        <div className='flex flex-wrap gap-2'>
          {tokens.map(token => (
            <button
              key={token}
              onClick={() => toggleTokenFilter(token)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                'border border-white/10 hover:border-white/20',
                filters.tokens.length === 0 || filters.tokens.includes(token)
                  ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                  : 'bg-white/5 text-white/60 hover:text-white/80'
              )}
            >
              {token}
            </button>
          ))}
          <div className='text-xs text-white/40 flex items-center ml-2'>
            {filters.tokens.length === 0
              ? 'All tokens'
              : `${filters.tokens.length} selected`
            }
          </div>
        </div>
      </div>

      {/* Header with Search and Filters Summary */}
      <div className='flex flex-col lg:flex-row lg:items-center justify-between mb-4 space-y-3 lg:space-y-0'>
        <div className='flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4'>
          <div className='w-full sm:w-64'>
            <AddressSearchInput
              value={filters.addressSearch}
              onChange={handleAddressSearch}
              placeholder='Search by address...'
            />
          </div>
          {filterSummary.length > 0 && (
            <div className='text-sm text-white/70'>
              <span className='hidden sm:inline'>Filters: </span>
              <div className='flex flex-wrap gap-1 sm:inline'>
                {filterSummary.map((summary, index) => (
                  <span
                    key={index}
                    className='px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-xs sm:mr-1'
                  >
                    {summary}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <span className='text-sm text-white/70 whitespace-nowrap'>
          {isInitialLoad ? 'Loading...' : `${filteredRecentTransactions.length}${totalCount > filteredRecentTransactions.length ? ` of ${totalCount}` : ''} transactions`}
        </span>
      </div>

      <div className='space-y-4'>
        {isInitialLoad ? (
          <InitialLoadingSkeleton />
        ) : filteredRecentTransactions.length > 0 ? (
          <>
            {filteredRecentTransactions.map(tx => (
              <div
                key={tx.id}
                className='glass-dark rounded-lg p-4 animate-slide-up cursor-pointer hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/10'
                onClick={() => handleTransactionClick(tx)}
              >
                <div className='flex items-start sm:items-center justify-between'>
                  <div className='flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1 min-w-0'>
                    <div className='relative flex-shrink-0'>
                      <div className='w-8 sm:w-10 h-8 sm:h-10 bg-primary-500/20 rounded-lg flex items-center justify-center'>
                        <span className='text-primary-400 font-mono text-xs sm:text-sm'>
                          {tx.token}
                        </span>
                      </div>
                      {(tx.anomalyScore ?? 0) > 0.5 && (
                        <div className='absolute -top-1 -right-1 w-2.5 sm:w-3 h-2.5 sm:h-3 bg-orange-400 rounded-full border-2 border-dark-900' />
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1'>
                        <p className='text-white font-mono text-xs sm:text-sm truncate'>
                          <span className='hidden sm:inline'>
                            {tx.from.slice(0, 6)}...{tx.from.slice(-4)} →{' '}
                            {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                          </span>
                          <span className='sm:hidden'>
                            {tx.from.slice(0, 4)}...{tx.from.slice(-3)} →{' '}
                            {tx.to.slice(0, 4)}...{tx.to.slice(-3)}
                          </span>
                        </p>
                        <div
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium w-fit',
                            tx.status === 'confirmed'
                              ? 'bg-green-500/20 text-green-400'
                              : tx.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                          )}
                        >
                          {tx.status}
                        </div>
                      </div>
                      <div className='flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 text-xs text-white/60'>
                        <div className='flex items-center space-x-1'>
                          <Clock className='w-3 h-3' />
                          <span className='hidden sm:inline'>
                            {new Date(tx.timestamp).toLocaleString()}
                          </span>
                          <span className='sm:hidden'>
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {tx.anomalyScore && tx.anomalyScore > 0.3 && (
                          <div className='flex items-center space-x-1 text-orange-400'>
                            <TrendingUp className='w-3 h-3' />
                            <span>
                              Risk: {(tx.anomalyScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='text-right flex-shrink-0 ml-2'>
                    <p className='text-white font-semibold text-sm sm:text-base'>
                      {tx.value} {tx.token}
                    </p>
                    <p className='text-white/60 text-xs hidden sm:block'>
                      Block #{tx.blockNumber.toLocaleString()}
                    </p>
                    <p className='text-white/60 text-xs sm:hidden'>
                      #{tx.blockNumber.toString().slice(-6)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            <LoadMoreButton
              onLoadMore={loadMore}
              hasMore={hasMore}
              isLoading={isLoading}
            />
          </>
        ) : (
          <div className='text-center py-12'>
            <div className='w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4'>
              <Activity className='w-8 h-8 text-white/40' />
            </div>
            <p className='text-white/60 text-lg mb-2'>No transactions found</p>
            <p className='text-white/40 text-sm'>
              {filterSummary.length > 0
                ? 'No transactions match your current filters'
                : 'Waiting for new transactions...'}
            </p>
          </div>
        )}
      </div>

      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

function DashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className='min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800'>
      {/* Header */}
      <header className='glass-dark border-b border-white/10 sticky top-0 z-50'>
        <div className='container mx-auto px-4 sm:px-6 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className='p-2 text-white/70 hover:text-white transition-colors lg:hidden'
              >
                <svg
                  className='w-5 h-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 6h16M4 12h16M4 18h16'
                  />
                </svg>
              </button>
              <div className='w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center'>
                <Activity className='w-5 h-5 text-white' />
              </div>
              <h1 className='text-lg sm:text-xl font-bold text-white hidden sm:block'>
                MSQ Transaction Monitor
              </h1>
              <h1 className='text-lg font-bold text-white sm:hidden'>
                MSQ Monitor
              </h1>
            </div>
            <div className='flex items-center space-x-2 sm:space-x-4'>
              <div className='hidden sm:block'>
                <ConnectionStatus />
              </div>
              <button className='p-2 text-white/70 hover:text-white transition-colors'>
                <Settings className='w-5 h-5' />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className='flex relative'>
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className='fixed inset-0 bg-black/50 z-40 lg:hidden'
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'w-64 min-h-screen glass-dark border-r border-white/10 transition-transform duration-300 lg:translate-x-0',
            'fixed lg:static top-0 left-0 z-50',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className='p-4 lg:p-6'>
            {/* Mobile close button */}
            <div className='flex justify-between items-center mb-4 lg:hidden'>
              <div className='flex items-center space-x-3'>
                <div className='w-6 h-6 bg-gradient-primary rounded flex items-center justify-center'>
                  <Activity className='w-4 h-4 text-white' />
                </div>
                <span className='text-white font-semibold text-sm'>
                  MSQ Monitor
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className='p-2 text-white/70 hover:text-white transition-colors'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Mobile Connection Status */}
            <div className='mb-4 lg:hidden'>
              <ConnectionStatus />
            </div>

            <nav className='space-y-2'>
              <a
                href='/'
                className={cn(
                  'flex items-center space-x-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-all',
                  'text-white bg-white/10 shadow-glow text-sm lg:text-base'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Activity className='w-4 lg:w-5 h-4 lg:h-5' />
                <span>Live Transactions</span>
              </a>
              <a
                href='/analytics'
                className={cn(
                  'flex items-center space-x-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-all',
                  'text-white/70 hover:text-white hover:bg-white/5 text-sm lg:text-base'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <BarChart3 className='w-4 lg:w-5 h-4 lg:h-5' />
                <span>Analytics</span>
              </a>
              <a
                href='/addresses'
                className={cn(
                  'flex items-center space-x-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-all',
                  'text-white/70 hover:text-white hover:bg-white/5 text-sm lg:text-base'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Wallet className='w-4 lg:w-5 h-4 lg:h-5' />
                <span>Addresses</span>
              </a>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className='flex-1 p-4 lg:p-6 lg:ml-0'>
          <Routes>
            <Route
              path='/'
              element={
                <div className='space-y-4 lg:space-y-6'>
                  <StatsCards />
                  <TransactionFeed />
                </div>
              }
            />
            <Route
              path='/analytics'
              element={
                <div className='glass rounded-2xl p-4 lg:p-6'>
                  <h2 className='text-lg lg:text-xl font-bold text-white'>
                    Analytics Dashboard
                  </h2>
                  <p className='text-white/70 mt-2 text-sm lg:text-base'>
                    Coming soon...
                  </p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster
        position='top-right'
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <TransactionProvider>
      <DashboardContent />
    </TransactionProvider>
  );
}

export default App;
