import { DatabaseService } from './databaseService';
import { logger } from '@msq-tx-monitor/msq-common';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isActive: boolean;
}

export class TokenService {
  private tokenCache: Map<string, TokenInfo> = new Map();
  private initialized = false;

  constructor(private databaseService: DatabaseService) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.loadTokensFromDB();
      this.initialized = true;
      logger.info(
        `✅ TokenService initialized with ${this.tokenCache.size} tokens`
      );
    } catch (error) {
      logger.error('❌ Failed to initialize TokenService:', error);
      throw error;
    }
  }

  private async loadTokensFromDB(): Promise<void> {
    const { prisma } = await import('@msq-tx-monitor/database');

    const tokens = await prisma.token.findMany({
      where: { isActive: true },
      select: {
        address: true,
        symbol: true,
        name: true,
        decimals: true,
        isActive: true,
      },
    });

    this.tokenCache.clear();
    for (const token of tokens) {
      this.tokenCache.set(token.address.toLowerCase(), token);
    }

    logger.info(`📋 Loaded ${tokens.length} active tokens from database`);
  }

  getTokenInfo(address: string): TokenInfo | undefined {
    if (!this.initialized) {
      logger.warn('⚠️ TokenService not initialized. Call initialize() first.');
      return undefined;
    }

    return this.tokenCache.get(address.toLowerCase());
  }

  getTokenSymbol(address: string): string {
    const tokenInfo = this.getTokenInfo(address);
    return tokenInfo?.symbol || 'UNKNOWN';
  }

  getTokenName(address: string): string {
    const tokenInfo = this.getTokenInfo(address);
    return tokenInfo?.name || 'Unknown Token';
  }

  getTokenDecimals(address: string): number {
    const tokenInfo = this.getTokenInfo(address);
    return tokenInfo?.decimals || 18;
  }

  isKnownToken(address: string): boolean {
    return this.tokenCache.has(address.toLowerCase());
  }

  getAllTokenAddresses(): string[] {
    return Array.from(this.tokenCache.keys());
  }

  getAllTokens(): TokenInfo[] {
    return Array.from(this.tokenCache.values());
  }

  async refreshTokenCache(): Promise<void> {
    logger.info('🔄 Refreshing token cache from database...');
    await this.loadTokensFromDB();
  }
}
