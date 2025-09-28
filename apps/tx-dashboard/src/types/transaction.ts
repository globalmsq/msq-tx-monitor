import { Transaction as SharedTransaction } from '@msq-tx-monitor/tx-types';
import { formatTokenValue } from '../utils/tokenUtils';
import { ApiTransaction } from '../services/api';

// UI-specific transaction interface that extends the shared type
export interface UITransaction {
  id: string;
  hash: string;
  from: string; // mapped from fromAddress
  to: string; // mapped from toAddress
  value: string; // formatted value with decimals
  rawValue: string; // original raw value
  token: string; // mapped from tokenSymbol
  tokenAddress?: string; // token contract address
  timestamp: number; // converted from Date to number
  blockNumber: number;
  gasUsed: string;
  gasPrice: string;
  txnFee?: string; // calculated transaction fee in MATIC
  status: 'pending' | 'confirmed' | 'failed';
  anomalyScore?: number;
}

// Adapter function to convert shared Transaction to UI Transaction
export function adaptTransactionForUI(tx: SharedTransaction): UITransaction {
  const rawValue = tx.value;
  const tokenAddress = tx.tokenAddress;
  const tokenSymbol = tx.tokenSymbol;

  return {
    id: tx.id,
    hash: tx.hash,
    from: tx.fromAddress,
    to: tx.toAddress,
    value: formatTokenValue(rawValue, tokenSymbol, tokenAddress),
    rawValue: rawValue,
    token: tokenSymbol,
    tokenAddress: tokenAddress,
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

  const rawValue = (txData.value || '0') as string;
  const tokenAddress = (txData.tokenAddress || '') as string;
  const tokenSymbol = (txData.tokenSymbol ||
    txData.token ||
    'UNKNOWN') as string;

  return {
    id: uniqueId,
    hash: (txData.transactionHash || txData.hash || '') as string,
    from: (txData.from || '') as string,
    to: (txData.to || '') as string,
    value: formatTokenValue(rawValue, tokenSymbol, tokenAddress),
    rawValue: rawValue,
    token: tokenSymbol,
    tokenAddress: tokenAddress,
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

// Adapter function to convert API transaction to UI Transaction
export function adaptApiTransactionForUI(apiTx: ApiTransaction): UITransaction {
  // Calculate Txn Fee (gasUsed * gasPrice / 10^18)
  let txnFee: string | undefined = undefined;
  if (apiTx.gas_used && apiTx.gas_price) {
    try {
      // Convert to Number for proper decimal division
      const gasUsed = Number(apiTx.gas_used);
      const gasPrice = Number(apiTx.gas_price);
      const feeInEther = (gasUsed * gasPrice) / 1e18;

      // Format with appropriate precision
      if (feeInEther < 0.000001) {
        txnFee = '<0.000001';
      } else {
        txnFee = feeInEther.toFixed(6);
      }
    } catch (error) {
      console.warn('Error calculating transaction fee:', error);
    }
  }

  return {
    id: apiTx.id.toString(),
    hash: apiTx.hash,
    from: apiTx.from_address,
    to: apiTx.to_address,
    value: formatTokenValue(
      apiTx.amount_raw || apiTx.amount,
      apiTx.token_symbol,
      apiTx.token_address
    ),
    rawValue: apiTx.amount_raw || apiTx.amount,
    token: apiTx.token_symbol,
    tokenAddress: apiTx.token_address,
    timestamp: new Date(apiTx.timestamp).getTime(),
    blockNumber: apiTx.block_number,
    gasUsed: apiTx.gas_used?.toString() || '0',
    gasPrice: apiTx.gas_price || '0',
    txnFee: txnFee,
    status: 'confirmed' as const, // Assume confirmed for now
    anomalyScore: apiTx.anomaly_score,
  };
}

// Re-export the UI Transaction as the default Transaction type for the dashboard
export type Transaction = UITransaction;
