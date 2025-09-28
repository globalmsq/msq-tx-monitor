import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  ReactNode,
} from 'react';
import {
  wsService,
  ConnectionState,
  TransactionMessage,
} from '../services/websocket';
import { FilterState, useUrlFilterSync } from '../hooks/useUrlFilterSync';
import { applyFiltersToTransactions } from '../utils/filterUtils';
import {
  Transaction,
  adaptWebSocketTransactionForUI,
  adaptApiTransactionForUI,
} from '../types/transaction';
import { apiService } from '../services/api';

interface TokenStats {
  tokenSymbol: string;
  tokenAddress: string;
  volume24h: string;
  totalVolume: string;
  transactionCount: number;
}

interface TransactionStats {
  totalTransactions: number;
  activeAddresses: number;
  tokenStats: TokenStats[];
  successRate: number;
  transactionsChange24h: number;
  addressesChange24h: number;
}

interface TransactionState {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;

  // Transaction data
  transactions: Transaction[];
  recentTransactions: Transaction[];
  filteredTransactions: Transaction[];
  filteredRecentTransactions: Transaction[];
  stats: TransactionStats;

  // Enhanced filters
  filters: FilterState;

  // Cursor pagination state
  hasMore: boolean;
  lastTransactionId: number | null;
  totalCount: number;
  isInitialLoad: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;
}

type TransactionAction =
  | { type: 'SET_CONNECTION_STATE'; payload: ConnectionState }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'SET_INITIAL_DATA'; payload: { transactions: Transaction[]; totalCount?: number; hasMore: boolean; lastId?: number } }
  | { type: 'LOAD_MORE_DATA'; payload: { transactions: Transaction[]; hasMore: boolean; lastId?: number } }
  | { type: 'SET_INITIAL_LOAD_COMPLETE' }
  | { type: 'UPDATE_STATS'; payload: Partial<TransactionStats> }
  | { type: 'SET_TOKEN_FILTER'; payload: string[] }
  | { type: 'TOGGLE_ANOMALIES'; payload: boolean }
  | { type: 'SET_FILTERS'; payload: FilterState }
  | { type: 'UPDATE_FILTERED_DATA' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

const initialStats: TransactionStats = {
  totalTransactions: 0,
  activeAddresses: 0,
  tokenStats: [],
  successRate: 0,
  transactionsChange24h: 0,
  addressesChange24h: 0,
};

const initialState: TransactionState = {
  connectionState: ConnectionState.DISCONNECTED,
  isConnected: false,
  transactions: [],
  recentTransactions: [],
  filteredTransactions: [],
  filteredRecentTransactions: [],
  stats: initialStats,
  filters: {
    tokens: [], // Allow all tokens initially
    showAnomalies: false,
    amountRange: { min: '', max: '' },
    timeRange: { from: '', to: '' },
    addressSearch: '',
    riskLevel: 'all',
  },
  hasMore: true,
  lastTransactionId: null,
  totalCount: 0,
  isInitialLoad: true,
  isLoading: false,
  error: null,
};

// Helper function to apply filters and update filtered data
function applyFiltersToState(state: TransactionState): TransactionState {
  const filteredTransactions = applyFiltersToTransactions(
    state.transactions,
    state.filters
  );
  const filteredRecentTransactions = applyFiltersToTransactions(
    state.recentTransactions,
    state.filters
  );

  return {
    ...state,
    filteredTransactions,
    filteredRecentTransactions,
  };
}

function transactionReducer(
  state: TransactionState,
  action: TransactionAction
): TransactionState {
  switch (action.type) {
    case 'SET_CONNECTION_STATE':
      return {
        ...state,
        connectionState: action.payload,
        isConnected: action.payload === ConnectionState.CONNECTED,
      };

    case 'ADD_TRANSACTION': {
      const newTransaction = action.payload;

      // Check for duplicates based on transaction hash
      const isDuplicate = state.transactions.some(tx => tx.hash === newTransaction.hash);
      if (isDuplicate) {
        return state; // Skip duplicate transactions
      }

      const updatedTransactions = [newTransaction, ...state.transactions].slice(
        0,
        1000
      ); // Keep last 1000
      const updatedRecent = [newTransaction, ...state.recentTransactions].slice(
        0,
        50
      ); // Keep last 50

      // Update both totalCount and stats.totalTransactions
      const newTotalCount = state.totalCount + 1;
      const updatedStats = {
        ...state.stats,
        totalTransactions: Math.max(state.stats.totalTransactions + 1, newTotalCount),
      };

      const newState = {
        ...state,
        transactions: updatedTransactions,
        recentTransactions: updatedRecent,
        totalCount: newTotalCount,
        stats: updatedStats,
      };

      return applyFiltersToState(newState);
    }

    case 'UPDATE_TRANSACTIONS': {
      const newState = {
        ...state,
        transactions: action.payload,
        recentTransactions: action.payload.slice(0, 50),
      };
      return applyFiltersToState(newState);
    }

    case 'SET_INITIAL_DATA': {
      // Only update totalCount if API provides a valid value
      // This prevents resetting the count during refresh operations
      const newTotalCount = action.payload.totalCount !== undefined
        ? action.payload.totalCount
        : state.totalCount;

      const newState = {
        ...state,
        transactions: action.payload.transactions,
        recentTransactions: action.payload.transactions.slice(0, 50),
        totalCount: newTotalCount,
        hasMore: action.payload.hasMore,
        lastTransactionId: action.payload.lastId || null,
        isInitialLoad: false,
        isLoading: false,
      };
      return applyFiltersToState(newState);
    }

    case 'LOAD_MORE_DATA': {
      // Merge new data with existing, avoiding duplicates
      const existingHashes = new Set(state.transactions.map(tx => tx.hash));
      const newTransactions = action.payload.transactions.filter(
        tx => !existingHashes.has(tx.hash)
      );

      const updatedTransactions = [...state.transactions, ...newTransactions];

      const newState = {
        ...state,
        transactions: updatedTransactions,
        recentTransactions: updatedTransactions, // Show all loaded transactions
        hasMore: action.payload.hasMore,
        lastTransactionId: action.payload.lastId || state.lastTransactionId,
        isLoading: false,
      };
      return applyFiltersToState(newState);
    }

    case 'SET_INITIAL_LOAD_COMPLETE':
      return {
        ...state,
        isInitialLoad: false,
        isLoading: false,
      };

    case 'UPDATE_STATS': {
      const updatedStats = { ...state.stats, ...action.payload };

      // If totalTransactions is updated via stats, also update totalCount
      const newTotalCount = action.payload.totalTransactions !== undefined
        ? Math.max(action.payload.totalTransactions, state.totalCount)
        : state.totalCount;

      return {
        ...state,
        stats: updatedStats,
        totalCount: newTotalCount,
      };
    }

    case 'SET_TOKEN_FILTER': {
      const newState = {
        ...state,
        filters: {
          ...state.filters,
          tokens: action.payload,
        },
      };
      return applyFiltersToState(newState);
    }

    case 'TOGGLE_ANOMALIES': {
      const newState = {
        ...state,
        filters: {
          ...state.filters,
          showAnomalies: action.payload,
        },
      };
      return applyFiltersToState(newState);
    }

    case 'SET_FILTERS': {
      const newState = {
        ...state,
        filters: action.payload,
      };
      return applyFiltersToState(newState);
    }

    case 'UPDATE_FILTERED_DATA':
      return applyFiltersToState(state);

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}

interface TransactionContextType {
  state: TransactionState;
  actions: {
    toggleTokenFilter: (token: string) => void;
    toggleAnomalies: () => void;
    setFilters: (filters: FilterState) => void;
    updateFilters: (updates: Partial<FilterState>) => void;
    loadMore: () => Promise<void>;
    refreshData: () => Promise<void>;
    clearError: () => void;
    reconnect: () => void;
    disconnect: () => void;
  };
}

const TransactionContext = createContext<TransactionContextType | undefined>(
  undefined
);

interface TransactionProviderProps {
  children: ReactNode;
}

export function TransactionProvider({ children }: TransactionProviderProps) {
  const [state, dispatch] = useReducer(transactionReducer, initialState);
  const { parseFiltersFromUrl, updateUrlFromFilters } = useUrlFilterSync();

  // Initialize filters from URL on mount
  useEffect(() => {
    const urlFilters = parseFiltersFromUrl();
    if (JSON.stringify(urlFilters) !== JSON.stringify(state.filters)) {
      dispatch({ type: 'SET_FILTERS', payload: urlFilters });
    }
  }, [parseFiltersFromUrl, state.filters]);

  // Load initial transaction data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (!state.isInitialLoad) return;

      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      try {
        const response = await apiService.getTransactionsCursor(
          {}, // No filters for initial load
          { limit: 50 }
        );

        const uiTransactions = response.data.map(adaptApiTransactionForUI);
        const lastId = uiTransactions.length > 0 ? Number(uiTransactions[uiTransactions.length - 1].id) : undefined;

        dispatch({
          type: 'SET_INITIAL_DATA',
          payload: {
            transactions: uiTransactions,
            totalCount: response.cursor.total,
            hasMore: response.cursor.hasNext,
            lastId,
          },
        });
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to load initial data',
        });
        dispatch({ type: 'SET_INITIAL_LOAD_COMPLETE' });
      }
    };

    loadInitialData();
  }, [state.isInitialLoad]);

  // Update URL when filters change
  useEffect(() => {
    updateUrlFromFilters(state.filters, true);
  }, [state.filters, updateUrlFromFilters]);

  useEffect(() => {
    // Set up WebSocket connection
    const unsubscribeMessages = wsService.subscribe(
      (message: TransactionMessage) => {
        switch (message.type) {
          case 'new_transaction':
            if (message.data) {
              const txData = message.data as Record<string, unknown>;
              const mappedTransaction = adaptWebSocketTransactionForUI(txData);
              dispatch({
                type: 'ADD_TRANSACTION',
                payload: mappedTransaction,
              });
            }
            break;

          case 'connection':
            if (
              message.data &&
              typeof message.data === 'object' &&
              'stats' in message.data
            ) {
              dispatch({
                type: 'UPDATE_STATS',
                payload: (message.data as { stats: Partial<TransactionStats> })
                  .stats,
              });
            }
            break;

          case 'stats_update':
            if (
              message.data &&
              typeof message.data === 'object' &&
              'stats' in message.data
            ) {
              dispatch({
                type: 'UPDATE_STATS',
                payload: (message.data as { stats: Partial<TransactionStats> })
                  .stats,
              });
            }
            break;

          case 'error':
            dispatch({
              type: 'SET_ERROR',
              payload:
                message.data &&
                typeof message.data === 'object' &&
                'message' in message.data
                  ? (message.data as { message: string }).message
                  : 'WebSocket error',
            });
            break;
        }
      }
    );

    const unsubscribeState = wsService.onConnectionStateChange(
      (connectionState: ConnectionState) => {
        dispatch({ type: 'SET_CONNECTION_STATE', payload: connectionState });

        if (connectionState === ConnectionState.ERROR) {
          dispatch({
            type: 'SET_ERROR',
            payload: 'Failed to connect to transaction stream',
          });
        } else if (connectionState === ConnectionState.CONNECTED) {
          dispatch({ type: 'CLEAR_ERROR' });
          // Request initial data
          wsService.send({ type: 'subscribe', tokens: state.filters.tokens });
        }
      }
    );

    // Connect to WebSocket
    wsService.connect();

    return () => {
      unsubscribeMessages();
      unsubscribeState();
      wsService.disconnect();
    };
  }, [state.filters.tokens]);

  // Update token subscription when filter changes
  useEffect(() => {
    if (wsService.isConnected()) {
      wsService.send({
        type: 'subscribe',
        tokens: state.filters.tokens,
        includeAnomalies: state.filters.showAnomalies,
      });
    }
  }, [state.filters.tokens, state.filters.showAnomalies]);

  const actions = {
    toggleTokenFilter: (token: string) => {
      const currentTokens = state.filters.tokens;
      const newTokens = currentTokens.includes(token)
        ? currentTokens.filter(t => t !== token)
        : [...currentTokens, token];

      dispatch({ type: 'SET_TOKEN_FILTER', payload: newTokens });
    },

    toggleAnomalies: () => {
      dispatch({
        type: 'TOGGLE_ANOMALIES',
        payload: !state.filters.showAnomalies,
      });
    },

    setFilters: (filters: FilterState) => {
      dispatch({ type: 'SET_FILTERS', payload: filters });
    },

    updateFilters: (updates: Partial<FilterState>) => {
      const newFilters = { ...state.filters, ...updates };
      dispatch({ type: 'SET_FILTERS', payload: newFilters });
    },

    loadMore: async () => {
      if (state.isLoading || !state.hasMore || !state.lastTransactionId) return;

      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      try {
        const response = await apiService.getTransactionsCursor(
          {}, // Apply current filters if needed
          { limit: 50, afterId: state.lastTransactionId }
        );

        const uiTransactions = response.data.map(adaptApiTransactionForUI);
        const lastId = uiTransactions.length > 0 ? Number(uiTransactions[uiTransactions.length - 1].id) : undefined;

        dispatch({
          type: 'LOAD_MORE_DATA',
          payload: {
            transactions: uiTransactions,
            hasMore: response.cursor.hasNext,
            lastId,
          },
        });
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to load more data',
        });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    refreshData: async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      try {
        const response = await apiService.getTransactionsCursor(
          {}, // No filters for refresh
          { limit: 50 }
        );

        const uiTransactions = response.data.map(adaptApiTransactionForUI);
        const lastId = uiTransactions.length > 0 ? Number(uiTransactions[uiTransactions.length - 1].id) : undefined;

        dispatch({
          type: 'SET_INITIAL_DATA',
          payload: {
            transactions: uiTransactions,
            totalCount: response.cursor.total,
            hasMore: response.cursor.hasNext,
            lastId,
          },
        });
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to refresh data',
        });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    clearError: () => {
      dispatch({ type: 'CLEAR_ERROR' });
    },

    reconnect: () => {
      wsService.connect();
    },

    disconnect: () => {
      wsService.disconnect();
    },
  };

  return (
    <TransactionContext.Provider value={{ state, actions }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error(
      'useTransactions must be used within a TransactionProvider'
    );
  }
  return context;
}

// Custom hooks for specific data
export function useConnectionState() {
  const { state } = useTransactions();
  return {
    connectionState: state.connectionState,
    isConnected: state.isConnected,
    error: state.error,
  };
}

export function useTransactionData() {
  const { state, actions } = useTransactions();
  return {
    transactions: state.transactions,
    recentTransactions: state.recentTransactions,
    filteredTransactions: state.filteredTransactions,
    filteredRecentTransactions: state.filteredRecentTransactions,
    stats: state.stats,
    isLoading: state.isLoading,
    isInitialLoad: state.isInitialLoad,
    hasMore: state.hasMore,
    lastTransactionId: state.lastTransactionId,
    totalCount: state.totalCount,
    loadMore: actions.loadMore,
    refreshData: actions.refreshData,
  };
}

export function useTransactionFilters() {
  const { state, actions } = useTransactions();
  return {
    filters: state.filters,
    toggleTokenFilter: actions.toggleTokenFilter,
    toggleAnomalies: actions.toggleAnomalies,
    setFilters: actions.setFilters,
    updateFilters: actions.updateFilters,
  };
}
