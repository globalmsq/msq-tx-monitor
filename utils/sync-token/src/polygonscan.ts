import axios, { AxiosInstance } from 'axios';
import { PolygonScanApiResponse, PolygonScanTransaction } from './types';

export class PolygonScanClient {
  private client: AxiosInstance;
  private apiKey: string;
  private requestDelay: number;
  private lastRequestTime: number = 0;

  constructor(apiKey: string, requestDelay: number = 200) {
    this.apiKey = apiKey;
    this.requestDelay = requestDelay;

    this.client = axios.create({
      baseURL: 'https://api.etherscan.io/v2/api',
      timeout: 30000,
    });
  }

  /**
   * Rate limiting: Ensure minimum delay between requests
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get token transfers for a specific contract address
   */
  async getTokenTransfers(
    contractAddress: string,
    startBlock: number,
    endBlock: number = 999999999,
    page: number = 1,
    offset: number = 10000
  ): Promise<PolygonScanTransaction[]> {
    await this.waitForRateLimit();

    try {
      const response = await this.client.get<PolygonScanApiResponse>('', {
        params: {
          chainid: '137', // Polygon mainnet chain ID
          module: 'account',
          action: 'tokentx',
          contractaddress: contractAddress,
          startblock: startBlock,
          endblock: endBlock,
          page: page,
          offset: offset,
          sort: 'asc',
          apikey: this.apiKey,
        },
      });

      if (response.data.status === '0') {
        // Status 0 could mean "No records found" or an error
        if (response.data.message === 'No transactions found') {
          return [];
        }

        // Enhanced error logging for debugging
        console.error('\n❌ PolygonScan API Error Details:');
        console.error('Request Parameters:', {
          contractaddress: contractAddress,
          startblock: startBlock,
          endblock: endBlock,
          page: page,
          offset: offset,
        });
        console.error('API Response:', JSON.stringify(response.data, null, 2));

        throw new Error(
          `PolygonScan API Error: ${response.data.message}\n` +
            `Result: ${JSON.stringify(response.data.result)}\n` +
            `Contract: ${contractAddress}, Block Range: ${startBlock}-${endBlock}`
        );
      }

      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`PolygonScan API request failed: ${error.message}`);
      }
      throw error as Error;
    }
  }

  /**
   * Get all token transfers with automatic pagination using block ranges
   * V2 API limitation: PageNo × Offset ≤ 10,000
   * Solution: Use single page (page=1, offset=10000) and iterate by block ranges
   *
   * @deprecated Use streamTokenTransfers instead for memory efficiency
   */
  async getAllTokenTransfers(
    contractAddress: string,
    startBlock: number,
    onProgress?: (page: number, count: number) => void
  ): Promise<PolygonScanTransaction[]> {
    const allTransactions: PolygonScanTransaction[] = [];
    let currentStartBlock = startBlock;
    let iteration = 1;
    const pageSize = 10000; // Max results per request

    while (true) {
      console.log(
        `  📄 Fetching batch ${iteration} (from block ${currentStartBlock})...`
      );

      const transactions = await this.getTokenTransfers(
        contractAddress,
        currentStartBlock,
        999999999,
        1, // Always use page 1
        pageSize
      );

      if (transactions.length === 0) {
        console.log(`  ✅ No more transactions (batch ${iteration})`);
        break;
      }

      allTransactions.push(...transactions);

      if (onProgress) {
        onProgress(iteration, allTransactions.length);
      }

      console.log(
        `  ✅ Batch ${iteration}: ${transactions.length} transactions (Total: ${allTransactions.length})`
      );

      // If we got less than pageSize, we've reached the end
      if (transactions.length < pageSize) {
        break;
      }

      // Update startBlock to continue from the last transaction's block + 1
      const lastTransaction = transactions[transactions.length - 1];
      const lastBlockNumber = parseInt(lastTransaction.blockNumber, 10);
      currentStartBlock = lastBlockNumber + 1;

      iteration++;
    }

    return allTransactions;
  }

  /**
   * Stream token transfers with automatic pagination using block ranges
   * Memory-efficient approach: processes each batch immediately via callback
   *
   * @param contractAddress Token contract address
   * @param startBlock Starting block number
   * @param endBlock Ending block number (optional, defaults to latest)
   * @param onBatch Callback to process each batch of transactions
   * @returns Total number of transactions processed
   */
  async streamTokenTransfers(
    contractAddress: string,
    startBlock: number,
    endBlock: number | undefined,
    onBatch: (
      batch: PolygonScanTransaction[],
      iteration: number
    ) => Promise<void>
  ): Promise<number> {
    let currentStartBlock = startBlock;
    let iteration = 1;
    let totalProcessed = 0;
    const pageSize = 10000; // Max results per request
    const targetEndBlock = endBlock ?? 999999999;

    while (true) {
      console.log(
        `  📄 Fetching batch ${iteration} (from block ${currentStartBlock})...`
      );

      const transactions = await this.getTokenTransfers(
        contractAddress,
        currentStartBlock,
        targetEndBlock,
        1, // Always use page 1
        pageSize
      );

      if (transactions.length === 0) {
        console.log(`  ✅ No more transactions (batch ${iteration})`);
        break;
      }

      totalProcessed += transactions.length;

      console.log(
        `  ✅ Batch ${iteration}: ${transactions.length} transactions`
      );

      // Process batch immediately (streaming approach)
      await onBatch(transactions, iteration);

      // If we got less than pageSize, we've reached the end
      if (transactions.length < pageSize) {
        break;
      }

      // Update startBlock to continue from the last transaction's block + 1
      const lastTransaction = transactions[transactions.length - 1];
      const lastBlockNumber = parseInt(lastTransaction.blockNumber, 10);

      // Stop if we've reached or exceeded the target end block
      if (lastBlockNumber >= targetEndBlock) {
        console.log(`  ✅ Reached target end block ${targetEndBlock}`);
        break;
      }

      currentStartBlock = lastBlockNumber + 1;

      iteration++;
    }

    return totalProcessed;
  }
}
