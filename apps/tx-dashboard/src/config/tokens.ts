export interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
}

// MSQ Ecosystem Token Configuration
export const TOKEN_CONFIG: Record<string, TokenConfig> = {
  '0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499': {
    symbol: 'MSQ',
    address: '0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499',
    decimals: 18,
  },
  '0x435001Af7fC65B621B0043df99810B2f30860c5d': {
    symbol: 'KWT',
    address: '0x435001Af7fC65B621B0043df99810B2f30860c5d',
    decimals: 18,
  },
  '0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55': {
    symbol: 'SUT',
    address: '0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55',
    decimals: 18,
  },
  '0x8B3C6ff5911392dECB5B08611822280dEe0E4f64': {
    symbol: 'P2UC',
    address: '0x8B3C6ff5911392dECB5B08611822280dEe0E4f64',
    decimals: 6,
  },
};

// Helper function to get token config by address
export function getTokenConfig(address: string): TokenConfig | undefined {
  return TOKEN_CONFIG[address.toLowerCase()] || TOKEN_CONFIG[address];
}

// Helper function to get token decimals by address
export function getTokenDecimals(address: string): number {
  const config = getTokenConfig(address);
  return config?.decimals || 18; // Default to 18 decimals if unknown
}

// Helper function to get token symbol by address
export function getTokenSymbol(address: string): string {
  const config = getTokenConfig(address);
  return config?.symbol || 'UNKNOWN';
}
