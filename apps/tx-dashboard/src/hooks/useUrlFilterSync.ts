import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface FilterState {
  tokens: string[];
  showAnomalies: boolean;
  amountRange: {
    min: string;
    max: string;
  };
  timeRange: {
    from: string;
    to: string;
  };
  addressSearch: string;
  riskLevel: 'all' | 'low' | 'medium' | 'high';
}

const DEFAULT_FILTER_STATE: FilterState = {
  tokens: ['MSQ', 'SUT', 'KWT', 'P2UC'],
  showAnomalies: false,
  amountRange: { min: '', max: '' },
  timeRange: { from: '', to: '' },
  addressSearch: '',
  riskLevel: 'all',
};

/**
 * Hook for synchronizing filter state with URL parameters
 * Enables shareable dashboard URLs with filter states
 */
export function useUrlFilterSync() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL parameters into filter state
  const parseFiltersFromUrl = useCallback((): FilterState => {
    const tokens = searchParams.get('tokens');
    const showAnomalies = searchParams.get('anomalies') === 'true';
    const minAmount = searchParams.get('minAmount') || '';
    const maxAmount = searchParams.get('maxAmount') || '';
    const fromTime = searchParams.get('from') || '';
    const toTime = searchParams.get('to') || '';
    const addressSearch = searchParams.get('address') || '';
    const riskLevel =
      (searchParams.get('risk') as FilterState['riskLevel']) || 'all';

    return {
      tokens: tokens
        ? tokens.split(',').filter(Boolean)
        : DEFAULT_FILTER_STATE.tokens,
      showAnomalies,
      amountRange: {
        min: minAmount,
        max: maxAmount,
      },
      timeRange: {
        from: fromTime,
        to: toTime,
      },
      addressSearch,
      riskLevel,
    };
  }, [searchParams]);

  // Update URL parameters from filter state
  const updateUrlFromFilters = useCallback(
    (filters: FilterState, replace: boolean = false) => {
      const newParams = new URLSearchParams();

      // Only add non-default values to keep URL clean
      if (
        filters.tokens.length > 0 &&
        JSON.stringify(filters.tokens.sort()) !==
          JSON.stringify(DEFAULT_FILTER_STATE.tokens.sort())
      ) {
        newParams.set('tokens', filters.tokens.join(','));
      }

      if (filters.showAnomalies) {
        newParams.set('anomalies', 'true');
      }

      if (filters.amountRange.min) {
        newParams.set('minAmount', filters.amountRange.min);
      }

      if (filters.amountRange.max) {
        newParams.set('maxAmount', filters.amountRange.max);
      }

      if (filters.timeRange.from) {
        newParams.set('from', filters.timeRange.from);
      }

      if (filters.timeRange.to) {
        newParams.set('to', filters.timeRange.to);
      }

      if (filters.addressSearch) {
        newParams.set('address', filters.addressSearch);
      }

      if (filters.riskLevel !== 'all') {
        newParams.set('risk', filters.riskLevel);
      }

      setSearchParams(newParams, { replace });
    },
    [setSearchParams]
  );

  // Check if current URL has any filter parameters
  const hasUrlFilters = useCallback((): boolean => {
    const params = [
      'tokens',
      'anomalies',
      'minAmount',
      'maxAmount',
      'from',
      'to',
      'address',
      'risk',
    ];
    return params.some(param => searchParams.has(param));
  }, [searchParams]);

  // Clear all filter parameters from URL
  const clearUrlFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Generate shareable URL for current filters
  const getShareableUrl = useCallback((filters: FilterState): string => {
    const params = new URLSearchParams();

    if (filters.tokens.length > 0) {
      params.set('tokens', filters.tokens.join(','));
    }
    if (filters.showAnomalies) {
      params.set('anomalies', 'true');
    }
    if (filters.amountRange.min) {
      params.set('minAmount', filters.amountRange.min);
    }
    if (filters.amountRange.max) {
      params.set('maxAmount', filters.amountRange.max);
    }
    if (filters.timeRange.from) {
      params.set('from', filters.timeRange.from);
    }
    if (filters.timeRange.to) {
      params.set('to', filters.timeRange.to);
    }
    if (filters.addressSearch) {
      params.set('address', filters.addressSearch);
    }
    if (filters.riskLevel !== 'all') {
      params.set('risk', filters.riskLevel);
    }

    const queryString = params.toString();
    return queryString
      ? `${window.location.origin}${window.location.pathname}?${queryString}`
      : window.location.origin + window.location.pathname;
  }, []);

  return {
    parseFiltersFromUrl,
    updateUrlFromFilters,
    hasUrlFilters,
    clearUrlFilters,
    getShareableUrl,
    DEFAULT_FILTER_STATE,
  };
}
