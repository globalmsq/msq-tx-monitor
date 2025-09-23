import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { wsService, ConnectionState, TransactionMessage } from '../services/websocket';

// Transaction types from shared types
interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  token: string;
  timestamp: number;
  blockNumber: number;
  gasUsed: string;
  gasPrice: string;
  status: 'pending' | 'confirmed' | 'failed';
  anomalyScore?: number;
}

interface TransactionStats {
  totalTransactions: number;
  activeAddresses: number;
  volume24h: string;
  avgTxSize: string;
  totalVolume: string;
  successRate: number;
}

interface TransactionState {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;

  // Transaction data
  transactions: Transaction[];
  recentTransactions: Transaction[];
  stats: TransactionStats;

  // Filters
  selectedTokens: string[];
  showAnomalies: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;
}

type TransactionAction =
  | { type: 'SET_CONNECTION_STATE'; payload: ConnectionState }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'UPDATE_STATS'; payload: Partial<TransactionStats> }
  | { type: 'SET_TOKEN_FILTER'; payload: string[] }
  | { type: 'TOGGLE_ANOMALIES'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

const initialStats: TransactionStats = {
  totalTransactions: 0,
  activeAddresses: 0,
  volume24h: '$0',
  avgTxSize: '$0',
  totalVolume: '$0',
  successRate: 0
};

const initialState: TransactionState = {
  connectionState: ConnectionState.DISCONNECTED,
  isConnected: false,
  transactions: [],
  recentTransactions: [],
  stats: initialStats,
  selectedTokens: ['MSQ', 'SUT', 'KWT', 'P2UC'],
  showAnomalies: false,
  isLoading: false,
  error: null
};

function transactionReducer(state: TransactionState, action: TransactionAction): TransactionState {
  switch (action.type) {
    case 'SET_CONNECTION_STATE':
      return {
        ...state,
        connectionState: action.payload,
        isConnected: action.payload === ConnectionState.CONNECTED
      };

    case 'ADD_TRANSACTION':
      const newTransaction = action.payload;
      const updatedTransactions = [newTransaction, ...state.transactions].slice(0, 1000); // Keep last 1000
      const updatedRecent = [newTransaction, ...state.recentTransactions].slice(0, 50); // Keep last 50

      return {
        ...state,
        transactions: updatedTransactions,
        recentTransactions: updatedRecent
      };

    case 'UPDATE_TRANSACTIONS':
      return {
        ...state,
        transactions: action.payload,
        recentTransactions: action.payload.slice(0, 50)
      };

    case 'UPDATE_STATS':
      return {
        ...state,
        stats: { ...state.stats, ...action.payload }
      };

    case 'SET_TOKEN_FILTER':
      return {
        ...state,
        selectedTokens: action.payload
      };

    case 'TOGGLE_ANOMALIES':
      return {
        ...state,
        showAnomalies: action.payload
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
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
    clearError: () => void;
    reconnect: () => void;
    disconnect: () => void;
  };
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

interface TransactionProviderProps {
  children: ReactNode;
}

export function TransactionProvider({ children }: TransactionProviderProps) {
  const [state, dispatch] = useReducer(transactionReducer, initialState);

  useEffect(() => {
    // Set up WebSocket connection
    const unsubscribeMessages = wsService.subscribe((message: TransactionMessage) => {
      switch (message.type) {
        case 'transaction':
          if (message.data) {
            dispatch({ type: 'ADD_TRANSACTION', payload: message.data });
          }
          break;

        case 'connection':
          if (message.data?.stats) {
            dispatch({ type: 'UPDATE_STATS', payload: message.data.stats });
          }
          break;

        case 'error':
          dispatch({ type: 'SET_ERROR', payload: message.data?.message || 'WebSocket error' });
          break;
      }
    });

    const unsubscribeState = wsService.onConnectionStateChange((connectionState: ConnectionState) => {
      dispatch({ type: 'SET_CONNECTION_STATE', payload: connectionState });

      if (connectionState === ConnectionState.ERROR) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to connect to transaction stream' });
      } else if (connectionState === ConnectionState.CONNECTED) {
        dispatch({ type: 'CLEAR_ERROR' });
        // Request initial data
        wsService.send({ type: 'subscribe', tokens: state.selectedTokens });
      }
    });

    // Connect to WebSocket
    wsService.connect();

    return () => {
      unsubscribeMessages();
      unsubscribeState();
      wsService.disconnect();
    };
  }, []);

  // Update token subscription when filter changes
  useEffect(() => {
    if (wsService.isConnected()) {
      wsService.send({
        type: 'subscribe',
        tokens: state.selectedTokens,
        includeAnomalies: state.showAnomalies
      });
    }
  }, [state.selectedTokens, state.showAnomalies]);

  const actions = {
    toggleTokenFilter: (token: string) => {
      const currentTokens = state.selectedTokens;
      const newTokens = currentTokens.includes(token)
        ? currentTokens.filter(t => t !== token)
        : [...currentTokens, token];

      dispatch({ type: 'SET_TOKEN_FILTER', payload: newTokens });
    },

    toggleAnomalies: () => {
      dispatch({ type: 'TOGGLE_ANOMALIES', payload: !state.showAnomalies });
    },

    clearError: () => {
      dispatch({ type: 'CLEAR_ERROR' });
    },

    reconnect: () => {
      wsService.connect();
    },

    disconnect: () => {
      wsService.disconnect();
    }
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
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}

// Custom hooks for specific data
export function useConnectionState() {
  const { state } = useTransactions();
  return {
    connectionState: state.connectionState,
    isConnected: state.isConnected,
    error: state.error
  };
}

export function useTransactionData() {
  const { state } = useTransactions();
  return {
    transactions: state.transactions,
    recentTransactions: state.recentTransactions,
    stats: state.stats,
    isLoading: state.isLoading
  };
}

export function useTransactionFilters() {
  const { state, actions } = useTransactions();
  return {
    selectedTokens: state.selectedTokens,
    showAnomalies: state.showAnomalies,
    toggleTokenFilter: actions.toggleTokenFilter,
    toggleAnomalies: actions.toggleAnomalies
  };
}