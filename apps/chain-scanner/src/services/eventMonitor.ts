import { Web3Service } from './web3Service';
import { DatabaseService, TransactionData } from './databaseService';
import { config } from '../config';
import {
  TOKEN_ADDRESSES,
  TRANSFER_EVENT_SIGNATURE,
  MONITORING_INTERVALS,
  EVENT_TYPES,
} from '../config/constants';
import { TokenService } from './tokenService';

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
}

export class EventMonitor {
  private subscriptions: Map<string, string> = new Map();
  private processingQueue: EventData[] = [];
  private processingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private eventListeners: Map<string, ((data?: unknown) => void)[]> = new Map();
  private lastProcessedBlock: number = 0;
  private blockPollingTimer: NodeJS.Timeout | null = null;

  constructor(
    private web3Service: Web3Service,
    private databaseService: DatabaseService,
    private tokenService: TokenService
  ) {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.web3Service.on('connection', this.handleConnection.bind(this));
    this.web3Service.on('disconnection', this.handleDisconnection.bind(this));
  }

  private async handleConnection(): Promise<void> {
    console.log('Web3 connected, starting event monitoring...');
    await this.startMonitoring();
  }

  private handleDisconnection(): void {
    console.log('Web3 disconnected, stopping event monitoring...');
    this.stopMonitoring();
  }

  async startMonitoring(): Promise<void> {
    if (!this.web3Service.isConnected()) {
      throw new Error('Web3 service not connected');
    }

    console.log(
      '🚀 Starting ERC-20 Transfer event monitoring with HTTP RPC polling...'
    );

    try {
      // Get the current block number to start monitoring from
      this.lastProcessedBlock = await this.web3Service.getLatestBlockNumber();
      console.log(
        `📍 Starting monitoring from block: ${this.lastProcessedBlock}`
      );

      // Start processing queue
      this.startProcessingQueue();

      // Start HTTP polling for new blocks
      this.startBlockPolling();

      const tokenAddresses = Object.values(TOKEN_ADDRESSES);
      console.log(
        `📊 Monitoring ${tokenAddresses.length} tokens for Transfer events using HTTP RPC`
      );
      console.log(
        `🎯 Monitored tokens: ${Object.keys(TOKEN_ADDRESSES).join(', ')}`
      );
    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
      throw error;
    }
  }

  private startBlockPolling(): void {
    if (this.blockPollingTimer) {
      clearInterval(this.blockPollingTimer);
    }

    console.log(
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
        console.log(
          `🔍 New block detected: ${currentBlockNumber} (last processed: ${this.lastProcessedBlock})`
        );

        // Process blocks from lastProcessedBlock + 1 to currentBlockNumber
        for (
          let blockNum = this.lastProcessedBlock + 1;
          blockNum <= currentBlockNumber;
          blockNum++
        ) {
          await this.processBlock(blockNum);
        }

        this.lastProcessedBlock = currentBlockNumber;
      }
    } catch (error) {
      console.error('❌ Error polling for new blocks:', error);
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
        console.error(
          `❌ Error fetching events for all tokens in block ${blockNumber}:`,
          error
        );
        // Fallback to individual token requests if batch fails
        console.log(
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
            console.error(
              `❌ Error fetching events for token ${tokenAddress} in block ${blockNumber}:`,
              individualError
            );
            // Continue with other tokens even if one fails
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing block ${blockNumber}:`, error);
    }
  }

  private async fetchAllTokenEventsWithRetry(
    tokenAddresses: string[],
    fromBlock: number,
    toBlock: number,
    retries: number = 3
  ): Promise<void> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        await this.fetchAllTokenEvents(tokenAddresses, fromBlock, toBlock);
        return; // Success, exit retry loop
      } catch (error) {
        const isLastAttempt = attempt === retries - 1;

        if (isLastAttempt) {
          throw error; // Re-throw on final attempt
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, attempt);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.warn(
          `⚠️ Retry ${attempt + 1}/${retries} for all tokens after ${delay}ms:`,
          errorMessage
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async fetchTokenEventsWithRetry(
    tokenAddress: string,
    fromBlock: number,
    toBlock: number,
    retries: number = 3
  ): Promise<void> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        await this.fetchTokenEvents(tokenAddress, fromBlock, toBlock);
        return; // Success, exit retry loop
      } catch (error) {
        const isLastAttempt = attempt === retries - 1;

        if (isLastAttempt) {
          throw error; // Re-throw on final attempt
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, attempt);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.warn(
          `⚠️ Retry ${attempt + 1}/${retries} for token ${tokenAddress} after ${delay}ms:`,
          errorMessage
        );
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
        console.log(
          `📦 Found ${logs.length} Transfer events for all tokens in blocks ${fromBlock}-${toBlock}`
        );
      }
    } catch (error) {
      console.error(`❌ Error fetching events for all tokens:`, error);
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
        console.log(
          `📦 Found ${logs.length} Transfer events for token ${tokenAddress} in blocks ${fromBlock}-${toBlock}`
        );
      }
    } catch (error) {
      console.error(
        `❌ Error fetching events for token ${tokenAddress}:`,
        error
      );
    }
  }

  private queueEvent(eventData: EventData): void {
    this.processingQueue.push(eventData);

    if (config.logging.enableBlockchainLogs) {
      console.log(
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

      console.log(`Processing ${eventsToProcess.length} events...`);

      const processedEvents: ProcessedEvent[] = [];
      const transactionData: TransactionData[] = [];

      for (const eventData of eventsToProcess) {
        try {
          const processedEvent = await this.processEvent(eventData);
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
          console.error(
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

      if (config.logging.enableBlockchainLogs) {
        console.log(`Processed ${processedEvents.length} events successfully`);
      }
    } catch (error) {
      console.error('Error processing queued events:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(
    eventData: EventData
  ): Promise<ProcessedEvent | null> {
    try {
      const { topics, data, address: tokenAddress } = eventData;

      // Decode Transfer event data
      if (topics.length < 3) {
        console.warn('Invalid Transfer event: insufficient topics');
        return null;
      }

      const from = '0x' + topics[1].slice(-40); // Remove padding from address
      const to = '0x' + topics[2].slice(-40); // Remove padding from address

      // Decode value from data field
      const value = BigInt(data).toString();

      // Skip zero value transfers if configured
      if (config.monitoring.ignoreZeroValueTransfers && value === '0') {
        if (config.logging.enableBlockchainLogs) {
          console.log(
            `Skipping zero value transfer: ${eventData.transactionHash}`
          );
        }
        return null;
      }

      // Get token symbol and decimals
      const tokenSymbol = this.getTokenSymbol(tokenAddress);
      const tokenDecimals = this.getTokenDecimals(tokenAddress);

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
        timestamp: new Date(),
      };

      return processedEvent;
    } catch (error) {
      console.error('Error processing event:', error);
      return null;
    }
  }

  private async createTransactionData(
    processedEvent: ProcessedEvent,
    _eventData: EventData
  ): Promise<TransactionData | null> {
    try {
      if (!this.web3Service.isConnected()) {
        console.warn(
          'Web3 service not connected, skipping transaction data creation'
        );
        return null;
      }

      const web3 = this.web3Service.getWeb3Instance();
      if (!web3) {
        console.warn(
          'Web3 instance not available, skipping transaction data creation'
        );
        return null;
      }

      // Get transaction details
      const transaction = await web3.eth.getTransaction(
        processedEvent.transactionHash
      );
      if (!transaction) {
        console.warn(
          `Transaction not found: ${processedEvent.transactionHash}`
        );
        return null;
      }

      // Get transaction receipt for gas usage
      const receipt = await web3.eth.getTransactionReceipt(
        processedEvent.transactionHash
      );
      if (!receipt) {
        console.warn(
          `Transaction receipt not found: ${processedEvent.transactionHash}`
        );
        return null;
      }

      // Get current block number for confirmations
      const currentBlockNumber = await web3.eth.getBlockNumber();
      const confirmations =
        Number(currentBlockNumber) - processedEvent.blockNumber;

      const transactionData: TransactionData = {
        hash: processedEvent.transactionHash,
        blockNumber: processedEvent.blockNumber,
        blockHash: receipt.blockHash,
        transactionIndex: Number(receipt.transactionIndex),
        from: processedEvent.from,
        to: processedEvent.to,
        value: processedEvent.value,
        gasPrice: transaction.gasPrice?.toString() || '0',
        gasUsed: receipt.gasUsed.toString(),
        tokenAddress: processedEvent.tokenAddress,
        tokenSymbol: processedEvent.tokenSymbol,
        tokenDecimals: processedEvent.tokenDecimals,
        timestamp: processedEvent.timestamp,
        confirmations,
      };

      return transactionData;
    } catch (error) {
      console.error('Error creating transaction data:', error);
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
    console.log('Stopping event monitoring...');

    // Stop block polling
    if (this.blockPollingTimer) {
      clearInterval(this.blockPollingTimer);
      this.blockPollingTimer = null;
      console.log('✅ Stopped block polling');
    }

    // Stop processing timer
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    this.subscriptions.clear();

    // Process remaining events
    if (this.processingQueue.length > 0) {
      console.log(
        `Processing remaining ${this.processingQueue.length} events...`
      );
      await this.processQueuedEvents();
    }

    console.log('Event monitoring stopped');
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
