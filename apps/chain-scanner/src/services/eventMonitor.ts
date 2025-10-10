import { createClient, RedisClientType } from 'redis';
import { Web3Service } from './web3Service';
import { DatabaseService, TransactionData } from './databaseService';
import { config } from '../config';
import {
  TOKEN_ADDRESSES,
  TRANSFER_EVENT_SIGNATURE,
  MONITORING_INTERVALS,
  EVENT_TYPES,
  REDIS_KEYS,
  MIN_DEPLOYMENT_BLOCK,
} from '../config/constants';
import { TokenService } from './tokenService';
import { logger } from '@msq-tx-monitor/msq-common';
import { Block, Transaction, TransactionReceipt } from 'web3';

export interface EventData {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  transactionIndex: string;
  blockHash: string;
  logIndex: string;
  removed: boolean;
}

export interface ProcessedEvent {
  type: string;
  transactionHash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  timestamp: Date;
  gasPrice?: string;
  gasUsed?: string;
  status?: number; // 0 = failed, 1 = success
}

export class EventMonitor {
  private subscriptions: Map<string, string> = new Map();
  private processingQueue: EventData[] = [];
  private processingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private eventListeners: Map<string, ((data?: unknown) => void)[]> = new Map();
  private lastProcessedBlock: number = 0;
  private blockPollingTimer: NodeJS.Timeout | null = null;
  private redisClient: RedisClientType | null = null;

  constructor(
    private web3Service: Web3Service,
    private databaseService: DatabaseService,
    private tokenService: TokenService
  ) {
    this.setupEventHandlers();
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
        database: config.redis.db,
      });

      this.redisClient.on('error', error => {
        logger.error('❌ Redis error:', error);
      });

      await this.redisClient.connect();
      logger.info('✅ Redis connected for block sync');
    } catch (error) {
      logger.warn(
        '⚠️ Redis connection failed, block sync will use database only:',
        error
      );
      this.redisClient = null;
    }
  }

  private setupEventHandlers(): void {
    this.web3Service.on('connection', this.handleConnection.bind(this));
    this.web3Service.on('disconnection', this.handleDisconnection.bind(this));
  }

  private async handleConnection(): Promise<void> {
    logger.info('Web3 connected, starting event monitoring...');
    await this.startMonitoring();
  }

  private handleDisconnection(): void {
    logger.info('Web3 disconnected, stopping event monitoring...');
    this.stopMonitoring();
  }

  /**
   * Get last processed block number from database (source of truth)
   * Priority: Database -> MIN_DEPLOYMENT_BLOCK
   * Redis is synchronized with database value on startup
   * Ensures returned block is never below MIN_DEPLOYMENT_BLOCK (earliest token deployment)
   */
  private async getLastProcessedBlockNumber(): Promise<number> {
    try {
      // 1. Always prioritize database as source of truth
      const dbBlock = await this.databaseService.getLastProcessedBlock();

      if (dbBlock && dbBlock > 0) {
        const effectiveBlock = Math.max(dbBlock, MIN_DEPLOYMENT_BLOCK);

        if (effectiveBlock > dbBlock) {
          logger.info(
            `📖 Loaded block ${dbBlock} from database, adjusted to min deployment block ${effectiveBlock}`
          );
        } else {
          logger.info(
            `📖 Loaded last processed block from database: ${dbBlock}`
          );
        }

        // Sync Redis with database value
        await this.saveLastProcessedBlockNumber(effectiveBlock);
        logger.info(`🔄 Redis synchronized with database: ${effectiveBlock}`);

        return effectiveBlock;
      }

      // 2. No database records - start from minimum deployment block
      logger.info(
        `📖 No saved block found in database, starting from min deployment block ${MIN_DEPLOYMENT_BLOCK}`
      );

      // Initialize Redis with minimum deployment block
      await this.saveLastProcessedBlockNumber(MIN_DEPLOYMENT_BLOCK);

      return MIN_DEPLOYMENT_BLOCK;
    } catch (error) {
      logger.error('❌ Error getting last processed block:', error);
      return MIN_DEPLOYMENT_BLOCK;
    }
  }

  /**
   * Save last processed block number to Redis
   */
  private async saveLastProcessedBlockNumber(
    blockNumber: number
  ): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.set(
          REDIS_KEYS.LAST_PROCESSED_BLOCK,
          blockNumber.toString()
        );
      }
    } catch (error) {
      logger.error('❌ Error saving last processed block to Redis:', error);
    }
  }

  /**
   * Fast catch-up mode for processing many blocks quickly
   */
  private async fastCatchUp(fromBlock: number, toBlock: number): Promise<void> {
    const batchSize = config.monitoring.catchUpBatchSize;
    const totalBlocks = toBlock - fromBlock;

    logger.info(
      `🚀 Catch-up mode: processing ${totalBlocks} blocks in batches of ${batchSize}`
    );

    for (let start = fromBlock + 1; start <= toBlock; start += batchSize) {
      const end = Math.min(start + batchSize - 1, toBlock);

      try {
        // Process 100 blocks at once with a single getLogs call
        await this.fetchAllTokenEventsWithRetry(
          Object.values(TOKEN_ADDRESSES),
          start,
          end
        );

        this.lastProcessedBlock = end;

        // Save progress every batch
        await this.saveLastProcessedBlockNumber(end);

        const progress = (((end - fromBlock) / totalBlocks) * 100).toFixed(1);
        logger.info(`📦 Catch-up progress: ${end}/${toBlock} (${progress}%)`);

        // Rate limit prevention delay
        await new Promise(resolve =>
          setTimeout(resolve, config.monitoring.catchUpBatchDelay)
        );
      } catch (error) {
        logger.error(`❌ Error processing blocks ${start}-${end}:`, error);
        // Continue with next batch even if one fails
      }
    }

    logger.info(`✅ Catch-up completed: ${totalBlocks} blocks processed`);
  }

  async startMonitoring(): Promise<void> {
    if (!this.web3Service.isConnected()) {
      throw new Error('Web3 service not connected');
    }

    logger.info(
      '🚀 Starting ERC-20 Transfer event monitoring with HTTP RPC polling...'
    );

    try {
      const savedBlock = await this.getLastProcessedBlockNumber();
      const currentBlock = await this.web3Service.getLatestBlockNumber();
      const gap = currentBlock - savedBlock;

      logger.info(
        `📊 Block status: saved=${savedBlock}, current=${currentBlock}, gap=${gap}`
      );

      // Start event processing queue first (required for processing caught-up events)
      logger.info('📋 Starting event processing queue...');
      this.startProcessingQueue();

      let needsCatchUp = false;

      // Determine strategy based on gap size
      if (gap > config.monitoring.catchUpMaxGap) {
        // Too far behind - only process recent blocks, but never go below min deployment block
        const calculatedStart =
          currentBlock - config.monitoring.catchUpMaxBlocks;
        this.lastProcessedBlock = Math.max(
          calculatedStart,
          MIN_DEPLOYMENT_BLOCK
        );

        logger.warn(
          `⚠️ ${gap} blocks behind, limiting catch-up to recent ${config.monitoring.catchUpMaxBlocks} blocks`
        );
        logger.info(
          `📍 Catch-up range: ${this.lastProcessedBlock} → ${currentBlock}`
        );

        if (
          this.lastProcessedBlock === MIN_DEPLOYMENT_BLOCK &&
          calculatedStart < MIN_DEPLOYMENT_BLOCK
        ) {
          logger.info(
            `📍 Adjusted start block to minimum deployment block ${MIN_DEPLOYMENT_BLOCK} (earliest token: MSQ)`
          );
        }

        await this.saveLastProcessedBlockNumber(this.lastProcessedBlock);
        needsCatchUp = true;
        await this.fastCatchUp(this.lastProcessedBlock, currentBlock);
      } else if (gap > 1000) {
        // Medium gap - fast catch-up mode
        logger.info(
          `📦 Gap detected: ${gap} blocks to catch up, starting catch-up mode`
        );
        logger.info(`📍 Catch-up range: ${savedBlock} → ${currentBlock}`);

        this.lastProcessedBlock = savedBlock > 0 ? savedBlock : currentBlock;
        needsCatchUp = true;
        await this.fastCatchUp(this.lastProcessedBlock, currentBlock);
      } else {
        // Small gap or first run - skip catch-up, start real-time mode directly
        this.lastProcessedBlock = savedBlock > 0 ? savedBlock : currentBlock;
        logger.info(
          `✅ Small gap (${gap} blocks), starting real-time monitoring from block ${this.lastProcessedBlock}`
        );
      }

      // Wait a moment for queued events to be processed before starting real-time polling
      if (needsCatchUp) {
        logger.info(
          '⏳ Waiting for catch-up events to process before starting real-time monitoring...'
        );
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }

      // Start real-time HTTP polling (only after catch-up is complete)
      logger.info(
        '🔴 Starting real-time block polling for new transactions...'
      );
      this.startBlockPolling();

      const tokenAddresses = Object.values(TOKEN_ADDRESSES);
      logger.info(
        `📊 Monitoring ${tokenAddresses.length} tokens for Transfer events`
      );
      logger.info(`🎯 Tokens: ${Object.keys(TOKEN_ADDRESSES).join(', ')}`);
      logger.info(`✅ Event monitoring fully initialized and running`);
    } catch (error) {
      logger.error('❌ Failed to start monitoring:', error);
      throw error;
    }
  }

  private startBlockPolling(): void {
    if (this.blockPollingTimer) {
      clearInterval(this.blockPollingTimer);
    }

    logger.info(
      `🔄 Starting block polling every ${config.monitoring.blockPollingInterval}ms`
    );

    this.blockPollingTimer = setInterval(async () => {
      await this.pollForNewBlocks();
    }, config.monitoring.blockPollingInterval);
  }

  private async pollForNewBlocks(): Promise<void> {
    try {
      const currentBlockNumber = await this.web3Service.getLatestBlockNumber();

      if (currentBlockNumber > this.lastProcessedBlock) {
        const totalBlocksToProcess =
          currentBlockNumber - this.lastProcessedBlock;
        const maxBlocksThisPoll = Math.min(
          totalBlocksToProcess,
          config.monitoring.maxBlocksPerPoll
        );

        logger.info(
          `🔍 New blocks detected: ${currentBlockNumber} (last processed: ${this.lastProcessedBlock})`
        );

        if (totalBlocksToProcess > config.monitoring.maxBlocksPerPoll) {
          logger.warn(
            `⚠️ Too many blocks behind (${totalBlocksToProcess}), processing ${maxBlocksThisPoll} blocks this round`
          );
        }

        // Process limited number of blocks to prevent RPC overload
        const endBlock = this.lastProcessedBlock + maxBlocksThisPoll;
        for (
          let blockNum = this.lastProcessedBlock + 1;
          blockNum <= endBlock;
          blockNum++
        ) {
          await this.processBlock(blockNum);
        }

        this.lastProcessedBlock = endBlock;

        // Save progress periodically (every N blocks)
        if (endBlock % config.monitoring.blockSaveInterval === 0) {
          await this.saveLastProcessedBlockNumber(endBlock);
        }

        // Log remaining blocks if any
        if (endBlock < currentBlockNumber) {
          logger.info(
            `📝 ${currentBlockNumber - endBlock} blocks remaining for next poll cycle`
          );
        }
      }
    } catch (error) {
      logger.error('❌ Error polling for new blocks:', error);
    }
  }

  private async processBlock(blockNumber: number): Promise<void> {
    try {
      const tokenAddresses = Object.values(TOKEN_ADDRESSES);

      // Fetch events for all tokens in this block with a single request
      try {
        await this.fetchAllTokenEventsWithRetry(
          tokenAddresses,
          blockNumber,
          blockNumber
        );
      } catch (error) {
        logger.error(
          `❌ Error fetching events for all tokens in block ${blockNumber}:`,
          error
        );

        // Only fallback to individual tokens if explicitly enabled
        if (!config.monitoring.disableIndividualTokenFallback) {
          logger.info(
            `🔄 Falling back to individual token requests for block ${blockNumber}`
          );
          for (const tokenAddress of tokenAddresses) {
            try {
              await this.fetchTokenEventsWithRetry(
                tokenAddress,
                blockNumber,
                blockNumber
              );
              // Add delay between requests to avoid rate limiting
              await new Promise(resolve =>
                setTimeout(resolve, config.monitoring.requestDelay)
              );
            } catch (individualError) {
              logger.error(
                `❌ Error fetching events for token ${tokenAddress} in block ${blockNumber}:`,
                individualError
              );
              // Continue with other tokens even if one fails
            }
          }
        } else {
          logger.warn(
            `⚠️ Individual token fallback disabled, skipping block ${blockNumber} events`
          );
        }
      }
    } catch (error) {
      logger.error(`❌ Error processing block ${blockNumber}:`, error);
    }
  }

  private async fetchAllTokenEventsWithRetry(
    tokenAddresses: string[],
    fromBlock: number,
    toBlock: number,
    retries?: number
  ): Promise<void> {
    const maxRetries = retries ?? config.monitoring.maxRetryAttempts;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.fetchAllTokenEvents(tokenAddresses, fromBlock, toBlock);
        return; // Success, exit retry loop
      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Check if it's a rate limit error
        const isRateLimitError =
          errorMessage.toLowerCase().includes('rate limit') ||
          errorMessage.toLowerCase().includes('too many requests') ||
          errorMessage.includes('429');

        if (isLastAttempt) {
          throw error; // Re-throw on final attempt
        }

        // Use different delays based on error type
        let delay: number;
        if (isRateLimitError) {
          delay = config.monitoring.rateLimitBackoffMs;
          logger.warn(
            `🚫 Rate limit detected, backing off ${delay}ms for all tokens (attempt ${attempt + 1}/${maxRetries})`
          );
        } else {
          // Exponential backoff for other errors: 1s, 2s
          delay = 1000 * Math.pow(2, attempt);
          logger.warn(
            `⚠️ Retry ${attempt + 1}/${maxRetries} for all tokens after ${delay}ms:`,
            errorMessage
          );
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async fetchTokenEventsWithRetry(
    tokenAddress: string,
    fromBlock: number,
    toBlock: number,
    retries?: number
  ): Promise<void> {
    const maxRetries = retries ?? config.monitoring.maxRetryAttempts;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.fetchTokenEvents(tokenAddress, fromBlock, toBlock);
        return; // Success, exit retry loop
      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Check if it's a rate limit error
        const isRateLimitError =
          errorMessage.toLowerCase().includes('rate limit') ||
          errorMessage.toLowerCase().includes('too many requests') ||
          errorMessage.includes('429');

        if (isLastAttempt) {
          throw error; // Re-throw on final attempt
        }

        // Use different delays based on error type
        let delay: number;
        if (isRateLimitError) {
          delay = config.monitoring.rateLimitBackoffMs;
          logger.warn(
            `🚫 Rate limit detected for token ${tokenAddress}, backing off ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
          );
        } else {
          // Exponential backoff for other errors: 1s, 2s
          delay = 1000 * Math.pow(2, attempt);
          logger.warn(
            `⚠️ Retry ${attempt + 1}/${maxRetries} for token ${tokenAddress} after ${delay}ms:`,
            errorMessage
          );
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async fetchAllTokenEvents(
    tokenAddresses: string[],
    fromBlock: number,
    toBlock: number
  ): Promise<void> {
    try {
      const logs = await this.web3Service.getLogs({
        address: tokenAddresses, // Multiple addresses in array
        topics: [TRANSFER_EVENT_SIGNATURE],
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const log of logs as any[]) {
        const eventData: EventData = {
          address: log.address,
          topics: log.topics,
          data: log.data,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          transactionIndex: log.transactionIndex || '0',
          blockHash: log.blockHash,
          logIndex: log.logIndex,
          removed: log.removed || false,
        };

        this.queueEvent(eventData);
      }

      if (logs.length > 0) {
        logger.info(
          `📦 Found ${logs.length} Transfer events for all tokens in blocks ${fromBlock}-${toBlock}`
        );
      }
    } catch (error) {
      logger.error(`❌ Error fetching events for all tokens:`, error);
      throw error;
    }
  }

  private async fetchTokenEvents(
    tokenAddress: string,
    fromBlock: number,
    toBlock: number
  ): Promise<void> {
    try {
      const logs = await this.web3Service.getLogs({
        address: tokenAddress,
        topics: [TRANSFER_EVENT_SIGNATURE],
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const log of logs as any[]) {
        const eventData: EventData = {
          address: log.address,
          topics: log.topics,
          data: log.data,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          transactionIndex: log.transactionIndex || '0',
          blockHash: log.blockHash,
          logIndex: log.logIndex,
          removed: log.removed || false,
        };

        this.queueEvent(eventData);
      }

      if (logs.length > 0) {
        logger.info(
          `📦 Found ${logs.length} Transfer events for token ${tokenAddress} in blocks ${fromBlock}-${toBlock}`
        );
      }
    } catch (error) {
      logger.error(
        `❌ Error fetching events for token ${tokenAddress}:`,
        error
      );
    }
  }

  private queueEvent(eventData: EventData): void {
    this.processingQueue.push(eventData);

    if (config.logging.enableBlockchainLogs) {
      logger.info(
        `Event queued: ${eventData.transactionHash} (Queue size: ${this.processingQueue.length})`
      );
    }
  }

  private startProcessingQueue(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }

    this.processingTimer = setInterval(async () => {
      await this.processQueuedEvents();
    }, MONITORING_INTERVALS.EVENT_PROCESSING);
  }

  /**
   * Fetch blockchain data (blocks, transactions, receipts) in batch to minimize RPC calls
   * This dramatically reduces RPC calls from 3N to (unique_blocks + 2*unique_transactions)
   */
  private async fetchBlockchainDataBatch(events: EventData[]): Promise<{
    blocks: Map<number, Block>;
    transactions: Map<string, Transaction>;
    receipts: Map<string, TransactionReceipt>;
  }> {
    if (!this.web3Service.isConnected()) {
      logger.warn(
        'Web3 service not connected, returning empty blockchain data'
      );
      return {
        blocks: new Map(),
        transactions: new Map(),
        receipts: new Map(),
      };
    }

    const web3 = this.web3Service.getWeb3Instance();
    if (!web3) {
      logger.warn(
        'Web3 instance not available, returning empty blockchain data'
      );
      return {
        blocks: new Map(),
        transactions: new Map(),
        receipts: new Map(),
      };
    }

    try {
      // Extract unique block numbers and transaction hashes
      const uniqueBlockNumbers = [
        ...new Set(events.map(e => parseInt(e.blockNumber, 16))),
      ];
      const uniqueTxHashes = [...new Set(events.map(e => e.transactionHash))];

      logger.info(
        `Batch fetching blockchain data: ${uniqueBlockNumbers.length} blocks, ${uniqueTxHashes.length} transactions for ${events.length} events`
      );

      const startTime = Date.now();

      // Fetch all data in parallel (3 RPC calls instead of 3*N)
      const [blocks, transactions, receipts] = await Promise.all([
        Promise.all(
          uniqueBlockNumbers.map(n =>
            web3.eth.getBlock(n).catch(err => {
              logger.error(`Error fetching block ${n}:`, err);
              return null;
            })
          )
        ),
        Promise.all(
          uniqueTxHashes.map(hash =>
            web3.eth.getTransaction(hash).catch(err => {
              logger.error(`Error fetching transaction ${hash}:`, err);
              return null;
            })
          )
        ),
        Promise.all(
          uniqueTxHashes.map(hash =>
            web3.eth.getTransactionReceipt(hash).catch(err => {
              logger.error(`Error fetching receipt ${hash}:`, err);
              return null;
            })
          )
        ),
      ]);

      const elapsed = Date.now() - startTime;
      logger.info(
        `Batch fetch completed in ${elapsed}ms (${Math.round(events.length / (elapsed / 1000))} events/sec)`
      );

      // Convert arrays to Maps for fast lookup (filter out null values)
      const blockMap = new Map<number, Block>(
        blocks.filter(b => b !== null).map(b => [Number(b!.number), b!])
      );

      const txMap = new Map<string, Transaction>(
        transactions.filter(t => t !== null).map(t => [t!.hash, t!])
      );

      const receiptMap = new Map<string, TransactionReceipt>(
        receipts.filter(r => r !== null).map(r => [r!.transactionHash, r!])
      );

      return { blocks: blockMap, transactions: txMap, receipts: receiptMap };
    } catch (error) {
      logger.error('Error in batch blockchain data fetch:', error);
      return {
        blocks: new Map(),
        transactions: new Map(),
        receipts: new Map(),
      };
    }
  }

  private async processQueuedEvents(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batchSize = Math.min(
        config.monitoring.batchSize,
        this.processingQueue.length
      );
      const eventsToProcess = this.processingQueue.splice(0, batchSize);

      const overallStartTime = Date.now();
      logger.info(`Processing ${eventsToProcess.length} events...`);

      // Fetch blockchain data in batch (major optimization)
      const blockchainData =
        await this.fetchBlockchainDataBatch(eventsToProcess);

      const processedEvents: ProcessedEvent[] = [];
      const transactionData: TransactionData[] = [];

      const processingStartTime = Date.now();
      for (const eventData of eventsToProcess) {
        try {
          // Use cached blockchain data instead of making individual RPC calls
          const processedEvent = this.processEvent(eventData, blockchainData);
          if (processedEvent) {
            processedEvents.push(processedEvent);

            const txData = await this.createTransactionData(
              processedEvent,
              eventData
            );
            if (txData) {
              transactionData.push(txData);
            }
          }
        } catch (error) {
          logger.error(
            `Error processing event ${eventData.transactionHash}:`,
            error
          );
        }
      }

      // Save to database in batch
      if (transactionData.length > 0) {
        await this.databaseService.saveTransactionBatch(transactionData);
      }

      // Emit processed events
      for (const processedEvent of processedEvents) {
        this.emit(EVENT_TYPES.NEW_TRANSACTION, processedEvent);
      }

      const overallElapsed = Date.now() - overallStartTime;
      const processingElapsed = Date.now() - processingStartTime;

      logger.info(
        `✅ Batch complete: ${processedEvents.length}/${eventsToProcess.length} events processed in ${overallElapsed}ms ` +
          `(RPC: ${overallElapsed - processingElapsed}ms, Processing: ${processingElapsed}ms, ` +
          `Throughput: ${Math.round(processedEvents.length / (overallElapsed / 1000))} events/sec)`
      );
    } catch (error) {
      logger.error('Error processing queued events:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private processEvent(
    eventData: EventData,
    blockchainData?: {
      blocks: Map<number, Block>;
      transactions: Map<string, Transaction>;
      receipts: Map<string, TransactionReceipt>;
    }
  ): ProcessedEvent | null {
    try {
      const { topics, data, address: tokenAddress } = eventData;

      // Decode Transfer event data
      if (topics.length < 3) {
        logger.warn('Invalid Transfer event: insufficient topics');
        return null;
      }

      const from = '0x' + topics[1].slice(-40); // Remove padding from address
      const to = '0x' + topics[2].slice(-40); // Remove padding from address

      // Decode value from data field
      const value = BigInt(data).toString();

      // Skip zero value transfers if configured
      if (config.monitoring.ignoreZeroValueTransfers && value === '0') {
        if (config.logging.enableBlockchainLogs) {
          logger.info(
            `Skipping zero value transfer: ${eventData.transactionHash}`
          );
        }
        return null;
      }

      // Get token symbol and decimals
      const tokenSymbol = this.getTokenSymbol(tokenAddress);
      const tokenDecimals = this.getTokenDecimals(tokenAddress);

      // Get gas information and block timestamp from cached blockchain data
      let gasPrice: string | undefined;
      let gasUsed: string | undefined;
      let blockTimestamp = new Date(); // Fallback to current time if block fetch fails
      let transactionStatus = 1; // default to success

      // Use cached blockchain data if available (batch processing)
      if (blockchainData) {
        const blockNumber = parseInt(eventData.blockNumber, 16);
        const block = blockchainData.blocks.get(blockNumber);
        const transaction = blockchainData.transactions.get(
          eventData.transactionHash
        );
        const receipt = blockchainData.receipts.get(eventData.transactionHash);

        // Extract block timestamp
        if (block?.timestamp) {
          blockTimestamp = new Date(Number(block.timestamp) * 1000);
        }

        // Extract gas price from transaction
        if (transaction?.gasPrice) {
          gasPrice = transaction.gasPrice.toString();
        }

        // Extract gas used and status from receipt
        if (receipt) {
          if (receipt.gasUsed) {
            gasUsed = receipt.gasUsed.toString();
          }
          transactionStatus = receipt.status ? 1 : 0;
        }

        if (config.logging.enableBlockchainLogs) {
          logger.info(
            `Using cached blockchain data for ${eventData.transactionHash}`
          );
        }
      }

      const processedEvent: ProcessedEvent = {
        type: EVENT_TYPES.NEW_TRANSACTION,
        transactionHash: eventData.transactionHash,
        blockNumber: parseInt(eventData.blockNumber, 16),
        from,
        to,
        value,
        tokenAddress,
        tokenSymbol,
        tokenDecimals,
        timestamp: blockTimestamp,
        gasPrice,
        gasUsed,
        status: transactionStatus,
      };

      return processedEvent;
    } catch (error) {
      logger.error('Error processing event:', error);
      return null;
    }
  }

  private async createTransactionData(
    processedEvent: ProcessedEvent,
    eventData: EventData
  ): Promise<TransactionData | null> {
    try {
      // Basic transaction data from event logs
      const basicTransactionData: TransactionData = {
        hash: processedEvent.transactionHash,
        blockNumber: processedEvent.blockNumber,
        blockHash: eventData.blockHash,
        transactionIndex: parseInt(eventData.transactionIndex, 16),
        from: processedEvent.from,
        to: processedEvent.to,
        value: processedEvent.value,
        gasPrice: '0', // Will be filled from transaction details
        gasUsed: '0', // Will be filled from receipt
        status: processedEvent.status || 1, // Default to success
        tokenAddress: processedEvent.tokenAddress,
        tokenSymbol: processedEvent.tokenSymbol,
        tokenDecimals: processedEvent.tokenDecimals,
        timestamp: processedEvent.timestamp,
        confirmations: 0, // Will be updated later in batch
      };

      // Always try to fetch gas information for transaction fees
      if (!this.web3Service.isConnected()) {
        logger.warn(
          'Web3 service not connected, returning basic transaction data'
        );
        return basicTransactionData;
      }

      const web3 = this.web3Service.getWeb3Instance();
      if (!web3) {
        logger.warn(
          'Web3 instance not available, returning basic transaction data'
        );
        return basicTransactionData;
      }

      try {
        // Use gas data from processedEvent if available (to avoid duplicate RPC calls)
        if (processedEvent.gasPrice) {
          basicTransactionData.gasPrice = processedEvent.gasPrice;
        }
        if (processedEvent.gasUsed) {
          basicTransactionData.gasUsed = processedEvent.gasUsed;
        }

        // Note: confirmations field remains 0 in database
        // It should be calculated in real-time by tx-api when serving transaction data
        // confirmations = currentBlock - tx.blockNumber (calculated at query time)
      } catch (detailError) {
        logger.warn(
          `Failed to fetch transaction details for ${processedEvent.transactionHash}, using basic data:`,
          detailError
        );
      }

      return basicTransactionData;
    } catch (error) {
      logger.error('Error creating transaction data:', error);
      return null;
    }
  }

  private getTokenSymbol(tokenAddress: string): string {
    return this.tokenService.getTokenSymbol(tokenAddress);
  }

  private getTokenDecimals(tokenAddress: string): number {
    return this.tokenService.getTokenDecimals(tokenAddress);
  }

  async stopMonitoring(): Promise<void> {
    logger.info('Stopping event monitoring...');

    // Stop block polling
    if (this.blockPollingTimer) {
      clearInterval(this.blockPollingTimer);
      this.blockPollingTimer = null;
      logger.info('✅ Stopped block polling');
    }

    // Stop processing timer
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    this.subscriptions.clear();

    // Process remaining events
    if (this.processingQueue.length > 0) {
      logger.info(
        `Processing remaining ${this.processingQueue.length} events...`
      );
      await this.processQueuedEvents();
    }

    // Save final block number before stopping
    if (this.lastProcessedBlock > 0) {
      await this.saveLastProcessedBlockNumber(this.lastProcessedBlock);
      logger.info(`💾 Saved last processed block: ${this.lastProcessedBlock}`);
    }

    // Disconnect Redis
    if (this.redisClient) {
      await this.redisClient.quit();
      logger.info('✅ Redis disconnected');
    }

    logger.info('Event monitoring stopped');
  }

  getMonitoringStatus(): {
    blockPollingActive: boolean;
    queueSize: number;
    isProcessing: boolean;
    lastProcessedBlock: number;
    monitoredTokens: string[];
  } {
    return {
      blockPollingActive: this.blockPollingTimer !== null,
      queueSize: this.processingQueue.length,
      isProcessing: this.isProcessing,
      lastProcessedBlock: this.lastProcessedBlock,
      monitoredTokens: Object.keys(TOKEN_ADDRESSES),
    };
  }

  on(event: string, listener: (data?: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }
}
