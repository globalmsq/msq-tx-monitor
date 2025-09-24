import { Transaction as SharedTransaction } from '@msq-tx-monitor/tx-types';

// UI-specific transaction interface that extends the shared type
export interface UITransaction {
  id: string;
  hash: string;
  from: string; // mapped from fromAddress
  to: string; // mapped from toAddress
  value: string;
  token: string; // mapped from tokenSymbol
  timestamp: number; // converted from Date to number
  blockNumber: number;
  gasUsed: string;
  gasPrice: string;
  status: 'pending' | 'confirmed' | 'failed';
  anomalyScore?: number;
}

// Adapter function to convert shared Transaction to UI Transaction
export function adaptTransactionForUI(tx: SharedTransaction): UITransaction {
  return {
    id: tx.id,
    hash: tx.hash,
    from: tx.fromAddress,
    to: tx.toAddress,
    value: tx.value,
    token: tx.tokenSymbol,
    timestamp: tx.timestamp.getTime(),
    blockNumber: tx.blockNumber,
    gasUsed: tx.gasUsed?.toString() || '0',
    gasPrice: tx.gasPrice?.toString() || '0',
    status: 'confirmed', // Default status for shared transactions
    anomalyScore: tx.anomalyScore,
  };
}

// Adapter function to convert WebSocket data to UI Transaction
export function adaptWebSocketTransactionForUI(
  txData: Record<string, unknown>
): UITransaction {
  const uniqueId = `${txData.transactionHash || txData.hash}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return {
    id: uniqueId,
    hash: (txData.transactionHash || txData.hash || '') as string,
    from: (txData.from || '') as string,
    to: (txData.to || '') as string,
    value: (txData.value || '0') as string,
    token: (txData.tokenSymbol || txData.token || 'UNKNOWN') as string,
    timestamp:
      txData.timestamp instanceof Date
        ? txData.timestamp.getTime()
        : typeof txData.timestamp === 'number'
          ? txData.timestamp
          : Date.now(),
    blockNumber: (txData.blockNumber || 0) as number,
    gasUsed: txData.gasUsed?.toString() || '0',
    gasPrice: txData.gasPrice?.toString() || '0',
    status: 'confirmed' as const,
    anomalyScore: txData.anomalyScore as number | undefined,
  };
}

// Re-export the UI Transaction as the default Transaction type for the dashboard
export type Transaction = UITransaction;
