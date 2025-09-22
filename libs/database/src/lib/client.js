'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.prisma = void 0;
const client_1 = require('@prisma/client');
const config_1 = require('./config');
// Ensure database configuration is loaded before Prisma initialization
(0, config_1.initializeDatabaseConfig)();
/* eslint-enable no-var */
// Verify DATABASE_URL is available before creating Prisma client
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error(
    '   This should have been set by the database configuration module'
  );
  process.exit(1);
}
exports.prisma =
  globalThis.prisma ||
  new client_1.PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = exports.prisma;
}
// Export for convenience
exports.default = exports.prisma;
//# sourceMappingURL=client.js.map
