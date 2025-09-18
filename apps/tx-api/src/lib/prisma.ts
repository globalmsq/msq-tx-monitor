import { PrismaClient } from '@prisma/client';

// Ensure database configuration is loaded before Prisma initialization
// This imports the config which sets up DATABASE_URL from environment variables
import '../config';

// Global instance to prevent multiple Prisma Client instances in development
/* eslint-disable no-var */
declare global {
  var prisma: PrismaClient | undefined;
}
/* eslint-enable no-var */

// Verify DATABASE_URL is available before creating Prisma client
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error(
    '   This should have been set by the database configuration module'
  );
  process.exit(1);
}

const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
