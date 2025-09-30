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
  // Check if string ends with K, M, or B suffix
  const suffixMatch = str.match(/^([\d.]+)([KMB])$/);

  if (suffixMatch) {
    // Extract number part and suffix
    let numberPart = suffixMatch[1];
    const suffix = suffixMatch[2];

    // Remove trailing zeros after decimal point
    numberPart = numberPart.replace(/(\.\d*?)0+$/, '$1');
    // Remove decimal point if no decimals remain
    numberPart = numberPart.replace(/\.$/, '');

    return numberPart + suffix;
  }

  // No suffix, use original logic
  let result = str.replace(/(\.\d*?)0+$/, '$1');
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
    // Use toLocaleString to add thousand separators
    if (precision === 0) {
      return Math.round(num).toLocaleString('en-US');
    }
    // For non-zero precision, format with fixed decimal places then add separators
    const parts = num.toFixed(precision).split('.');
    parts[0] = parseInt(parts[0]).toLocaleString('en-US');
    const result = parts.join('.');
    // Remove trailing zeros after decimal point
    return removeTrailingZeros(result);
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
    precision = 0, // Changed default to 0 for no decimals
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

  // Custom formatting for volume - no K, only M and B
  let formatted: string;
  if (compact) {
    if (actualValue >= 1e9) {
      // For B unit, show 1 decimal place and remove trailing zeros
      formatted = removeTrailingZeros(`${(actualValue / 1e9).toFixed(1)}B`);
    } else if (actualValue >= 1e6) {
      // For M unit, show 1 decimal place and remove trailing zeros
      formatted = removeTrailingZeros(`${(actualValue / 1e6).toFixed(1)}M`);
    } else {
      // For values below 1M, show full number with thousand separators (no decimals)
      formatted = formatNumber(actualValue, { precision: 0, compact: false });
    }
  } else {
    formatted = formatNumber(actualValue, { precision, compact: false });
  }

  // Append symbol if requested
  return showSymbol && tokenSymbol ? `${formatted} ${tokenSymbol}` : formatted;
}

/**
 * Helper function to safely convert any value to BigInt-compatible string
 */
function safeBigIntString(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'string') {
    // Handle scientific notation
    if (value.includes('e') || value.includes('E')) {
      const num = Number(value);
      if (isNaN(num)) return BigInt(0);
      return BigInt(Math.floor(num));
    }

    // Handle decimal strings by removing decimal part
    const dotIndex = value.indexOf('.');
    if (dotIndex !== -1) {
      value = value.substring(0, dotIndex);
    }

    try {
      return BigInt(value);
    } catch {
      return BigInt(0);
    }
  }

  if (typeof value === 'number') {
    if (isNaN(value)) return BigInt(0);
    return BigInt(Math.floor(value));
  }

  return BigInt(0);
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
  const value = safeBigIntString(amount);
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

/**
 * Format exact number with thousand separators for tooltips
 * @param value - Raw value (string or number)
 * @param decimals - Token decimals for conversion
 * @returns Formatted string with thousand separators
 */
export function formatExactNumber(
  value: string | number,
  decimals: number = 18
): string {
  // Convert to number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '0';

  // Convert from smallest unit to actual value
  const actualValue = numValue / Math.pow(10, decimals);

  // Round to remove floating point errors
  const rounded = Math.round(actualValue);

  // Format with thousand separators
  return rounded.toLocaleString('en-US');
}

/**
 * Parse formatted volume value back to raw value
 * Handles values like "1.5M MSQ", "2.3B", "1,234.56 KWT"
 * @param formattedValue - Formatted value string
 * @param tokenSymbol - Token symbol for decimal conversion
 * @returns Raw value as string (in smallest token units)
 */
export function parseFormattedVolume(
  formattedValue: string,
  tokenSymbol: string
): string {
  if (!formattedValue) return '0';

  // Extract numeric value and potential unit suffix, ignoring token symbol
  const match = formattedValue.match(/([\d,]+\.?\d*)\s*([MBK]?)/);
  if (!match) return '0';

  const numericPart = match[1].replace(/,/g, ''); // Remove commas
  const unitSuffix = match[2]; // M, B, K, or empty

  const numValue = parseFloat(numericPart);
  if (isNaN(numValue)) return '0';

  // Convert based on unit suffix
  let rawValue = numValue;
  switch (unitSuffix) {
    case 'B':
      rawValue = numValue * 1e9;
      break;
    case 'M':
      rawValue = numValue * 1e6;
      break;
    case 'K':
      rawValue = numValue * 1e3;
      break;
    default:
      rawValue = numValue; // No suffix, use as-is
  }

  // Convert to smallest unit based on token decimals
  const decimals = getTokenDecimals(tokenSymbol);
  const rawValueInSmallestUnit = rawValue * Math.pow(10, decimals);

  return Math.floor(rawValueInSmallestUnit).toString();
}
