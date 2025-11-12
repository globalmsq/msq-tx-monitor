import { SubgraphClient } from '@msq-tx-monitor/subgraph-client';

// Singleton instance
let subgraphClient: SubgraphClient | null = null;

export function getSubgraphClient(): SubgraphClient {
  if (!subgraphClient) {
    const endpoint =
      process.env.NEXT_PUBLIC_SUBGRAPH_URL ||
      'https://api.studio.thegraph.com/query/xxxxx/msq-tokens-subgraph/version/latest';

    subgraphClient = new SubgraphClient({ endpoint });
  }

  return subgraphClient;
}

/**
 * Fetch recent transfers from Subgraph
 * Used in Server Components for initial data
 */
export async function fetchRecentTransfers(limit: number = 100) {
  try {
    const client = getSubgraphClient();
    const transfers = await client.getTransfers({
      first: limit,
      orderBy: 'blockTimestamp',
      orderDirection: 'desc',
    });

    return transfers || [];
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return [];
  }
}

/**
 * Fetch token statistics from Subgraph
 * Returns stats for all tokens
 */
export async function fetchTokenStatistics() {
  try {
    const client = getSubgraphClient();
    const tokens = await client.getTokens(10, 0);

    return tokens || [];
  } catch (error) {
    console.error('Error fetching token statistics:', error);
    return [];
  }
}

/**
 * Fetch token accounts for a specific address
 */
export async function fetchTokenAccountsByAddress(address: string) {
  try {
    const client = getSubgraphClient();
    const accounts = await client.getTokenAccountsByAddress(address);

    return accounts || [];
  } catch (error) {
    console.error('Error fetching token accounts:', error);
    return [];
  }
}

/**
 * Format token amount with proper decimals
 */
export function formatTokenAmount(
  amount: string | bigint,
  decimals: number = 18
): string {
  const value = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const quotient = value / divisor;
  const remainder = value % divisor;

  // Format with comma separators
  const formatted = quotient.toLocaleString('en-US');

  // Add decimal part if significant
  if (remainder > 0n) {
    const decimalPart = remainder.toString().padStart(decimals, '0');
    // Trim trailing zeros
    const trimmed = decimalPart.replace(/0+$/, '');
    if (trimmed) {
      return `${formatted}.${trimmed}`;
    }
  }

  return formatted;
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toLocaleString('en-US');
}
