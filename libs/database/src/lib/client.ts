import { PrismaClient } from '@prisma/client';
import { initializeDatabaseConfig } from './config';
import { logger } from '@msq-tx-monitor/msq-common';

// Ensure database configuration is loaded before Prisma initialization
initializeDatabaseConfig();

// Global instance to prevent multiple Prisma Client instances in development
/* eslint-disable no-var */
declare global {
  var prisma: PrismaClient | undefined;
}
/* eslint-enable no-var */

// Verify DATABASE_URL is available before creating Prisma client
if (!process.env.DATABASE_URL) {
  logger.error('❌ DATABASE_URL not found in environment variables');
  logger.error(
    '   This should have been set by the database configuration module'
  );
  process.exit(1);
}

export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log:
      process.env.ENABLE_QUERY_LOGS === 'true'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Export for convenience
export default prisma;
