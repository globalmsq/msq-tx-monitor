import React, { useState, useCallback, useEffect } from 'react';
import {
  Search,
  TrendingUp,
  Activity,
  AlertTriangle,
  Wallet,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '../utils/cn';
import {
  DetailedAnalysisModal,
  DetailedData,
} from '../components/DetailedAnalysisModal';
import {
  logger,
  formatVolume,
  formatRelativeTime,
  formatFullTimestamp,
} from '@msq-tx-monitor/msq-common';

const ADDRESSES_BASE_URL = 'http://localhost:8000/api/v1/addresses';

type TimeRange = 'day' | 'week' | 'month' | 'all';
type CategoryTab = 'rankings' | 'whales' | 'active' | 'suspicious';

interface AddressRanking {
  address: string;
  total_volume: string;
  total_sent: string;
  total_received: string;
  transaction_count: number;
  first_seen: string;
  last_seen: string;
  rank: number;
}

interface AddressSearchResult {
  address: string;
  transaction_count: number;
  total_volume: string;
  last_activity: string;
  label?: string;
}

export function Addresses() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [selectedToken, setSelectedToken] = useState<string>('MSQ');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('rankings');

  const [addresses, setAddresses] = useState<AddressRanking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal state
  const [selectedAddressData, setSelectedAddressData] =
    useState<DetailedData | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Copy state
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const tokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
  const limit = 50;

  // Fetch addresses based on category and filters
  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      let endpoint = '';
      const params = new URLSearchParams();

      params.append('token', selectedToken);
      if (activeCategory === 'rankings') {
        params.append('time_period', timeRange);
      }
      params.append('limit', limit.toString());

      switch (activeCategory) {
        case 'rankings':
          endpoint = `${ADDRESSES_BASE_URL}/rankings?${params}`;
          break;
        case 'whales':
          endpoint = `${ADDRESSES_BASE_URL}/whales?${params}`;
          break;
        case 'active':
          endpoint = `${ADDRESSES_BASE_URL}/active-traders?${params}`;
          break;
        case 'suspicious':
          endpoint = `${ADDRESSES_BASE_URL}/suspicious?${params}`;
          break;
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }

      const data = await response.json();
      setAddresses(data.data || []);

      // Calculate total pages (assuming max 100 results per request)
      const totalCount = data.data?.length || 0;
      setTotalPages(Math.ceil(totalCount / 10));
    } catch (error) {
      logger.error('Failed to fetch addresses:', error);
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedToken, timeRange, activeCategory]);

  // Search addresses with debounce
  useEffect(() => {
    if (searchQuery.length < 5) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${ADDRESSES_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}&limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.data || []);
          setShowSearchDropdown(true);
        }
      } catch (error) {
        logger.error('Search failed:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch addresses when filters change
  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Handle address click to show details
  const handleAddressClick = useCallback(async (address: string) => {
    setIsModalLoading(true);
    setShowSearchDropdown(false);

    try {
      // Fetch address statistics
      const statsResponse = await fetch(
        `${ADDRESSES_BASE_URL}/stats/${address}`
      );
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch address stats');
      }
      const statsData = await statsResponse.json();

      // Fetch trends data
      const trendsResponse = await fetch(
        `${ADDRESSES_BASE_URL}/${address}/trends?hours=168&interval=daily`
      );
      let trendsData = [];
      if (trendsResponse.ok) {
        const trends = await trendsResponse.json();
        trendsData = trends?.data?.trends || [];
      }

      // Fetch recent transactions
      const txResponse = await fetch(
        `http://localhost:8000/api/v1/transactions/address/${address}?limit=10`
      );
      let transactions = [];
      if (txResponse.ok) {
        const txData = await txResponse.json();
        transactions =
          txData?.data?.map((tx: any) => ({
            hash: tx.hash || tx.transaction_hash,
            timestamp: tx.timestamp || tx.blockTimestamp,
            from: tx.from_address || tx.from || tx.fromAddress,
            to: tx.to_address || tx.to || tx.toAddress,
            value: tx.amount || tx.value || '0',
            tokenSymbol: tx.token_symbol || tx.tokenSymbol || 'MSQ',
            gasUsed: tx.gas_used || tx.gasUsed || '0',
            gasPrice: tx.gas_price || tx.gasPrice || '0',
            status:
              tx.status === 1 || tx.status === 'success' ? 'success' : 'failed',
            riskScore: tx.anomaly_score || tx.riskScore || tx.anomalyScore || 0,
          })) || [];
      }

      const detailedData: DetailedData = {
        type: 'address',
        title: `Address Detail`,
        identifier: address,
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        summary: {
          totalVolume: statsData.data?.total_volume || '0',
          transactionCount: statsData.data?.total_transactions || 0,
          uniqueAddresses:
            (statsData.data?.total_sent_transactions || 0) +
            (statsData.data?.total_received_transactions || 0),
          riskScore:
            statsData.data?.anomaly_statistics?.avg_anomaly_score || 0,
          tokenSymbol: selectedToken,
        },
        transactions,
        trends: trendsData,
      };

      setSelectedAddressData(detailedData);
    } catch (error) {
      logger.error('Failed to fetch address details:', error);
    } finally {
      setIsModalLoading(false);
    }
  }, [selectedToken]);

  const closeModal = useCallback(() => {
    setSelectedAddressData(null);
  }, []);

  // Handle copy address to clipboard
  const handleCopyAddress = useCallback((address: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click event
    navigator.clipboard.writeText(address).then(() => {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    });
  }, []);

  // Paginated addresses for current page
  const paginatedAddresses = addresses.slice(
    (currentPage - 1) * 10,
    currentPage * 10
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

      {/* Search Bar */}
      <div className='glass rounded-2xl p-6'>
        <div className='relative'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40' />
            <input
              type='text'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Search address (0x...)...'
              className='w-full bg-white/5 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-primary-500 transition-colors'
            />
          </div>

          {/* Search Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className='absolute z-50 w-full mt-2 bg-gray-900 border border-white/10 rounded-lg shadow-xl max-h-96 overflow-y-auto'>
              {searchResults.map(result => (
                <button
                  key={result.address}
                  onClick={() => {
                    setSearchQuery(result.address);
                    handleAddressClick(result.address);
                  }}
                  className='w-full px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 last:border-b-0 transition-colors'
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex-1 min-w-0'>
                      <div className='text-white font-mono text-sm truncate'>
                        {result.address}
                      </div>
                      {result.label && (
                        <div className='text-xs text-primary-400 mt-1'>
                          {result.label}
                        </div>
                      )}
                    </div>
                    <div className='ml-4 text-right'>
                      <div className='text-white/60 text-xs'>
                        {result.transaction_count.toLocaleString()} txs
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className='glass rounded-2xl p-6'>
        <div className='flex flex-col lg:flex-row gap-4'>
          {/* Token Filter */}
          <div className='flex-1'>
            <label className='block text-white/60 text-sm mb-2'>Token</label>
            <div className='flex flex-wrap gap-2'>
              {tokens.map(token => (
                <button
                  key={token}
                  onClick={() => setSelectedToken(token)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    selectedToken === token
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  )}
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range Filter - Only for rankings */}
          {activeCategory === 'rankings' && (
            <div className='flex-1'>
              <label className='block text-white/60 text-sm mb-2'>
                Time Range
              </label>
              <div className='flex flex-wrap gap-2'>
                {(['day', 'week', 'month', 'all'] as TimeRange[]).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                      timeRange === range
                        ? 'bg-primary-500 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className='glass rounded-2xl p-6'>
        <div className='flex flex-wrap gap-2'>
          <button
            onClick={() => setActiveCategory('rankings')}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all',
              activeCategory === 'rankings'
                ? 'bg-primary-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            <TrendingUp className='w-4 h-4' />
            <span>Top Rankings</span>
          </button>
          <button
            onClick={() => setActiveCategory('whales')}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all',
              activeCategory === 'whales'
                ? 'bg-primary-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            <Wallet className='w-4 h-4' />
            <span>Whales</span>
          </button>
          <button
            onClick={() => setActiveCategory('active')}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all',
              activeCategory === 'active'
                ? 'bg-primary-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            <Activity className='w-4 h-4' />
            <span>Active Traders</span>
          </button>
          <button
            onClick={() => setActiveCategory('suspicious')}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all',
              activeCategory === 'suspicious'
                ? 'bg-primary-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            <AlertTriangle className='w-4 h-4' />
            <span>Suspicious</span>
          </button>
        </div>
      </div>

      {/* Address Table */}
      <div className='glass rounded-2xl overflow-hidden'>
        {isLoading ? (
          <div className='text-center py-12'>
            <div className='inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin'></div>
            <p className='text-white/60 mt-4'>Loading addresses...</p>
          </div>
        ) : paginatedAddresses.length === 0 ? (
          <div className='text-center py-12'>
            <Wallet className='w-12 h-12 text-white/20 mx-auto mb-4' />
            <p className='text-white/60'>No addresses found</p>
          </div>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[600px]'>
                <thead>
                  <tr className='border-b border-white/10'>
                    <th className='text-left text-white/60 text-sm font-medium py-3 px-4'>
                      Rank
                    </th>
                    <th className='text-left text-white/60 text-sm font-medium py-3 px-4'>
                      Address
                    </th>
                    <th className='text-right text-white/60 text-sm font-medium py-3 px-4'>
                      Volume
                    </th>
                    <th className='text-right text-white/60 text-sm font-medium py-3 px-4'>
                      Received
                    </th>
                    <th className='text-right text-white/60 text-sm font-medium py-3 px-4'>
                      Sent
                    </th>
                    <th className='text-right text-white/60 text-sm font-medium py-3 px-4'>
                      Transactions
                    </th>
                    <th className='text-right text-white/60 text-sm font-medium py-3 px-4'>
                      Last Activity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAddresses.map((addr, index) => (
                    <tr
                      key={addr.address}
                      onClick={() => handleAddressClick(addr.address)}
                      className='border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors'
                    >
                      <td className='py-3 px-4 text-white text-sm font-medium'>
                        #{(currentPage - 1) * 10 + index + 1}
                      </td>
                      <td className='py-3 px-4'>
                        <div className='flex items-center gap-2'>
                          {/* Full address - responsive truncation */}
                          <span className='text-white font-mono text-sm truncate min-w-0'>
                            <span className='hidden xl:inline'>{addr.address}</span>
                            <span className='hidden md:inline xl:hidden'>
                              {addr.address.slice(0, 16)}...{addr.address.slice(-14)}
                            </span>
                            <span className='inline md:hidden'>
                              {addr.address.slice(0, 10)}...{addr.address.slice(-8)}
                            </span>
                          </span>

                          {/* Copy button - always visible */}
                          <button
                            onClick={(e) => handleCopyAddress(addr.address, e)}
                            className='flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors'
                            title='Copy address'
                          >
                            {copiedAddress === addr.address ? (
                              <Check className='w-3 h-3 text-green-400' />
                            ) : (
                              <Copy className='w-3 h-3 text-white/60 hover:text-white' />
                            )}
                          </button>
                        </div>
                      </td>
                      {/* Volume */}
                      <td className='py-3 px-4 text-right text-white text-sm'>
                        <div className='relative inline-block group'>
                          <span className='cursor-help'>
                            {formatVolume(addr.total_volume, selectedToken)}
                          </span>
                          <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 border border-white/10'>
                            {formatVolume(addr.total_volume, selectedToken, {
                              compact: false,
                              precision: 2,
                              showSymbol: true,
                            })}
                            <div className='absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900'></div>
                          </div>
                        </div>
                      </td>
                      {/* Received */}
                      <td className='py-3 px-4 text-right text-white text-sm'>
                        <div className='relative inline-block group'>
                          <span className='cursor-help'>
                            {formatVolume(addr.total_received, selectedToken)}
                          </span>
                          <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 border border-white/10'>
                            {formatVolume(addr.total_received, selectedToken, {
                              compact: false,
                              precision: 2,
                              showSymbol: true,
                            })}
                            <div className='absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900'></div>
                          </div>
                        </div>
                      </td>
                      {/* Sent */}
                      <td className='py-3 px-4 text-right text-white text-sm'>
                        <div className='relative inline-block group'>
                          <span className='cursor-help'>
                            {formatVolume(addr.total_sent, selectedToken)}
                          </span>
                          <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 border border-white/10'>
                            {formatVolume(addr.total_sent, selectedToken, {
                              compact: false,
                              precision: 2,
                              showSymbol: true,
                            })}
                            <div className='absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900'></div>
                          </div>
                        </div>
                      </td>
                      {/* Transactions */}
                      <td className='py-3 px-4 text-right text-white text-sm'>
                        {addr.transaction_count.toLocaleString()}
                      </td>
                      {/* Last Activity */}
                      <td className='py-3 px-4 text-right text-white/60 text-sm'>
                        <div className='relative inline-block group'>
                          <span className='cursor-help whitespace-nowrap'>
                            {formatRelativeTime(addr.last_seen)}
                          </span>
                          <div className='absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 border border-white/10'>
                            {formatFullTimestamp(addr.last_seen)}
                            <div className='absolute top-full right-2 -mt-1 border-4 border-transparent border-t-gray-900'></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='flex items-center justify-center space-x-2 mt-6 px-6 pb-6'>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className='px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  Previous
                </button>
                <span className='text-white/60 px-4'>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className='px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Address Detail Modal */}
      <DetailedAnalysisModal
        isOpen={!!selectedAddressData || isModalLoading}
        onClose={closeModal}
        data={selectedAddressData}
        loading={isModalLoading}
      />
    </div>
  );
}
