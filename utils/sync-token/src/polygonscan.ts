import axios, { AxiosInstance } from 'axios';
import { PolygonScanApiResponse, PolygonScanTransaction } from './types';

export class PolygonScanClient {
  private client: AxiosInstance;
  private apiKey: string;
  private requestDelay: number;
  private blockRangeChunkSize: number;
  private lastRequestTime: number = 0;

  constructor(
    apiKey: string,
    requestDelay: number = 200,
    blockRangeChunkSize: number = 10000
  ) {
    this.apiKey = apiKey;
    this.requestDelay = requestDelay;
    this.blockRangeChunkSize = blockRangeChunkSize;

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
      const timestamp = new Date().toISOString();
      console.log(
        `    ⏳ [${timestamp}] Rate limit: waiting ${waitTime}ms...`
      );
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get token transfers for a specific contract address with adaptive retry
   */
  async getTokenTransfers(
    contractAddress: string,
    startBlock: number,
    endBlock: number = 999999999,
    page: number = 1,
    offset: number = 10000
  ): Promise<PolygonScanTransaction[]> {
    return this.getTokenTransfersWithRetry(
      contractAddress,
      startBlock,
      endBlock,
      page,
      offset,
      10 // Minimum block range
    );
  }

  /**
   * Get token transfers with automatic retry and block range splitting on timeout
   */
  private async getTokenTransfersWithRetry(
    contractAddress: string,
    startBlock: number,
    endBlock: number,
    page: number,
    offset: number,
    minBlockRange: number
  ): Promise<PolygonScanTransaction[]> {
    await this.waitForRateLimit();

    const blockRange = endBlock - startBlock + 1;
    const requestTime = new Date().toISOString();
    console.log(
      `    🌐 [${requestTime}] API Call: blocks ${startBlock}-${endBlock} (${blockRange} blocks)`
    );

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

      const responseTime = new Date().toISOString();
      console.log(`    ✓ [${responseTime}] API Response received`);

      if (response.data.status === '0') {
        // Status 0 could mean "No records found" or an error
        if (response.data.message === 'No transactions found') {
          return [];
        }

        // Check if it's a timeout error and we can split the range
        if (
          response.data.message.includes('Query Timeout') &&
          blockRange > minBlockRange
        ) {
          const midBlock = Math.floor((startBlock + endBlock) / 2);
          console.log(
            `    ⚠️  Timeout! Splitting ${startBlock}-${endBlock} into two ranges:`
          );
          console.log(`       → ${startBlock}-${midBlock} (${midBlock - startBlock + 1} blocks)`);
          console.log(`       → ${midBlock + 1}-${endBlock} (${endBlock - midBlock} blocks)`);

          // Recursively fetch both halves SEQUENTIALLY to respect rate limits
          const firstHalf = await this.getTokenTransfersWithRetry(
            contractAddress,
            startBlock,
            midBlock,
            page,
            offset,
            minBlockRange
          );
          const secondHalf = await this.getTokenTransfersWithRetry(
            contractAddress,
            midBlock + 1,
            endBlock,
            page,
            offset,
            minBlockRange
          );

          return [...firstHalf, ...secondHalf];
        }

        // If we can't split or it's another error, throw
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
   * Uses chunked block ranges to prevent API timeouts when scanning large block ranges.
   * Each chunk scans a limited number of blocks to avoid PolygonScan timeout errors.
   * Simple sequential processing with proper rate limiting between requests.
   *
   * @param contractAddress Token contract address
   * @param startBlock Starting block number
   * @param endBlock Ending block number (optional, defaults to latest)
   * @param onBatch Callback to process each batch of transactions
   * @param tokenSymbol Optional token symbol for progress display
   * @returns Total number of transactions processed
   */
  async streamTokenTransfers(
    contractAddress: string,
    startBlock: number,
    endBlock: number | undefined,
    onBatch: (
      batch: PolygonScanTransaction[],
      iteration: number,
      currentBlock: number
    ) => Promise<void>,
    tokenSymbol?: string
  ): Promise<number> {
    let currentChunkStart = startBlock;
    let iteration = 1;
    let totalProcessed = 0;
    const targetEndBlock = endBlock ?? 999999999;
    const totalBlocks = targetEndBlock - startBlock + 1;

    // Iterate through block ranges in chunks
    while (currentChunkStart <= targetEndBlock) {
      // Calculate end block for this chunk
      const chunkEndBlock = Math.min(
        currentChunkStart + this.blockRangeChunkSize - 1,
        targetEndBlock
      );

      // Calculate progress
      const blocksProcessed = currentChunkStart - startBlock;
      const progressPercent = ((blocksProcessed / totalBlocks) * 100).toFixed(2);
      const tokenPrefix = tokenSymbol ? `[${tokenSymbol}] ` : '';

      console.log(
        `  📄 ${tokenPrefix}Fetching batch ${iteration} (blocks ${currentChunkStart}-${chunkEndBlock}) [${progressPercent}%]...`
      );

      // Fetch transactions for this chunk (single API call per chunk)
      const transactions = await this.getTokenTransfers(
        contractAddress,
        currentChunkStart,
        chunkEndBlock,
        1,
        10000
      );

      if (transactions.length > 0) {
        totalProcessed += transactions.length;

        console.log(
          `  ✅ ${tokenPrefix}Batch ${iteration}: ${transactions.length} transactions [${progressPercent}%]`
        );

        // Process batch immediately with current block info
        await onBatch(transactions, iteration, chunkEndBlock);
      } else {
        console.log(`  ✅ ${tokenPrefix}No transactions in batch ${iteration} [${progressPercent}%]`);
      }

      // Move to next chunk
      currentChunkStart = chunkEndBlock + 1;
      iteration++;
    }

    const tokenPrefix = tokenSymbol ? `[${tokenSymbol}] ` : '';
    console.log(`  ✅ ${tokenPrefix}Completed all chunks. Total processed: ${totalProcessed} [100.00%]`);
    return totalProcessed;
  }
}
