/**
 * Centralized token address configuration
 * All services should import and use these constants
 */
export const TOKEN_ADDRESSES = {
  MSQ: '0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499',
  SUT: '0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55',
  KWT: '0x435001Af7fC65B621B0043df99810B2f30860c5d',
  P2UC: '0x8B3C6ff5911392dECB5B08611822280dEe0E4f64',
} as const;

export type TokenSymbol = keyof typeof TOKEN_ADDRESSES;

/**
 * Get token address by symbol
 * @param symbol Token symbol (case-insensitive)
 * @returns Token address or undefined if symbol not found
 */
export function getTokenAddress(symbol: string): string | undefined {
  const upperSymbol = symbol.toUpperCase() as TokenSymbol;
  return TOKEN_ADDRESSES[upperSymbol];
}

/**
 * Get all token addresses as array
 * @returns Array of token addresses
 */
export function getAllTokenAddresses(): string[] {
  return Object.values(TOKEN_ADDRESSES);
}

/**
 * Get token symbol by address
 * @param address Token address (case-insensitive)
 * @returns Token symbol or undefined if address not found
 */
export function getTokenSymbol(address: string): TokenSymbol | undefined {
  const lowerAddress = address.toLowerCase();
  const entry = Object.entries(TOKEN_ADDRESSES).find(
    ([, addr]) => addr.toLowerCase() === lowerAddress
  );
  return entry ? (entry[0] as TokenSymbol) : undefined;
}
