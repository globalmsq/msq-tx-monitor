import { getTokenConfigBySymbol, getTokenConfigByAddress } from '../config/tokens';
import { formatUnits } from 'ethers';

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

    // Get token decimals - try by symbol first (more efficient), then by address
    let decimals = 18; // default

    // Try to find token config by symbol first (faster and more reliable)
    const configBySymbol = getTokenConfigBySymbol(tokenSymbol);
    if (configBySymbol) {
      decimals = configBySymbol.decimals;
    } else if (tokenAddress) {
      // Fallback to address-based lookup
      const configByAddress = getTokenConfigByAddress(tokenAddress);
      if (configByAddress) {
        decimals = configByAddress.decimals;
      }
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
    // Convert raw value to BigInt, handling scientific notation
    let rawAmount: bigint;
    if (rawValue.includes('e') || rawValue.includes('E')) {
      // Handle scientific notation by converting through Number first
      rawAmount = BigInt(Math.floor(Number(rawValue)));
    } else {
      rawAmount = BigInt(rawValue);
    }

    // If rawAmount is 0, return early
    if (rawAmount === 0n) {
      return '0';
    }

    // Get token decimals - try by symbol first (more efficient), then by address
    let decimals = 18; // default

    // Try to find token config by symbol first (faster and more reliable)
    const configBySymbol = getTokenConfigBySymbol(tokenSymbol);
    if (configBySymbol) {
      decimals = configBySymbol.decimals;
    } else if (tokenAddress) {
      // Fallback to address-based lookup
      const configByAddress = getTokenConfigByAddress(tokenAddress);
      if (configByAddress) {
        decimals = configByAddress.decimals;
      }
    }

    // Use ethers formatUnits to convert from wei-like value to decimal
    const formattedValue = formatUnits(rawAmount.toString(), decimals);
    const decimalValue = parseFloat(formattedValue);

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

    return formattedNumber;
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
    // Convert raw value to BigInt, handling scientific notation
    let rawAmount: bigint;
    if (rawValue.includes('e') || rawValue.includes('E')) {
      // Handle scientific notation by converting through Number first
      rawAmount = BigInt(Math.floor(Number(rawValue)));
    } else {
      rawAmount = BigInt(rawValue);
    }

    if (rawAmount === 0n) {
      return `0 ${tokenSymbol}`;
    }

    // Get token decimals - try by symbol first (more efficient), then by address
    let decimals = 18; // default

    // Try to find token config by symbol first (faster and more reliable)
    const configBySymbol = getTokenConfigBySymbol(tokenSymbol);
    if (configBySymbol) {
      decimals = configBySymbol.decimals;
    } else if (tokenAddress) {
      // Fallback to address-based lookup
      const configByAddress = getTokenConfigByAddress(tokenAddress);
      if (configByAddress) {
        decimals = configByAddress.decimals;
      }
    }

    // Use ethers formatUnits for precise decimal conversion
    const formattedValue = formatUnits(rawAmount.toString(), decimals);
    const decimalValue = parseFloat(formattedValue);

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
