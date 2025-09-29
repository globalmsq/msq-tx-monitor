import { FilterState } from '../hooks/useUrlFilterSync';
import { Transaction } from '../types/transaction';

/**
 * Apply filters to a transaction array
 */
export function applyFiltersToTransactions(
  transactions: Transaction[],
  filters: FilterState
): Transaction[] {
  return transactions.filter(tx => {
    // Token filter
    if (filters.tokens.length > 0 && !filters.tokens.includes(tx.token)) {
      return false;
    }

    // Amount range filter (use rawValue for filtering, not formatted value)
    if (filters.amountRange.min || filters.amountRange.max) {
      // Convert raw value to decimal representation for filtering
      const rawValue = tx.rawValue || tx.value;
      const value = parseFloat(rawValue) || 0;

      if (
        filters.amountRange.min &&
        value < parseFloat(filters.amountRange.min)
      ) {
        return false;
      }

      if (
        filters.amountRange.max &&
        value > parseFloat(filters.amountRange.max)
      ) {
        return false;
      }
    }

    // Time range filter
    if (filters.timeRange.from || filters.timeRange.to) {
      const txTime = new Date(tx.timestamp).getTime();

      if (filters.timeRange.from) {
        const fromTime = new Date(filters.timeRange.from).getTime();
        if (txTime < fromTime) {
          return false;
        }
      }

      if (filters.timeRange.to) {
        const toTime = new Date(filters.timeRange.to).getTime();
        if (txTime > toTime) {
          return false;
        }
      }
    }

    // Address and transaction hash search filter
    if (filters.addressSearch) {
      const searchTerms = parseAddressSearch(filters.addressSearch);
      const matchesSearch = searchTerms.some(searchTerm => {
        const lowerSearch = searchTerm.toLowerCase();
        const searchType = getSearchType(searchTerm);

        // For transaction hash searches, check tx.hash
        if (searchType === 'hash' || isPartialTransactionHash(searchTerm)) {
          return tx.hash.toLowerCase().includes(lowerSearch);
        }

        // For address searches (including partial), check from and to
        return (
          tx.from.toLowerCase().includes(lowerSearch) ||
          tx.to.toLowerCase().includes(lowerSearch)
        );
      });

      if (!matchesSearch) {
        return false;
      }
    }

    // Anomaly filter (keeping for backward compatibility)
    if (filters.showAnomalies && (!tx.anomalyScore || tx.anomalyScore <= 0.3)) {
      return false;
    }

    return true;
  });
}

/**
 * Parse address search string into individual addresses
 * Supports comma/space separated addresses and partial matching
 */
export function parseAddressSearch(searchString: string): string[] {
  if (!searchString.trim()) {
    return [];
  }

  return searchString
    .split(/[,\s]+/)
    .map(addr => addr.trim())
    .filter(addr => addr.length > 0);
}

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if address search includes partial matches
 */
export function isPartialAddressSearch(address: string): boolean {
  return address.startsWith('0x') && address.length < 42;
}

/**
 * Validate transaction hash format (0x + 64 hex characters)
 */
export function isValidTransactionHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Check if search string is a partial transaction hash
 */
export function isPartialTransactionHash(hash: string): boolean {
  return hash.startsWith('0x') && hash.length > 42 && hash.length < 66;
}

/**
 * Determine search type based on input string
 */
export function getSearchType(
  input: string
): 'address' | 'hash' | 'partial' | 'unknown' {
  if (!input.startsWith('0x')) return 'unknown';

  if (input.length === 42) return 'address';
  if (input.length === 66) return 'hash';
  if (input.length > 42 && input.length < 66) return 'partial';
  if (input.length < 42) return 'partial';

  return 'unknown';
}

/**
 * Get filter summary for display
 */
export function getFilterSummary(filters: FilterState): string[] {
  const summary: string[] = [];

  if (filters.tokens.length > 0 && filters.tokens.length < 4) {
    summary.push(`Tokens: ${filters.tokens.join(', ')}`);
  }

  if (filters.amountRange.min || filters.amountRange.max) {
    const min = filters.amountRange.min || '0';
    const max = filters.amountRange.max || '∞';
    summary.push(`Amount: ${min} - ${max}`);
  }

  if (filters.timeRange.from || filters.timeRange.to) {
    if (filters.timeRange.from && filters.timeRange.to) {
      const fromDate = new Date(filters.timeRange.from).toLocaleDateString();
      const toDate = new Date(filters.timeRange.to).toLocaleDateString();
      summary.push(`Time: ${fromDate} - ${toDate}`);
    } else if (filters.timeRange.from) {
      const fromDate = new Date(filters.timeRange.from).toLocaleDateString();
      summary.push(`After: ${fromDate}`);
    } else if (filters.timeRange.to) {
      const toDate = new Date(filters.timeRange.to).toLocaleDateString();
      summary.push(`Before: ${toDate}`);
    }
  }

  if (filters.addressSearch) {
    const addresses = parseAddressSearch(filters.addressSearch);
    if (addresses.length === 1) {
      summary.push(`Address: ${addresses[0]}`);
    } else if (addresses.length > 1) {
      summary.push(`Addresses: ${addresses.length} items`);
    }
  }

  if (filters.showAnomalies) {
    summary.push('Anomalies Only');
  }

  if (filters.riskLevel !== 'all') {
    summary.push(`Risk: ${filters.riskLevel}`);
  }

  return summary;
}

/**
 * Check if filters have any non-default values
 */
export function hasActiveFilters(
  filters: FilterState,
  defaultState: FilterState
): boolean {
  return (
    JSON.stringify(filters.tokens.sort()) !==
      JSON.stringify(defaultState.tokens.sort()) ||
    filters.showAnomalies !== defaultState.showAnomalies ||
    filters.amountRange.min !== defaultState.amountRange.min ||
    filters.amountRange.max !== defaultState.amountRange.max ||
    filters.timeRange.from !== defaultState.timeRange.from ||
    filters.timeRange.to !== defaultState.timeRange.to ||
    filters.addressSearch !== defaultState.addressSearch ||
    filters.riskLevel !== defaultState.riskLevel
  );
}

/**
 * Generate quick time range presets
 */
export function getTimeRangePresets(): Array<{
  label: string;
  from?: string;
  to?: string;
}> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return [
    {
      label: 'Last Hour',
      from: oneHourAgo.toISOString().slice(0, 16),
    },
    {
      label: 'Last 24 Hours',
      from: oneDayAgo.toISOString().slice(0, 16),
    },
    {
      label: 'Last Week',
      from: oneWeekAgo.toISOString().slice(0, 16),
    },
    {
      label: 'Last Month',
      from: oneMonthAgo.toISOString().slice(0, 16),
    },
  ];
}

/**
 * Generate amount range presets
 */
export function getAmountRangePresets(): Array<{
  label: string;
  min?: string;
  max?: string;
}> {
  return [
    {
      label: 'Small (< 1,000)',
      max: '1000',
    },
    {
      label: 'Medium (1,000 - 10,000)',
      min: '1000',
      max: '10000',
    },
    {
      label: 'Large (10,000 - 100,000)',
      min: '10000',
      max: '100000',
    },
    {
      label: 'Whale (> 100,000)',
      min: '100000',
    },
  ];
}
