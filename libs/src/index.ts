// Export Prisma client and configuration
export { prisma, default as prismaClient } from './lib/client';
export { initializeDatabaseConfig, type DatabaseConfig } from './lib/config';

// Re-export Prisma types for convenience
export type { Prisma } from '@prisma/client';
