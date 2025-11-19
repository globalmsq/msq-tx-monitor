import { DatabaseService } from './databaseService.js';
import { SubgraphService } from './subgraphService.js';
import { logger } from '@msq-tx-monitor/msq-common';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { prisma } from '@msq-tx-monitor/database';

/**
 * Background Statistics Worker
 *
 * Enriches address statistics using Subgraph AccountStats data.
 * Runs in background without blocking real-time transaction processing.
 *
 * Data Flow:
 * 1. Get addresses from MySQL that need statistics update
 * 2. Query Subgraph AccountStats in batches (100 addresses per query)
 * 3. Update MySQL address_statistics with enriched data
 *
 * Error Handling:
 * - NEVER throws errors - logs and continues
 * - Rate limit errors: waits and retries next cycle
 * - Any error: recorded in SyncStatus, retries next cycle
 * - Program never crashes regardless of errors
 */
export class StatisticsWorker {
  private isRunning = false;
  private workerTimer: NodeJS.Timeout | null = null;
  private statusLogTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100; // 100 addresses per Subgraph query
  private readonly WORKER_INTERVAL = 30000; // 30 seconds between batches
  private readonly STATUS_LOG_INTERVAL = 300000; // 5 minutes between status logs
  private consecutiveErrors = 0;
  private lastErrorTime: Date | null = null;

  constructor(
    private databaseService: DatabaseService,
    private subgraphService: SubgraphService
  ) {}

  /**
   * Start background statistics calculation
   * Runs continuously until stopped
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('⚠️ Statistics worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('🎯 Starting background statistics worker...');

    // Run first batch (with error handling)
    try {
      await this.processBatch();
    } catch (error) {
      // Log but don't crash - will retry on next interval
      logger.error('❌ Error in first statistics batch (will retry):', error);
    }

    // Schedule periodic processing
    this.workerTimer = setInterval(async () => {
      try {
        await this.processBatch();
      } catch (error) {
        // Catch any unexpected errors to prevent interval from stopping
        logger.error(
          '❌ Unexpected error in statistics worker (will retry):',
          error
        );
      }
    }, this.WORKER_INTERVAL);

    // Schedule periodic status logging
    this.statusLogTimer = setInterval(() => {
      this.logSyncStatus();
    }, this.STATUS_LOG_INTERVAL);

    logger.info('✅ Statistics worker started successfully');
    logger.info(`   Batch size: ${this.BATCH_SIZE} addresses`);
    logger.info(`   Worker interval: ${this.WORKER_INTERVAL / 1000}s`);
    logger.info(`   Status log interval: ${this.STATUS_LOG_INTERVAL / 1000}s`);
  }

  /**
   * Stop background statistics calculation
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('⚠️ Statistics worker not running');
      return;
    }

    logger.info('🛑 Stopping statistics worker...');

    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }

    if (this.statusLogTimer) {
      clearInterval(this.statusLogTimer);
      this.statusLogTimer = null;
    }

    this.isRunning = false;
    logger.info('✅ Statistics worker stopped');
  }

  /**
   * Log current sync status
   */
  private async logSyncStatus(): Promise<void> {
    try {
      const syncStatus = await this.databaseService.getSyncStatus('STATISTICS');
      const realtimeStatus =
        await this.databaseService.getSyncStatus('REALTIME');

      if (syncStatus && realtimeStatus) {
        const statsBlock = Number(syncStatus.lastSyncedBlock);
        const realtimeBlock = Number(realtimeStatus.lastSyncedBlock);
        const progress =
          realtimeBlock > 0
            ? ((statsBlock / realtimeBlock) * 100).toFixed(1)
            : '0.0';

        logger.info('📊 Statistics Worker Status:');
        logger.info(
          `   Progress: ${syncStatus.lastSyncedBlock} / ${realtimeStatus.lastSyncedBlock} blocks (${progress}%)`
        );
        logger.info(`   Consecutive errors: ${this.consecutiveErrors}`);

        if (syncStatus.errorCount > 0) {
          logger.info(`   Total errors: ${syncStatus.errorCount}`);
          if (syncStatus.lastError) {
            logger.info(
              `   Last error: ${syncStatus.lastError.substring(0, 100)}...`
            );
          }
        }
      }
    } catch (error) {
      logger.error('❌ Error logging sync status:', error);
    }
  }

  /**
   * Process one batch of addresses for statistics enrichment
   */
  private async processBatch(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Get addresses that need statistics update from MySQL
      const addresses = await this.getAddressesNeedingUpdate();

      if (addresses.length === 0) {
        logger.info('⏸️ No addresses need statistics update, waiting...');
        this.consecutiveErrors = 0;
        return;
      }

      logger.info(`📊 Processing statistics for ${addresses.length} addresses`);

      // Mark as syncing
      const currentBlock =
        await this.databaseService.getLastSyncedBlock('STATISTICS');
      await this.databaseService.updateSyncStatus({
        syncType: 'STATISTICS',
        lastSyncedBlock: currentBlock,
        isSyncing: true,
        syncProgress: 0,
      });

      // Process addresses in batches
      let processedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < addresses.length; i += this.BATCH_SIZE) {
        const batch = addresses.slice(i, i + this.BATCH_SIZE);

        try {
          // Query AccountStats from Subgraph
          const accountStats =
            await this.subgraphService.getAccountStats(batch);

          if (accountStats.length > 0) {
            // Update MySQL with enriched statistics
            await this.updateAddressStatistics(accountStats);
            processedCount += accountStats.length;
          }

          // Update progress
          const progress = ((i + batch.length) / addresses.length) * 100;
          const progressBlock =
            await this.databaseService.getLastSyncedBlock('STATISTICS');
          await this.databaseService.updateSyncStatus({
            syncType: 'STATISTICS',
            lastSyncedBlock: progressBlock,
            isSyncing: true,
            syncProgress: progress,
          });

          logger.info(
            `📦 Processed batch ${Math.floor(i / this.BATCH_SIZE) + 1}: ${accountStats.length} stats (${progress.toFixed(1)}%)`
          );
        } catch (error) {
          errorCount++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          // Check for rate limit
          if (this.isRateLimitError(error)) {
            const retryAfter = this.getRetryAfterSeconds(error);
            logger.warn(`🚫 Rate limit hit, will retry in ${retryAfter}s`);

            // Record error but don't crash
            await this.recordError(`Rate limit: retry after ${retryAfter}s`);

            // Wait for rate limit to reset (but cap at 5 minutes to not block too long)
            const waitTime = Math.min(retryAfter * 1000, 300000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            logger.error(
              `❌ Error processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}:`,
              errorMessage
            );
            await this.recordError(errorMessage);
          }

          // Continue with next batch even if this one failed
        }
      }

      // Mark batch as complete
      const finalBlock =
        await this.databaseService.getLastSyncedBlock('REALTIME');
      await this.databaseService.updateSyncStatus({
        syncType: 'STATISTICS',
        lastSyncedBlock: finalBlock,
        lastSyncedTxCount: processedCount,
        isSyncing: false,
        syncProgress: 100,
      });

      if (errorCount === 0) {
        this.consecutiveErrors = 0;
        logger.info(
          `✅ Statistics batch complete: ${processedCount} addresses updated`
        );
      } else {
        this.consecutiveErrors++;
        logger.warn(
          `⚠️ Statistics batch complete with ${errorCount} errors: ${processedCount} addresses updated`
        );
      }
    } catch (error) {
      // Catch-all for any unexpected errors
      this.consecutiveErrors++;
      this.lastErrorTime = new Date();

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Error in statistics batch:', errorMessage);

      // Record error in sync status
      await this.recordError(errorMessage);

      // DON'T throw - let the interval continue
    }
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('429') ||
      message.toLowerCase().includes('rate limit') ||
      message.toLowerCase().includes('too many requests')
    );
  }

  /**
   * Extract retry-after seconds from error
   */
  private getRetryAfterSeconds(error: unknown): number {
    const message = error instanceof Error ? error.message : String(error);

    // Try to extract retry-after value from error message
    const match = message.match(/retry.?after[:\s]*(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }

    // Default to 60 seconds
    return 60;
  }

  /**
   * Record error in sync status
   */
  private async recordError(errorMessage: string): Promise<void> {
    try {
      const currentStatus =
        await this.databaseService.getSyncStatus('STATISTICS');
      const currentErrorCount = currentStatus?.errorCount ?? 0;
      const currentBlock =
        await this.databaseService.getLastSyncedBlock('STATISTICS');

      await this.databaseService.updateSyncStatus({
        syncType: 'STATISTICS',
        lastSyncedBlock: currentBlock,
        isSyncing: false,
        errorCount: currentErrorCount + 1,
        lastError: errorMessage.substring(0, 500), // Truncate long errors
      });
    } catch (error) {
      logger.error('❌ Failed to record error in sync status:', error);
    }
  }

  /**
   * Get addresses that need statistics update
   * Returns addresses from address_statistics that were updated more than 1 hour ago
   */
  private async getAddressesNeedingUpdate(): Promise<string[]> {
    try {
      // Get addresses that need update (updated more than 1 hour ago or never)
      const addresses = await prisma.addressStatistics.findMany({
        where: {
          OR: [
            {
              updatedAt: {
                lt: new Date(Date.now() - 3600000), // 1 hour ago
              },
            },
            {
              totalSent: 0,
              totalReceived: 0,
            },
          ],
        },
        select: {
          address: true,
        },
        take: 1000, // Limit to 1000 addresses per cycle
        orderBy: {
          updatedAt: 'asc', // Oldest first
        },
      });

      // Get unique addresses
      const uniqueAddresses = [
        ...new Set(addresses.map((a: { address: string }) => a.address)),
      ];

      return uniqueAddresses;
    } catch (error) {
      logger.error('❌ Error getting addresses needing update:', error);
      return [];
    }
  }

  /**
   * Update MySQL address_statistics with Subgraph AccountStats data
   */
  private async updateAddressStatistics(
    accountStats: Array<{
      account: string;
      totalTransferCount: string;
      totalSentCount: string;
      totalReceivedCount: string;
      totalVolumeTransferred: string;
      firstTransactionTimestamp: string;
      lastTransactionTimestamp: string;
      isActive: boolean;
      uniqueTokenCount: string;
    }>
  ): Promise<void> {
    try {
      for (const stats of accountStats) {
        try {
          await prisma.addressStatistics.updateMany({
            where: {
              address: stats.account.toLowerCase(),
            },
            data: {
              transactionCountSent: parseInt(stats.totalSentCount, 10),
              transactionCountReceived: parseInt(stats.totalReceivedCount, 10),
              firstSeen: stats.firstTransactionTimestamp
                ? new Date(parseInt(stats.firstTransactionTimestamp, 10) * 1000)
                : null,
              lastSeen: stats.lastTransactionTimestamp
                ? new Date(parseInt(stats.lastTransactionTimestamp, 10) * 1000)
                : null,
              isActive: stats.isActive,
              updatedAt: new Date(),
            },
          });
        } catch (error) {
          logger.error(`❌ Error updating stats for ${stats.account}:`, error);
          // Continue with next address
        }
      }
    } catch (error) {
      logger.error('❌ Error updating address statistics:', error);
      throw error;
    }
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isRunning: boolean;
    batchSize: number;
    workerInterval: number;
    consecutiveErrors: number;
    lastErrorTime: Date | null;
  } {
    return {
      isRunning: this.isRunning,
      batchSize: this.BATCH_SIZE,
      workerInterval: this.WORKER_INTERVAL,
      consecutiveErrors: this.consecutiveErrors,
      lastErrorTime: this.lastErrorTime,
    };
  }
}
