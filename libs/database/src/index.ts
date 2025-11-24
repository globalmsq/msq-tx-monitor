// Export Prisma client and configuration
export { prisma, default as prismaClient } from './lib/client.js';
export { initializeDatabaseConfig, type DatabaseConfig } from './lib/config.js';

// Re-export Prisma types for convenience
export type { Prisma } from '@prisma/client';
