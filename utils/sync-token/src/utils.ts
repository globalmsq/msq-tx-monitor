import { PolygonScanTransaction, TransactionData } from './types';

/**
 * Convert PolygonScan transaction to database format
 */
export function convertToTransactionData(
  tx: PolygonScanTransaction
): TransactionData {
  return {
    hash: tx.hash,
    blockNumber: BigInt(tx.blockNumber),
    transactionIndex: parseInt(tx.transactionIndex),
    fromAddress: tx.from.toLowerCase(),
    toAddress: tx.to.toLowerCase(),
    value: tx.value,
    tokenAddress: tx.contractAddress.toLowerCase(),
    tokenSymbol: tx.tokenSymbol,
    tokenDecimals: parseInt(tx.tokenDecimal),
    gasUsed: BigInt(tx.gasUsed),
    gasPrice: BigInt(tx.gasPrice),
    // Convert Unix timestamp to Date
    timestamp: new Date(parseInt(tx.timeStamp) * 1000),
    status: 1, // PolygonScan only returns successful transactions
  };
}

/**
 * Split array into chunks
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(current: number, total: number): string {
  if (total === 0) return '0.0';
  return ((current / total) * 100).toFixed(1);
}

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
