// eslint-disable-next-line @nx/enforce-module-boundaries
import { prisma, initializeDatabaseConfig } from '@msq-tx-monitor/database';
import { config } from '../config';

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

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize database configuration
      initializeDatabaseConfig();

      // Test database connection
      await prisma.$connect();
      console.log('Database connected successfully');

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async saveTransaction(transactionData: TransactionData): Promise<void> {
    try {
      await prisma.transaction.create({
        data: {
          hash: transactionData.hash,
          blockNumber: BigInt(transactionData.blockNumber),
          transactionIndex: transactionData.transactionIndex,
          fromAddress: transactionData.from,
          toAddress: transactionData.to,
          value: transactionData.value,
          gasPrice: BigInt(transactionData.gasPrice),
          gasUsed: BigInt(transactionData.gasUsed),
          tokenAddress: transactionData.tokenAddress,
          tokenSymbol: transactionData.tokenSymbol,
          tokenDecimals: transactionData.tokenDecimals,
          timestamp: transactionData.timestamp,
        },
      });

      // Update address statistics
      await this.updateAddressStatistics(transactionData);

      if (config.logging.enableDatabaseLogs) {
        console.log(`Transaction saved: ${transactionData.hash}`);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        // Transaction already exists, skip
        if (config.logging.enableDatabaseLogs) {
          console.log(`Transaction already exists: ${transactionData.hash}`);
        }
        return;
      }
      console.error('Error saving transaction:', error);
      throw error;
    }
  }

  async saveTransactionBatch(transactions: TransactionData[]): Promise<void> {
    if (transactions.length === 0) {
      return;
    }

    try {
      await prisma.$transaction(async tx => {
        // Use createMany for bulk insert with skipDuplicates
        await tx.transaction.createMany({
          data: transactions.map(t => ({
            hash: t.hash,
            blockNumber: BigInt(t.blockNumber),
            transactionIndex: t.transactionIndex,
            fromAddress: t.from,
            toAddress: t.to,
            value: t.value,
            gasPrice: BigInt(t.gasPrice),
            gasUsed: BigInt(t.gasUsed),
            tokenAddress: t.tokenAddress,
            tokenSymbol: t.tokenSymbol,
            tokenDecimals: t.tokenDecimals,
            timestamp: t.timestamp,
          })),
          skipDuplicates: true,
        });

        // Update address statistics for each transaction
        for (const transaction of transactions) {
          await this.updateAddressStatisticsInTransaction(tx, transaction);
        }
      });

      console.log(`Batch saved: ${transactions.length} transactions`);
    } catch (error) {
      console.error('Error saving transaction batch:', error);
      throw error;
    }
  }

  private async updateAddressStatistics(
    transactionData: TransactionData
  ): Promise<void> {
    const { from, to, value, timestamp, tokenAddress } = transactionData;

    // Update sender statistics
    await this.upsertAddressStatistics(from, tokenAddress, {
      totalValueOut: { increment: value },
      lastSeen: timestamp,
      firstSeen: timestamp,
    });

    // Update receiver statistics
    await this.upsertAddressStatistics(to, tokenAddress, {
      totalValueIn: { increment: value },
      lastSeen: timestamp,
      firstSeen: timestamp,
    });
  }

  private async updateAddressStatisticsInTransaction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    transactionData: TransactionData
  ): Promise<void> {
    const { from, to, value, timestamp, tokenAddress } = transactionData;

    // Update sender statistics
    await this.upsertAddressStatisticsInTransaction(tx, from, tokenAddress, {
      totalValueOut: { increment: value },
      lastSeen: timestamp,
      firstSeen: timestamp,
    });

    // Update receiver statistics
    await this.upsertAddressStatisticsInTransaction(tx, to, tokenAddress, {
      totalValueIn: { increment: value },
      lastSeen: timestamp,
      firstSeen: timestamp,
    });
  }

  private async upsertAddressStatistics(
    address: string,
    tokenAddress: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateData: any
  ): Promise<void> {
    await prisma.addressStatistics.upsert({
      where: {
        address_tokenAddress: {
          address,
          tokenAddress,
        },
      },
      update: {
        totalSent: updateData.totalValueOut
          ? { increment: updateData.totalValueOut.increment }
          : undefined,
        totalReceived: updateData.totalValueIn
          ? { increment: updateData.totalValueIn.increment }
          : undefined,
        transactionCountSent: updateData.totalValueOut
          ? { increment: 1 }
          : undefined,
        transactionCountReceived: updateData.totalValueIn
          ? { increment: 1 }
          : undefined,
        lastSeen: updateData.lastSeen,
      },
      create: {
        address,
        tokenAddress,
        totalSent: updateData.totalValueOut?.increment || '0',
        totalReceived: updateData.totalValueIn?.increment || '0',
        transactionCountSent: updateData.totalValueOut ? 1 : 0,
        transactionCountReceived: updateData.totalValueIn ? 1 : 0,
        firstSeen: updateData.firstSeen,
        lastSeen: updateData.lastSeen,
        riskScore: 0,
        isWhale: false,
      },
    });
  }

  private async upsertAddressStatisticsInTransaction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    address: string,
    tokenAddress: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateData: any
  ): Promise<void> {
    await tx.addressStatistics.upsert({
      where: {
        address_tokenAddress: {
          address,
          tokenAddress,
        },
      },
      update: {
        totalSent: updateData.totalValueOut
          ? { increment: updateData.totalValueOut.increment }
          : undefined,
        totalReceived: updateData.totalValueIn
          ? { increment: updateData.totalValueIn.increment }
          : undefined,
        transactionCountSent: updateData.totalValueOut
          ? { increment: 1 }
          : undefined,
        transactionCountReceived: updateData.totalValueIn
          ? { increment: 1 }
          : undefined,
        lastSeen: updateData.lastSeen,
      },
      create: {
        address,
        tokenAddress,
        totalSent: updateData.totalValueOut?.increment || '0',
        totalReceived: updateData.totalValueIn?.increment || '0',
        transactionCountSent: updateData.totalValueOut ? 1 : 0,
        transactionCountReceived: updateData.totalValueIn ? 1 : 0,
        firstSeen: updateData.firstSeen,
        lastSeen: updateData.lastSeen,
        riskScore: 0,
        isWhale: false,
      },
    });
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
      const result = await prisma.addressStatistics.findUnique({
        where: {
          address_tokenAddress: {
            address,
            tokenAddress,
          },
        },
      });
      return result ? [result] : [];
    }

    return prisma.addressStatistics.findMany({
      where: { address },
    });
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
    console.log(
      `Confirmation update for ${hash}: ${confirmations} confirmations`
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await prisma.$disconnect();
    this.initialized = false;
  }
}
