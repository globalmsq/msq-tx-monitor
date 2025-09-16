/**
 * Chain Utils Library
 * Blockchain utility functions for MSQ Transaction Monitor
 */

import Web3 from 'web3';

// Address validation utilities
export class AddressValidator {
  static isValidAddress(address: string): boolean {
    return Web3.utils.isAddress(address);
  }

  static toChecksumAddress(address: string): string {
    return Web3.utils.toChecksumAddress(address);
  }

  static compareAddresses(address1: string, address2: string): boolean {
    return address1.toLowerCase() === address2.toLowerCase();
  }
}

// Token parsing utilities
export class TokenParser {
  static parseTokenAmount(amount: string, decimals: number): string {
    const divisor = Math.pow(10, decimals);
    return (BigInt(amount) / BigInt(divisor)).toString();
  }

  static formatTokenAmount(amount: string, decimals: number): string {
    const multiplier = Math.pow(10, decimals);
    return (BigInt(amount) * BigInt(multiplier)).toString();
  }

  static formatDisplayAmount(
    amount: string,
    decimals: number,
    displayDecimals: number = 4
  ): string {
    const parsed = this.parseTokenAmount(amount, decimals);
    const num = parseFloat(parsed);
    return num.toFixed(displayDecimals);
  }
}

// Web3 helper utilities
export class Web3Helper {
  private web3: Web3;
  private backupRpcUrls: string[];
  private currentRpcIndex: number = 0;

  constructor(primaryRpcUrl: string, backupRpcUrls: string[] = []) {
    this.web3 = new Web3(primaryRpcUrl);
    this.backupRpcUrls = [primaryRpcUrl, ...backupRpcUrls];
  }

  async switchToBackupRpc(): Promise<boolean> {
    this.currentRpcIndex =
      (this.currentRpcIndex + 1) % this.backupRpcUrls.length;
    const nextRpcUrl = this.backupRpcUrls[this.currentRpcIndex];

    try {
      this.web3.setProvider(new Web3.providers.HttpProvider(nextRpcUrl));
      // Test connection
      await this.web3.eth.getBlockNumber();
      return true;
    } catch (error) {
      console.error(`Failed to switch to RPC: ${nextRpcUrl}`, error);
      return false;
    }
  }

  async getBlockNumber(): Promise<number> {
    try {
      return await this.web3.eth.getBlockNumber();
    } catch (error) {
      console.error('Failed to get block number:', error);
      const switched = await this.switchToBackupRpc();
      if (switched) {
        return await this.web3.eth.getBlockNumber();
      }
      throw error;
    }
  }

  async getTransaction(hash: string): Promise<any> {
    try {
      return await this.web3.eth.getTransaction(hash);
    } catch (error) {
      console.error(`Failed to get transaction ${hash}:`, error);
      const switched = await this.switchToBackupRpc();
      if (switched) {
        return await this.web3.eth.getTransaction(hash);
      }
      throw error;
    }
  }

  getWeb3Instance(): Web3 {
    return this.web3;
  }

  getCurrentRpcUrl(): string {
    return this.backupRpcUrls[this.currentRpcIndex];
  }
}

// Block processing utilities
export class BlockProcessor {
  static async processBlock(
    web3: Web3,
    blockNumber: number,
    tokenAddresses: string[]
  ): Promise<any[]> {
    const block = await web3.eth.getBlock(blockNumber, true);
    const transactions = [];

    if (block && block.transactions) {
      for (const tx of block.transactions) {
        if (
          typeof tx === 'object' &&
          tx.to &&
          tokenAddresses.includes(tx.to.toLowerCase())
        ) {
          transactions.push({
            hash: tx.hash,
            blockNumber: tx.blockNumber,
            transactionIndex: tx.transactionIndex,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            gas: tx.gas,
            gasPrice: tx.gasPrice,
            input: tx.input,
            timestamp: new Date(Number(block.timestamp) * 1000),
          });
        }
      }
    }

    return transactions;
  }

  static extractTransferEvents(receipt: any): any[] {
    const transferEvents = [];

    if (receipt.logs) {
      for (const log of receipt.logs) {
        // Transfer event signature: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
        if (
          log.topics[0] ===
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
        ) {
          transferEvents.push({
            address: log.address,
            from: '0x' + log.topics[1].slice(26),
            to: '0x' + log.topics[2].slice(26),
            value: Web3.utils.hexToNumberString(log.data),
            logIndex: log.logIndex,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        }
      }
    }

    return transferEvents;
  }
}

// Error handling utilities
export class ChainError extends Error {
  constructor(
    message: string,
    public code?: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ChainError';
  }
}

export class RpcError extends ChainError {
  constructor(
    message: string,
    public rpcUrl: string,
    originalError?: Error
  ) {
    super(`RPC Error (${rpcUrl}): ${message}`, 'RPC_ERROR', originalError);
    this.name = 'RpcError';
  }
}

// Export all utilities
export {
  AddressValidator,
  TokenParser,
  Web3Helper,
  BlockProcessor,
  ChainError,
  RpcError,
};
