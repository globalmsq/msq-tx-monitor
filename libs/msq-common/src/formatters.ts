/**
 * Common formatters for MSQ Transaction Monitor
 * Provides consistent number and volume formatting across all services
 */

import { MSQ_TOKENS } from './index';

export interface FormatOptions {
  decimals?: number; // Token decimals (auto-detected from token symbol)
  precision?: number; // Decimal places to show (default: 1)
  showSymbol?: boolean; // Whether to append token symbol (default: false)
  compact?: boolean; // Use compact notation (K, M, B) (default: true)
}

/**
 * Remove trailing zeros and unnecessary decimal point
 */
function removeTrailingZeros(str: string): string {
  // First remove trailing zeros after decimal point
  let result = str.replace(/(\.\d*?)0+$/, '$1');
  // Then remove decimal point if no decimals remain
  result = result.replace(/\.$/, '');
  return result;
}

/**
 * Get token decimals from token symbol
 */
export function getTokenDecimals(tokenSymbol: string): number {
  return MSQ_TOKENS[tokenSymbol as keyof typeof MSQ_TOKENS]?.decimals || 18;
}

/**
 * Format a number with consistent decimal places and unit abbreviation
 * @param value - The number to format
 * @param options - Formatting options
 */
export function formatNumber(
  value: number | string,
  options: FormatOptions = {}
): string {
  const { precision = 1, compact = true } = options;

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0';

  if (!compact) {
    return removeTrailingZeros(num.toFixed(precision));
  }

  // Use consistent precision (default: 1 decimal place)
  if (num >= 1e9) {
    return removeTrailingZeros(`${(num / 1e9).toFixed(precision)}B`);
  }
  if (num >= 1e6) {
    return removeTrailingZeros(`${(num / 1e6).toFixed(precision)}M`);
  }
  if (num >= 1e3) {
    return removeTrailingZeros(`${(num / 1e3).toFixed(precision)}K`);
  }

  // For small numbers, use up to 3 decimal places if needed
  if (num < 1 && num > 0) {
    return removeTrailingZeros(num.toFixed(Math.min(3, precision + 2)));
  }

  return removeTrailingZeros(num.toFixed(precision));
}

/**
 * Format token volume with proper decimal conversion
 * @param value - Raw token value (in smallest unit)
 * @param tokenSymbol - Token symbol for decimal lookup
 * @param options - Formatting options
 */
export function formatVolume(
  value: string | number,
  tokenSymbol?: string,
  options: FormatOptions = {}
): string {
  const {
    precision = 1,
    showSymbol = false,
    compact = true,
    decimals: customDecimals,
  } = options;

  // Determine decimals to use
  const decimals =
    customDecimals ?? (tokenSymbol ? getTokenDecimals(tokenSymbol) : 18);

  // Convert from smallest unit to actual value
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const actualValue = numValue / Math.pow(10, decimals);

  // Format the number
  const formatted = formatNumber(actualValue, { precision, compact });

  // Append symbol if requested
  return showSymbol && tokenSymbol ? `${formatted} ${tokenSymbol}` : formatted;
}

/**
 * Format a raw amount (BigInt or string) to human readable format
 * Used primarily for whale detection and large amounts
 */
export function formatAmount(
  amount: string | bigint,
  tokenSymbol: string,
  options: FormatOptions = {}
): string {
  const { precision = 1, showSymbol = true } = options;

  const decimals = getTokenDecimals(tokenSymbol);
  const divisor = BigInt(10 ** decimals);
  const value = typeof amount === 'string' ? BigInt(amount) : amount;
  const actualValue = Number(value / divisor);

  const formatted = formatNumber(actualValue, { precision, compact: true });

  return showSymbol ? `${formatted} ${tokenSymbol}` : formatted;
}

/**
 * Format percentage values consistently
 */
export function formatPercentage(value: number, precision: number = 1): string {
  return `${removeTrailingZeros(value.toFixed(precision))}%`;
}

/**
 * Format addresses to show first and last characters
 */
export function formatAddress(address: string, chars: number = 6): string {
  if (!address || address.length < chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars + 2)}`;
}
