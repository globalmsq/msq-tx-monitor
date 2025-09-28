import {
  getTokenConfigBySymbol,
  getTokenConfigByAddress,
} from '../config/tokens';
import { formatUnits } from 'ethers';

/**
 * Get token decimals from symbol or address
 */
function getTokenDecimals(tokenSymbol: string, tokenAddress?: string): number {
  const configBySymbol = getTokenConfigBySymbol(tokenSymbol);
  if (configBySymbol) {
    return configBySymbol.decimals;
  }

  if (tokenAddress) {
    const configByAddress = getTokenConfigByAddress(tokenAddress);
    if (configByAddress) {
      return configByAddress.decimals;
    }
  }

  return 18; // default
}

/**
 * Convert raw token value to decimal number
 */
function rawToDecimal(rawValue: string, decimals: number): number {
  let rawAmount: bigint;

  if (rawValue.includes('e') || rawValue.includes('E')) {
    rawAmount = BigInt(Math.floor(Number(rawValue)));
  } else {
    rawAmount = BigInt(rawValue);
  }

  if (rawAmount === 0n) {
    return 0;
  }

  const formattedValue = formatUnits(rawAmount.toString(), decimals);
  return parseFloat(formattedValue);
}

/**
 * Format token amount with proper decimals (includes symbol)
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
    const decimals = getTokenDecimals(tokenSymbol, tokenAddress);
    const decimalValue = rawToDecimal(rawValue, decimals);

    if (decimalValue === 0) {
      return `0 ${tokenSymbol}`;
    }

    let formattedNumber: string;
    if (decimalValue >= 1_000_000) {
      formattedNumber = (decimalValue / 1_000_000).toFixed(1) + 'M';
    } else if (decimalValue >= 1_000) {
      formattedNumber = (decimalValue / 1_000).toFixed(1) + 'K';
    } else if (decimalValue >= 1) {
      formattedNumber = decimalValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } else if (decimalValue >= 0.01) {
      formattedNumber = decimalValue.toFixed(4);
    } else {
      formattedNumber = '<0.01';
    }

    return `${formattedNumber} ${tokenSymbol}`;
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return `${rawValue} ${tokenSymbol}`;
  }
}

/**
 * Format token value with proper decimals (numeric value only)
 * @param rawValue - Raw token value (string representation of wei-like value)
 * @param tokenSymbol - Token symbol (MSQ, KWT, SUT, P2UC)
 * @param tokenAddress - Token contract address (used if symbol lookup fails)
 * @returns Formatted numeric value without symbol
 */
export function formatTokenValue(
  rawValue: string,
  tokenSymbol: string,
  tokenAddress?: string
): string {
  try {
    const decimals = getTokenDecimals(tokenSymbol, tokenAddress);
    const decimalValue = rawToDecimal(rawValue, decimals);

    if (decimalValue === 0) {
      return '0';
    }

    // Show full numbers without K/M abbreviation
    if (decimalValue >= 1) {
      return decimalValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } else if (decimalValue >= 0.01) {
      return decimalValue.toFixed(4);
    } else {
      return '<0.01';
    }
  } catch (error) {
    console.error('Error formatting token value:', error);
    return rawValue;
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
    const decimals = getTokenDecimals(tokenSymbol, tokenAddress);
    const decimalValue = rawToDecimal(rawValue, decimals);

    if (decimalValue === 0) {
      return `0 ${tokenSymbol}`;
    }

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
