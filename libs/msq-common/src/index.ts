/**
 * MSQ Common Library
 * MSQ ecosystem specific functions and utilities
 */

// MSQ Token constants
export const MSQ_TOKENS = {
  MSQ: {
    symbol: 'MSQ',
    name: 'MSQ Token',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000001', // Placeholder
  },
  SUT: {
    symbol: 'SUT',
    name: 'Stablecoin Utility Token',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000002', // Placeholder
  },
  KWT: {
    symbol: 'KWT',
    name: 'Kingdomware Token',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000003', // Placeholder
  },
  P2UC: {
    symbol: 'P2UC',
    name: 'Pay2Use Coin',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000004', // Placeholder
  },
} as const;

// Risk calculator utilities
export class RiskCalculator {
  private static readonly WHALE_THRESHOLD = BigInt('1000000000000000000000000'); // 1M tokens
  private static readonly HIGH_FREQUENCY_THRESHOLD = 100; // transactions per hour
  private static readonly SUSPICIOUS_AMOUNT_MULTIPLIER = 10; // 10x average

  static calculateAddressRiskScore(
    totalVolume: string,
    transactionCount: number,
    avgTransactionSize: string,
    maxTransactionSize: string,
    timeSpanHours: number = 24
  ): number {
    let riskScore = 0;

    // Volume-based risk (0-0.4)
    const volume = BigInt(totalVolume);
    if (volume > this.WHALE_THRESHOLD) {
      riskScore += 0.4;
    } else {
      riskScore += (Number(volume) / Number(this.WHALE_THRESHOLD)) * 0.4;
    }

    // Frequency-based risk (0-0.3)
    const frequency = transactionCount / timeSpanHours;
    if (frequency > this.HIGH_FREQUENCY_THRESHOLD) {
      riskScore += 0.3;
    } else {
      riskScore += (frequency / this.HIGH_FREQUENCY_THRESHOLD) * 0.3;
    }

    // Amount anomaly risk (0-0.3)
    const avgAmount = BigInt(avgTransactionSize);
    const maxAmount = BigInt(maxTransactionSize);
    const anomalyRatio = Number(maxAmount) / Number(avgAmount);
    if (anomalyRatio > this.SUSPICIOUS_AMOUNT_MULTIPLIER) {
      riskScore += 0.3;
    } else {
      riskScore += (anomalyRatio / this.SUSPICIOUS_AMOUNT_MULTIPLIER) * 0.3;
    }

    return Math.min(riskScore, 1.0);
  }

  static isWhaleTransaction(amount: string, tokenSymbol: string): boolean {
    const value = BigInt(amount);
    return value > this.WHALE_THRESHOLD;
  }

  static calculateTransactionRisk(
    amount: string,
    fromAddressRisk: number,
    toAddressRisk: number,
    isUnusualTime: boolean = false
  ): number {
    let riskScore = 0;

    // Amount-based risk (0-0.4)
    const value = BigInt(amount);
    if (value > this.WHALE_THRESHOLD) {
      riskScore += 0.4;
    } else {
      riskScore += (Number(value) / Number(this.WHALE_THRESHOLD)) * 0.4;
    }

    // Address-based risk (0-0.4)
    const maxAddressRisk = Math.max(fromAddressRisk, toAddressRisk);
    riskScore += maxAddressRisk * 0.4;

    // Time-based risk (0-0.2)
    if (isUnusualTime) {
      riskScore += 0.2;
    }

    return Math.min(riskScore, 1.0);
  }
}

// Whale detector utilities
export class WhaleDetector {
  private static readonly WHALE_THRESHOLDS = {
    MSQ: BigInt('1000000000000000000000000'), // 1M MSQ
    SUT: BigInt('5000000000000000000000000'), // 5M SUT (stablecoin)
    KWT: BigInt('500000000000000000000000'), // 500K KWT
    P2UC: BigInt('2000000000000000000000000'), // 2M P2UC
  };

  static isWhale(amount: string, tokenSymbol: string): boolean {
    const value = BigInt(amount);
    const threshold =
      this.WHALE_THRESHOLDS[tokenSymbol as keyof typeof this.WHALE_THRESHOLDS];
    return threshold ? value >= threshold : false;
  }

  static getWhaleCategory(
    amount: string,
    tokenSymbol: string
  ): 'normal' | 'whale' | 'mega-whale' {
    const value = BigInt(amount);
    const threshold =
      this.WHALE_THRESHOLDS[tokenSymbol as keyof typeof this.WHALE_THRESHOLDS];

    if (!threshold) return 'normal';

    if (value >= threshold * BigInt(10)) {
      return 'mega-whale';
    } else if (value >= threshold) {
      return 'whale';
    } else {
      return 'normal';
    }
  }

  static formatWhaleAmount(amount: string, tokenSymbol: string): string {
    const decimals =
      MSQ_TOKENS[tokenSymbol as keyof typeof MSQ_TOKENS]?.decimals || 18;
    const divisor = BigInt(10 ** decimals);
    const value = BigInt(amount) / divisor;

    if (value >= 1000000) {
      return `${(Number(value) / 1000000).toFixed(2)}M ${tokenSymbol}`;
    } else if (value >= 1000) {
      return `${(Number(value) / 1000).toFixed(2)}K ${tokenSymbol}`;
    } else {
      return `${value.toString()} ${tokenSymbol}`;
    }
  }
}

// MSQ ecosystem utilities
export class MSQEcosystem {
  static getTokenInfo(
    addressOrSymbol: string
  ): (typeof MSQ_TOKENS)[keyof typeof MSQ_TOKENS] | null {
    const normalizedInput = addressOrSymbol.toLowerCase();

    for (const token of Object.values(MSQ_TOKENS)) {
      if (
        token.address.toLowerCase() === normalizedInput ||
        token.symbol.toLowerCase() === normalizedInput
      ) {
        return token;
      }
    }

    return null;
  }

  static getAllTokenAddresses(): string[] {
    return Object.values(MSQ_TOKENS).map(token => token.address);
  }

  static getAllTokenSymbols(): string[] {
    return Object.values(MSQ_TOKENS).map(token => token.symbol);
  }

  static isEcosystemToken(address: string): boolean {
    return this.getAllTokenAddresses().includes(address.toLowerCase());
  }

  static getTokensByType(): {
    stablecoins: string[];
    utility: string[];
    governance: string[];
  } {
    return {
      stablecoins: ['SUT'], // Stablecoin Utility Token
      utility: ['KWT', 'P2UC'], // Utility tokens
      governance: ['MSQ'], // Governance token
    };
  }
}

// Constants and configuration
export const MSQ_CONSTANTS = {
  CHAIN_ID: 137, // Polygon Mainnet
  BLOCK_CONFIRMATION: 12,
  DEFAULT_SCAN_INTERVAL: 5000,
  WHALE_ALERT_THRESHOLD: '1000000000000000000000000', // 1M tokens
  HIGH_RISK_THRESHOLD: 0.8,
  CRITICAL_RISK_THRESHOLD: 0.95,
} as const;

// Export all utilities
export {
  MSQ_TOKENS,
  RiskCalculator,
  WhaleDetector,
  MSQEcosystem,
  MSQ_CONSTANTS,
};
