// eslint-disable-next-line @nx/enforce-module-boundaries
import { prisma, initializeDatabaseConfig } from '@msq-tx-monitor/database';
import { config } from '../config/index.js';
import { logger } from '@msq-tx-monitor/msq-common';
import { AddressStatsCalculator } from './addressStatsCalculator.js';
import {
  AddressStatsCacheService,
  CachedAddressStats,
} from './addressStatsCacheService.js';

export interface TransactionData {
  hash: string;
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  status: number; // 0 = failed, 1 = success
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  timestamp: Date;
  confirmations: number;
}

export interface AddressStatistic {
  address: string;
  transactionCount: number;
  totalValueIn: string;
  totalValueOut: string;
  firstSeen: Date;
  lastSeen: Date;
  riskScore: number;
  isWhale: boolean;
}

export class DatabaseService {
  private initialized = false;
  private addressStatsCalculator = new AddressStatsCalculator();
  private cacheService = AddressStatsCacheService.getInstance();

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize database configuration
      initializeDatabaseConfig();

      // Test database connection
      await prisma.$connect();
      logger.info('Database connected successfully');

      // Initialize cache service and address stats calculator
      await this.cacheService.initialize();
      await this.addressStatsCalculator.initialize();

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async saveTransaction(transactionData: TransactionData): Promise<void> {
    try {
      // Update address statistics using advanced calculator
      // Note: Transaction data is stored in Subgraph, not MySQL
      await this.addressStatsCalculator.updateAddressStatistics(
        transactionData
      );

      if (config.logging.enableDatabaseLogs) {
        logger.info(`Address stats updated for tx: ${transactionData.hash}`);
      }
    } catch (error) {
      logger.error('Error updating address statistics:', error);
      throw error;
    }
  }

  async saveTransactionBatch(transactions: TransactionData[]): Promise<void> {
    if (transactions.length === 0) {
      return;
    }

    try {
      await prisma.$transaction(async tx => {
        // Update address statistics for each transaction using advanced calculator
        // Note: Transaction data is stored in Subgraph, not MySQL
        for (const transaction of transactions) {
          await this.addressStatsCalculator.updateAddressStatistics(
            transaction,
            tx
          );
        }
      });

      logger.info(`Address stats updated for ${transactions.length} transactions`);
    } catch (error) {
      logger.error('Error updating address statistics batch:', error);
      throw error;
    }
  }

  /**
   * Update address statistics using the advanced AddressStatsCalculator
   * for comprehensive real-time analytics and risk assessment.
   * This method provides:
   * - Incremental calculation algorithms
   * - Behavioral pattern analysis
   * - Velocity and diversity scoring
   * - Risk assessment and whale detection
   * - Efficient O(1) update complexity
   */
  async updateAddressStatisticsLegacy(
    transactionData: TransactionData
  ): Promise<void> {
    // Legacy method - now delegated to AddressStatsCalculator
    await this.addressStatsCalculator.updateAddressStatistics(transactionData);
  }

  async getRecentTransactions(
    limit: number = 100
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    return prisma.transaction.findMany({
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  async getTransactionsByAddress(
    address: string,
    limit: number = 50
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    return prisma.transaction.findMany({
      where: {
        OR: [{ fromAddress: address }, { toAddress: address }],
      },
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  async getAddressStatistics(
    address: string,
    tokenAddress?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    if (tokenAddress) {
      // Try cache first for specific token address
      if (this.cacheService.isReady()) {
        try {
          const cachedStats = await this.cacheService.getAddressStats(
            address,
            tokenAddress
          );
          if (cachedStats) {
            // Convert cached format back to database format
            const dbStats = this.convertCachedStatsToDbFormat(cachedStats);
            return [dbStats];
          }
        } catch (error) {
          logger.error(
            '❌ Cache lookup error, falling back to database:',
            error
          );
        }
      }

      // Cache miss or cache unavailable - query database
      const result = await prisma.addressStatistics.findUnique({
        where: {
          address_tokenAddress: {
            address,
            tokenAddress,
          },
        },
      });

      // Update cache for future queries
      if (result && this.cacheService.isReady()) {
        const cachedStats = this.convertDbStatsToCachedFormat(result);
        const isWhaleOrRisky = result.isWhale || result.isSuspicious;
        await this.cacheService.setAddressStats(cachedStats, isWhaleOrRisky);
      }

      return result ? [result] : [];
    }

    // For queries without specific token address, query database directly
    return prisma.addressStatistics.findMany({
      where: { address },
    });
  }

  /**
   * Convert cached stats format to database format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private convertCachedStatsToDbFormat(cachedStats: CachedAddressStats): any {
    return {
      id: BigInt(0), // Will be ignored in most use cases
      address: cachedStats.address,
      tokenAddress: cachedStats.tokenAddress,
      totalSent: BigInt(cachedStats.totalSent),
      totalReceived: BigInt(cachedStats.totalReceived),
      transactionCountSent: cachedStats.transactionCountSent,
      transactionCountReceived: cachedStats.transactionCountReceived,
      avgTransactionSize: cachedStats.avgTransactionSize,
      avgTransactionSizeSent: cachedStats.avgTransactionSizeSent,
      avgTransactionSizeReceived: cachedStats.avgTransactionSizeReceived,
      maxTransactionSize: BigInt(cachedStats.maxTransactionSize),
      maxTransactionSizeSent: BigInt(cachedStats.maxTransactionSizeSent),
      maxTransactionSizeReceived: BigInt(
        cachedStats.maxTransactionSizeReceived
      ),
      velocityScore: cachedStats.velocityScore,
      diversityScore: cachedStats.diversityScore,
      dormancyPeriod: cachedStats.dormancyPeriod,
      riskScore: cachedStats.riskScore,
      isWhale: cachedStats.isWhale,
      isSuspicious: cachedStats.isSuspicious,
      isActive: cachedStats.isActive,
      behavioralFlags: cachedStats.behavioralFlags,
      lastActivityType: cachedStats.lastActivityType,
      addressLabel: cachedStats.addressLabel,
      firstSeen: cachedStats.firstSeen ? new Date(cachedStats.firstSeen) : null,
      lastSeen: cachedStats.lastSeen ? new Date(cachedStats.lastSeen) : null,
      updatedAt: new Date(cachedStats.updatedAt),
    };
  }

  /**
   * Convert database stats format to cached format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private convertDbStatsToCachedFormat(dbStats: any): CachedAddressStats {
    return {
      address: dbStats.address,
      tokenAddress: dbStats.tokenAddress,
      totalSent: dbStats.totalSent.toString(),
      totalReceived: dbStats.totalReceived.toString(),
      transactionCountSent: dbStats.transactionCountSent,
      transactionCountReceived: dbStats.transactionCountReceived,
      avgTransactionSize: Number(dbStats.avgTransactionSize),
      avgTransactionSizeSent: Number(dbStats.avgTransactionSizeSent),
      avgTransactionSizeReceived: Number(dbStats.avgTransactionSizeReceived),
      maxTransactionSize: dbStats.maxTransactionSize.toString(),
      maxTransactionSizeSent: dbStats.maxTransactionSizeSent.toString(),
      maxTransactionSizeReceived: dbStats.maxTransactionSizeReceived.toString(),
      velocityScore: Number(dbStats.velocityScore),
      diversityScore: Number(dbStats.diversityScore),
      dormancyPeriod: dbStats.dormancyPeriod,
      riskScore: Number(dbStats.riskScore),
      isWhale: dbStats.isWhale,
      isSuspicious: dbStats.isSuspicious,
      isActive: dbStats.isActive,
      behavioralFlags: dbStats.behavioralFlags as object | null,
      lastActivityType: dbStats.lastActivityType,
      addressLabel: dbStats.addressLabel,
      firstSeen: dbStats.firstSeen?.toISOString() || null,
      lastSeen: dbStats.lastSeen?.toISOString() || null,
      updatedAt: dbStats.updatedAt.toISOString(),
    };
  }

  async getHighValueTransactions(
    minValue: string,
    limit: number = 50
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    return prisma.transaction.findMany({
      where: {
        value: {
          gte: minValue,
        },
      },
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  async getTransactionCount(): Promise<number> {
    return prisma.transaction.count();
  }

  async getLastProcessedBlock(): Promise<number | null> {
    const lastTransaction = await prisma.transaction.findFirst({
      orderBy: {
        blockNumber: 'desc',
      },
      select: {
        blockNumber: true,
      },
    });

    return lastTransaction ? Number(lastTransaction.blockNumber) : null;
  }

  async checkTransactionExists(hash: string): Promise<boolean> {
    const transaction = await prisma.transaction.findUnique({
      where: { hash },
      select: { id: true },
    });

    return !!transaction;
  }

  async updateTransactionConfirmations(
    hash: string,
    confirmations: number
  ): Promise<void> {
    // This function can be removed since confirmations is not in the schema
    // or we can add a comment for future implementation
    logger.info(
      `Confirmation update for ${hash}: ${confirmations} confirmations`
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  // =============================================================================
  // Sync Status Management - MySQL-based sync tracking (replaces Redis)
  // =============================================================================

  /**
   * Get or create sync status for a specific sync type
   * @param syncType - Type of synchronization (HISTORICAL, REALTIME, STATISTICS)
   * @returns SyncStatus entity
   */
  async getOrCreateSyncStatus(
    syncType: 'HISTORICAL' | 'REALTIME' | 'STATISTICS'
  ) {
    let syncStatus = await prisma.syncStatus.findUnique({
      where: { syncType },
    });

    if (!syncStatus) {
      syncStatus = await prisma.syncStatus.create({
        data: {
          syncType,
          lastSyncedBlock: BigInt(0),
          lastSyncedTimestamp: new Date(),
          lastSyncedTxCount: 0,
          isSyncing: false,
          syncProgress: 0,
          errorCount: 0,
        },
      });
      logger.info(`✨ Created new sync status for ${syncType}`);
    }

    return syncStatus;
  }

  /**
   * Get last synced block number for a specific sync type
   * Falls back to transactions table max(blockNumber) if sync status doesn't exist
   * @param syncType - Type of synchronization
   * @returns Last synced block number
   */
  async getLastSyncedBlock(
    syncType: 'HISTORICAL' | 'REALTIME' | 'STATISTICS'
  ): Promise<number> {
    try {
      const syncStatus = await this.getOrCreateSyncStatus(syncType);
      const blockNumber = Number(syncStatus.lastSyncedBlock);

      // If block number is 0, fall back to transactions table
      if (blockNumber === 0) {
        const lastTxBlock = await this.getLastProcessedBlock();
        if (lastTxBlock) {
          logger.info(
            `📖 No sync status for ${syncType}, falling back to transactions table: ${lastTxBlock}`
          );
          return lastTxBlock;
        }
      }

      logger.info(
        `📖 Loaded last synced block for ${syncType}: ${blockNumber}`
      );
      return blockNumber;
    } catch (error) {
      logger.error(
        `❌ Error getting last synced block for ${syncType}:`,
        error
      );
      return 0;
    }
  }

  /**
   * Update sync status with new block number and metadata
   * @param data - Sync status update data
   */
  async updateSyncStatus(data: {
    syncType: 'HISTORICAL' | 'REALTIME' | 'STATISTICS';
    lastSyncedBlock: number;
    lastSyncedTxCount?: number;
    isSyncing?: boolean;
    syncProgress?: number;
    errorCount?: number;
    lastError?: string | null;
  }): Promise<void> {
    try {
      await prisma.syncStatus.upsert({
        where: { syncType: data.syncType },
        update: {
          lastSyncedBlock: BigInt(data.lastSyncedBlock),
          lastSyncedTimestamp: new Date(),
          lastSyncedTxCount: data.lastSyncedTxCount ?? 0,
          isSyncing: data.isSyncing ?? false,
          syncProgress: data.syncProgress ?? 0,
          errorCount: data.errorCount ?? 0,
          lastError: data.lastError ?? null,
        },
        create: {
          syncType: data.syncType,
          lastSyncedBlock: BigInt(data.lastSyncedBlock),
          lastSyncedTimestamp: new Date(),
          lastSyncedTxCount: data.lastSyncedTxCount ?? 0,
          isSyncing: data.isSyncing ?? false,
          syncProgress: data.syncProgress ?? 0,
          errorCount: data.errorCount ?? 0,
          lastError: data.lastError ?? null,
        },
      });

      logger.info(
        `✅ Updated sync status for ${data.syncType}: block ${data.lastSyncedBlock}`
      );
    } catch (error) {
      logger.error(
        `❌ Error updating sync status for ${data.syncType}:`,
        error
      );
    }
  }

  /**
   * Get full sync status for a specific sync type
   * @param syncType - Type of synchronization
   * @returns Full SyncStatus entity or null
   */
  async getSyncStatus(syncType: 'HISTORICAL' | 'REALTIME' | 'STATISTICS') {
    return await prisma.syncStatus.findUnique({
      where: { syncType },
    });
  }

  /**
   * Get all sync statuses for monitoring
   * @returns Array of all sync statuses
   */
  async getAllSyncStatuses() {
    return await prisma.syncStatus.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async disconnect(): Promise<void> {
    await prisma.$disconnect();
    await this.cacheService.disconnect();
    this.initialized = false;
  }
}
