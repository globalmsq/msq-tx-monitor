import { getTokenConfig } from '../config/tokens';

/**
 * Format token amount with proper decimals
 * @param rawValue - Raw token value (string representation of wei-like value)
 * @param tokenSymbol - Token symbol (MSQ, KWT, SUT, P2UC)
 * @param tokenAddress - Token contract address (used if symbol lookup fails)
 * @returns Formatted token amount with symbol
 */
export function formatTokenAmount(
  rawValue: string,
  tokenSymbol: string,
  tokenAddress?: string
): string {
  try {
    // Convert raw value to number for calculation
    const rawAmount = BigInt(rawValue);

    // If rawAmount is 0, return early
    if (rawAmount === 0n) {
      return `0 ${tokenSymbol}`;
    }

    // Get token decimals - first try by symbol, then by address
    let decimals = 18; // default

    // Try to find token config by address first (more reliable)
    if (tokenAddress) {
      const configByAddress = getTokenConfig(tokenAddress);
      if (configByAddress) {
        decimals = configByAddress.decimals;
      }
    } else {
      // Fallback to symbol-based lookup
      const knownDecimals: Record<string, number> = {
        MSQ: 18,
        KWT: 18,
        SUT: 18,
        P2UC: 6,
      };
      decimals = knownDecimals[tokenSymbol.toUpperCase()] || 18;
    }

    // Calculate the divisor based on decimals
    const divisor = BigInt(10 ** decimals);

    // Calculate the formatted amount
    const integerPart = rawAmount / divisor;
    const fractionalPart = rawAmount % divisor;

    // Convert to decimal representation
    const decimalValue =
      Number(integerPart) + Number(fractionalPart) / Number(divisor);

    // Format the number based on size
    let formattedNumber: string;

    if (decimalValue === 0) {
      formattedNumber = '0';
    } else if (decimalValue >= 1_000_000) {
      // Format as millions (e.g., 1.2M)
      formattedNumber = (decimalValue / 1_000_000).toFixed(1) + 'M';
    } else if (decimalValue >= 1_000) {
      // Format as thousands (e.g., 1.2K)
      formattedNumber = (decimalValue / 1_000).toFixed(1) + 'K';
    } else if (decimalValue >= 1) {
      // Regular numbers with 2 decimal places
      formattedNumber = decimalValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } else if (decimalValue >= 0.01) {
      // Small numbers with more precision
      formattedNumber = decimalValue.toFixed(4);
    } else {
      // Very small numbers
      formattedNumber = '<0.01';
    }

    return `${formattedNumber} ${tokenSymbol}`;
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return `${rawValue} ${tokenSymbol}`;
  }
}

/**
 * Format token amount for display in statistics (more concise)
 * @param rawValue - Raw token value (string representation)
 * @param tokenSymbol - Token symbol
 * @param tokenAddress - Token contract address
 * @returns Formatted token amount for statistics display
 */
export function formatTokenAmountForStats(
  rawValue: string,
  tokenSymbol: string,
  tokenAddress?: string
): string {
  try {
    const rawAmount = BigInt(rawValue);

    if (rawAmount === 0n) {
      return `0 ${tokenSymbol}`;
    }

    // Get token decimals
    let decimals = 18;
    if (tokenAddress) {
      const config = getTokenConfig(tokenAddress);
      if (config) {
        decimals = config.decimals;
      }
    } else {
      const knownDecimals: Record<string, number> = {
        MSQ: 18,
        KWT: 18,
        SUT: 18,
        P2UC: 6,
      };
      decimals = knownDecimals[tokenSymbol.toUpperCase()] || 18;
    }

    const divisor = BigInt(10 ** decimals);
    const decimalValue = Number(rawAmount) / Number(divisor);

    // More aggressive formatting for statistics
    if (decimalValue >= 1_000_000_000) {
      return `${(decimalValue / 1_000_000_000).toFixed(1)}B ${tokenSymbol}`;
    } else if (decimalValue >= 1_000_000) {
      return `${(decimalValue / 1_000_000).toFixed(1)}M ${tokenSymbol}`;
    } else if (decimalValue >= 1_000) {
      return `${(decimalValue / 1_000).toFixed(1)}K ${tokenSymbol}`;
    } else if (decimalValue >= 1) {
      return `${decimalValue.toFixed(1)} ${tokenSymbol}`;
    } else if (decimalValue >= 0.01) {
      return `${decimalValue.toFixed(3)} ${tokenSymbol}`;
    } else {
      return `<0.01 ${tokenSymbol}`;
    }
  } catch (error) {
    console.error('Error formatting token amount for stats:', error);
    return `${rawValue} ${tokenSymbol}`;
  }
}
