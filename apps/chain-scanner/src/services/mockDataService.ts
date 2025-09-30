/**
 * Mock data service for testing WebSocket transaction broadcasting
 * Generates fake transaction data for dashboard testing
 */

import { logger } from '@msq-tx-monitor/msq-common';

interface MockTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  token: string;
  timestamp: number;
  blockNumber: number;
  gasUsed: string;
  gasPrice: string;
  status: 'pending' | 'confirmed' | 'failed';
  anomalyScore?: number;
}

export class MockDataService {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;
  private blockNumber = 48500000; // Starting block number
  private onTransactionCallback?: (transaction: MockTransaction) => void;

  private readonly tokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
  private readonly addresses = [
    '0x1234567890123456789012345678901234567890',
    '0x2345678901234567890123456789012345678901',
    '0x3456789012345678901234567890123456789012',
    '0x4567890123456789012345678901234567890123',
    '0x5678901234567890123456789012345678901234',
    '0x6789012345678901234567890123456789012345',
    '0x7890123456789012345678901234567890123456',
    '0x8901234567890123456789012345678901234567',
    '0x9012345678901234567890123456789012345678',
    '0xa012345678901234567890123456789012345678',
  ];

  constructor() {
    logger.info('MockDataService initialized');
  }

  start(intervalMs: number = 3000): void {
    if (this.isRunning) {
      logger.info('MockDataService is already running');
      return;
    }

    this.isRunning = true;
    logger.info(`Starting mock data generation every ${intervalMs}ms`);

    this.interval = setInterval(() => {
      this.generateTransaction();
    }, intervalMs);

    // Generate initial transaction immediately
    setTimeout(() => this.generateTransaction(), 1000);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logger.info('MockDataService stopped');
  }

  onTransaction(callback: (transaction: MockTransaction) => void): void {
    this.onTransactionCallback = callback;
  }

  private generateTransaction(): void {
    const transaction = this.createRandomTransaction();

    logger.info('Generated mock transaction:', {
      hash: transaction.hash,
      token: transaction.token,
      value: transaction.value,
      from: transaction.from.slice(0, 8) + '...',
      to: transaction.to.slice(0, 8) + '...',
    });

    if (this.onTransactionCallback) {
      this.onTransactionCallback(transaction);
    }
  }

  private createRandomTransaction(): MockTransaction {
    const token = this.getRandomToken();
    const from = this.getRandomAddress();
    const to = this.getRandomAddress(from); // Ensure different addresses
    const value = this.generateRandomValue(token);
    const hash = this.generateTransactionHash();

    return {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      hash,
      from,
      to,
      value,
      token,
      timestamp: Date.now(),
      blockNumber: this.blockNumber++,
      gasUsed: this.generateRandomGas(),
      gasPrice: this.generateRandomGasPrice(),
      status: Math.random() > 0.95 ? 'failed' : 'confirmed',
      anomalyScore: Math.random() > 0.9 ? Math.random() * 100 : undefined,
    };
  }

  private getRandomToken(): string {
    return this.tokens[Math.floor(Math.random() * this.tokens.length)];
  }

  private getRandomAddress(exclude?: string): string {
    let address;
    do {
      address =
        this.addresses[Math.floor(Math.random() * this.addresses.length)];
    } while (address === exclude);
    return address;
  }

  private generateRandomValue(token: string): string {
    // Different value ranges for different tokens
    const ranges = {
      MSQ: { min: 100, max: 10000 },
      SUT: { min: 50, max: 5000 },
      KWT: { min: 10, max: 1000 },
      P2UC: { min: 1, max: 100 },
    };

    const range = ranges[token as keyof typeof ranges] || ranges.MSQ;
    const value = Math.floor(
      Math.random() * (range.max - range.min) + range.min
    );

    return value.toLocaleString();
  }

  private generateTransactionHash(): string {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  private generateRandomGas(): string {
    const gas = Math.floor(Math.random() * 100000) + 21000;
    return gas.toString();
  }

  private generateRandomGasPrice(): string {
    const gasPrice = Math.floor(Math.random() * 50) + 10; // 10-60 gwei
    return (gasPrice * 1e9).toString(); // Convert to wei
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const mockDataService = new MockDataService();
