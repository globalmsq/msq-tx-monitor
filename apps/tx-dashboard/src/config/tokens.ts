export interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
}

// MSQ Ecosystem Token Configuration
export const TOKEN_CONFIG: Record<string, TokenConfig> = {
  MSQ: {
    symbol: 'MSQ',
    address: '0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499',
    decimals: 18,
  },
  KWT: {
    symbol: 'KWT',
    address: '0x435001Af7fC65B621B0043df99810B2f30860c5d',
    decimals: 6,
  },
  SUT: {
    symbol: 'SUT',
    address: '0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55',
    decimals: 18,
  },
  P2UC: {
    symbol: 'P2UC',
    address: '0x8B3C6ff5911392dECB5B08611822280dEe0E4f64',
    decimals: 18,
  },
};

// Helper function to get token config by symbol
export function getTokenConfigBySymbol(
  symbol: string
): TokenConfig | undefined {
  return TOKEN_CONFIG[symbol.toUpperCase()];
}

// Helper function to get token config by address
export function getTokenConfigByAddress(
  address: string
): TokenConfig | undefined {
  const normalizedAddress = address.toLowerCase();
  return Object.values(TOKEN_CONFIG).find(
    config => config.address.toLowerCase() === normalizedAddress
  );
}

// Helper function to get token config (by address or symbol)
export function getTokenConfig(
  addressOrSymbol: string
): TokenConfig | undefined {
  // First try by symbol (if it's a known symbol)
  const bySymbol = getTokenConfigBySymbol(addressOrSymbol);
  if (bySymbol) {
    return bySymbol;
  }

  // Then try by address
  return getTokenConfigByAddress(addressOrSymbol);
}

// Helper function to get token decimals by address or symbol
export function getTokenDecimals(addressOrSymbol: string): number {
  const config = getTokenConfig(addressOrSymbol);
  return config?.decimals || 18; // Default to 18 decimals if unknown
}

// Helper function to get token symbol by address
export function getTokenSymbol(address: string): string {
  const config = getTokenConfigByAddress(address);
  return config?.symbol || 'UNKNOWN';
}
