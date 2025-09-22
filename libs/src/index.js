'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.initializeDatabaseConfig =
  exports.prismaClient =
  exports.prisma =
    void 0;
// Export Prisma client and configuration
var client_1 = require('./lib/client');
Object.defineProperty(exports, 'prisma', {
  enumerable: true,
  get: function () {
    return client_1.prisma;
  },
});
Object.defineProperty(exports, 'prismaClient', {
  enumerable: true,
  get: function () {
    return __importDefault(client_1).default;
  },
});
var config_1 = require('./lib/config');
Object.defineProperty(exports, 'initializeDatabaseConfig', {
  enumerable: true,
  get: function () {
    return config_1.initializeDatabaseConfig;
  },
});
//# sourceMappingURL=index.js.map
