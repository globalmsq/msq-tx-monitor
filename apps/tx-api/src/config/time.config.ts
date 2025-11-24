/**
 * Time range configuration and utility functions
 */

export type TimeRange = '1h' | '24h' | '7d' | '30d';

/**
 * Convert time range string to hours
 * @param timeRange Time range string (e.g., "1h", "24h", "7d", "30d")
 * @returns Number of hours, or 24 (default) if invalid format
 */
export function parseTimeRangeToHours(timeRange?: string): number {
  if (!timeRange) {
    return 24; // Default to 24 hours
  }

  const match = timeRange.match(/^(\d+)([hd])$/);
  if (!match) {
    return 24; // Invalid format, use default
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'h':
      return value;
    case 'd':
      return value * 24;
    default:
      return 24;
  }
}

/**
 * Validate time range format
 * @param timeRange Time range string to validate
 * @returns true if valid format, false otherwise
 */
export function isValidTimeRange(timeRange: string): boolean {
  return /^\d+[hd]$/.test(timeRange);
}

/**
 * Get common time ranges
 */
export const COMMON_TIME_RANGES: TimeRange[] = ['1h', '24h', '7d', '30d'];
