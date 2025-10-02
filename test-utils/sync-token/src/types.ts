/**
 * PolygonScan API Response Types
 */
export interface PolygonScanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

export interface PolygonScanApiResponse {
  status: string;
  message: string;
  result: PolygonScanTransaction[];
}

/**
 * Database Transaction Data
 */
export interface TransactionData {
  hash: string;
  blockNumber: bigint;
  transactionIndex: number;
  fromAddress: string;
  toAddress: string;
  value: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  gasUsed: bigint;
  gasPrice: bigint;
  timestamp: Date;
  status: number; // 1 = success (PolygonScan only returns successful txs)
}

/**
 * Token Configuration
 */
export interface TokenConfig {
  symbol: string;
  address: string;
  deploymentBlock: number;
}

/**
 * Sync Progress
 */
export interface SyncProgress {
  token: string;
  currentPage: number;
  totalFetched: number;
  totalSaved: number;
  lastBlock: number;
}
