/**
 * Date utility functions for the transaction dashboard
 */

/**
 * Convert a timestamp to a relative time string (e.g., "15 secs ago", "2 mins ago")
 */
export function getRelativeTime(timestamp: number | Date): string {
  const now = Date.now();
  const time = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const diff = Math.floor((now - time) / 1000); // difference in seconds

  if (diff < 0) {
    return 'just now';
  }

  if (diff < 60) {
    return `${diff} secs ago`;
  }

  const mins = Math.floor(diff / 60);
  if (mins < 60) {
    return `${mins} min${mins === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/**
 * Format a timestamp to a short date string
 */
export function formatShortDate(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate a string (typically addresses or hashes) and add ellipsis
 */
export function truncateString(str: string, startChars: number = 6, endChars: number = 4): string {
  if (str.length <= startChars + endChars + 3) {
    return str;
  }
  return `${str.slice(0, startChars)}...${str.slice(-endChars)}`;
}

/**
 * Truncate transaction hash for display
 */
export function truncateHash(hash: string): string {
  // 0x 포함하여 12자 표시하고 ... 추가
  return hash.slice(0, 12) + '...';
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string): string {
  return truncateString(address, 6, 4);
}