import { Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Activity, BarChart3, Wallet, Wifi, WifiOff, Menu } from 'lucide-react';
import { VolumeWithTooltip } from '../components/VolumeWithTooltip';
import { useState, useCallback } from 'react';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { TransactionTable } from '../components/TransactionTable';
import { TransactionSearchInput } from '../components/filters/TransactionSearchInput';
import { Analytics } from '../pages/Analytics';
import { Addresses } from '../pages/Addresses';
import {
  InitialLoadingSkeleton,
  LoadMoreButton,
  InitialStatsLoadingSkeleton,
} from '../components/LoadingSkeleton';
import {
  DetailedAnalysisModal,
  DetailedData,
} from '../components/DetailedAnalysisModal';
import {
  fetchAddressDetails,
  fetchTransactionsPage,
} from '../utils/addressAnalytics';
import { getFilterSummary, hasActiveFilters } from '../utils/filterUtils';
import { cn } from '../utils/cn';
import {
  FILTER_TOKENS,
  formatVolume,
  parseFormattedVolume,
  logger,
} from '@msq-tx-monitor/msq-common';
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
  const { stats, statsLoading } = useTransactionData();

  // Show all token stats regardless of filter selection
  const filteredTokenStats = stats.tokenStats;

  const generalStats = [
    {
      label: 'Total Transactions',
      value: stats.totalTransactions.toLocaleString(),
      change:
        stats.transactionsChange24h >= 0
          ? `+${stats.transactionsChange24h.toFixed(1)}%`
          : `${stats.transactionsChange24h.toFixed(1)}%`,
    },
    {
      label: 'Active Addresses',
      value: stats.activeAddresses.toLocaleString(),
      change:
        stats.addressesChange24h >= 0
          ? `+${stats.addressesChange24h.toFixed(1)}%`
          : `${stats.addressesChange24h.toFixed(1)}%`,
    },
  ];

  if (statsLoading) {
    return <InitialStatsLoadingSkeleton />;
  }

  return (
    <div className='space-y-6'>
      {/* General Statistics */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-6'>
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
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4'>
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
                    <span className='text-white'>
                      <VolumeWithTooltip
                        formattedValue={formatVolume(
                          parseFormattedVolume(
                            tokenStat.volume24h,
                            tokenStat.tokenSymbol
                          ),
                          tokenStat.tokenSymbol,
                          { precision: 1 }
                        )}
                        rawValue={parseFormattedVolume(
                          tokenStat.volume24h,
                          tokenStat.tokenSymbol
                        )}
                        tokenSymbol={tokenStat.tokenSymbol}
                        className='inline-block'
                      />
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-white/60'>Total Volume:</span>
                    <span className='text-white'>
                      <VolumeWithTooltip
                        formattedValue={formatVolume(
                          parseFormattedVolume(
                            tokenStat.totalVolume,
                            tokenStat.tokenSymbol
                          ),
                          tokenStat.tokenSymbol,
                          { precision: 1 }
                        )}
                        rawValue={parseFormattedVolume(
                          tokenStat.totalVolume,
                          tokenStat.tokenSymbol
                        )}
                        tokenSymbol={tokenStat.tokenSymbol}
                        className='inline-block'
                      />
                    </span>
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
    totalCount,
    stats,
  } = useTransactionData();
  const { filters, updateFilters, toggleTokenFilter } = useTransactionFilters();
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Address detail modal state
  const [addressModalData, setAddressModalData] = useState<DetailedData | null>(
    null
  );
  const [addressModalLoading, setAddressModalLoading] = useState(false);

  const tokens = FILTER_TOKENS;

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

  const handleAddressClick = useCallback(
    async (type: 'address', address: string) => {
      if (!selectedTransaction) return;

      setAddressModalLoading(true);

      try {
        const detailedData = await fetchAddressDetails(
          address,
          selectedTransaction.token,
          '7d'
        );
        setAddressModalData(detailedData);
      } catch (error) {
        logger.error('Failed to fetch address details', error);
        // Optionally show a toast notification here
      } finally {
        logger.debug('🏁 Setting loading to false');
        setAddressModalLoading(false);
      }
    },
    [selectedTransaction]
  );

  const closeAddressModal = useCallback(() => {
    setAddressModalData(null);
    setAddressModalLoading(false);
  }, []);

  const filterSummary = getFilterSummary(filters);
  const hasFilters = hasActiveFilters(filters, {
    tokens: [],
    showAnomalies: false,
    amountRange: { min: '', max: '' },
    timeRange: { from: '', to: '' },
    addressSearch: '',
    riskLevel: 'all',
  });

  // 항상 전체 트랜잭션 개수 표시
  const displayCount = totalCount || stats.totalTransactions;
  const countLabel = 'transactions found';

  return (
    <div className='glass rounded-2xl p-6'>
      <h2 className='text-xl font-bold text-white mb-6'>
        Live Transaction Feed
      </h2>

      {/* Search and Token Selection - Responsive Layout */}
      <div className='flex flex-col lg:flex-row gap-4 lg:items-center mb-6'>
        {/* Transaction Search */}
        <div className='flex-1'>
          <TransactionSearchInput
            value={filters.addressSearch}
            onChange={handleAddressSearch}
            placeholder='Search by address or tx hash...'
          />
        </div>

        {/* Token Selection */}
        <div className='flex flex-wrap gap-2 lg:flex-shrink-0'>
          {/* ALL 버튼 */}
          <button
            onClick={() => toggleTokenFilter('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
              'border border-white/10 hover:border-white/20',
              filters.tokens.length === 0
                ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                : 'bg-white/5 text-white/60 hover:text-white/80'
            )}
          >
            ALL
          </button>

          {/* 개별 토큰 버튼들 */}
          {tokens.map(token => (
            <button
              key={token}
              onClick={() => toggleTokenFilter(token)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                'border border-white/10 hover:border-white/20',
                filters.tokens.length > 0 && filters.tokens.includes(token)
                  ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                  : 'bg-white/5 text-white/60 hover:text-white/80'
              )}
            >
              {token}
            </button>
          ))}

          {/* 선택 상태 표시 */}
          <div className='text-xs text-white/40 flex items-center ml-2'>
            {filters.tokens.length === 0
              ? 'All tokens'
              : `${filters.tokens.length} token${filters.tokens.length > 1 ? 's' : ''} selected`}
          </div>
        </div>
      </div>

      {/* Header with Filters Summary and Count */}
      <div className='flex flex-col lg:flex-row lg:items-center justify-between mb-4 space-y-3 lg:space-y-0'>
        <div className='flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4'>
          {filterSummary.length > 0 && (
            <div className='text-sm text-white/70'>
              <span className='hidden sm:inline'>Active Filters: </span>
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
          {isInitialLoad
            ? 'Loading...'
            : `${displayCount.toLocaleString()} ${countLabel}`}
        </span>
      </div>

      <div className='space-y-4'>
        {isInitialLoad ? (
          <InitialLoadingSkeleton />
        ) : (
          <>
            <TransactionTable
              transactions={filteredRecentTransactions}
              onTransactionClick={handleTransactionClick}
              hasActiveFilters={hasFilters}
            />

            {/* Load More Button */}
            {filteredRecentTransactions.length > 0 && (
              <LoadMoreButton
                onLoadMore={loadMore}
                hasMore={hasMore}
                isLoading={isLoading}
              />
            )}
          </>
        )}
      </div>

      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAddressClick={handleAddressClick}
      />

      {/* Address Detail Modal */}
      <DetailedAnalysisModal
        isOpen={!!addressModalData || addressModalLoading}
        onClose={closeAddressModal}
        data={addressModalData}
        loading={addressModalLoading}
        onFetchTransactions={useCallback(
          async (page: number, filter?: string) => {
            if (addressModalData?.identifier && selectedTransaction) {
              const result = await fetchTransactionsPage(
                addressModalData.identifier,
                page,
                selectedTransaction.token,
                '7d',
                filter
              );
              return result;
            }
            return {
              transactions: [],
              pagination: { total: 0, totalPages: 0, page: 1, limit: 10 },
            };
          },
          [addressModalData?.identifier, selectedTransaction]
        )}
      />
    </div>
  );
}

function DashboardContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    {
      name: 'Live Transactions',
      href: '/',
      icon: Activity,
      current: location.pathname === '/',
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      current: location.pathname === '/analytics',
    },
    {
      name: 'Addresses',
      href: '/addresses',
      icon: Wallet,
      current: location.pathname === '/addresses',
    },
  ];

  return (
    <div className='min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800'>
      {/* Header */}
      <header className='glass-dark border-b border-white/10 sticky top-0 z-50'>
        <div className='container mx-auto px-4 sm:px-6 py-4'>
          <div className='flex items-center justify-between'>
            {/* Left side - Logo and Title */}
            <div className='flex items-center space-x-3'>
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

            {/* Center - Desktop Navigation */}
            <nav className='hidden lg:flex items-center space-x-1'>
              {navigationItems.map(item => (
                <a
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all text-sm font-medium',
                    item.current
                      ? 'bg-white/10 text-white shadow-glow'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  )}
                >
                  <item.icon className='w-4 h-4' />
                  <span>{item.name}</span>
                </a>
              ))}
            </nav>

            {/* Right side - Status and Mobile Menu */}
            <div className='flex items-center space-x-2 sm:space-x-4'>
              <div className='hidden sm:block'>
                <ConnectionStatus />
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className='p-2 text-white/70 hover:text-white transition-colors lg:hidden'
              >
                <Menu className='w-5 h-5' />
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className='lg:hidden mt-4 pt-4 border-t border-white/10'>
              <div className='mb-4 sm:hidden'>
                <ConnectionStatus />
              </div>
              <nav className='space-y-2'>
                {navigationItems.map(item => (
                  <a
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm',
                      item.current
                        ? 'bg-white/10 text-white shadow-glow'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className='w-4 h-4' />
                    <span>{item.name}</span>
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content - Now full width */}
      <main className='p-4 lg:p-6'>
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
          <Route path='/analytics' element={<Analytics />} />
          <Route path='/addresses' element={<Addresses />} />
        </Routes>
      </main>

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
