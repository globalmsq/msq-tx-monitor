// Main client
export { SubgraphClient } from './lib/subgraph-client.js';
export type {
  SubgraphClientConfig,
  TransferFilters,
} from './lib/subgraph-client.js';

// Generated types and operations
export type {
  // Query result types
  GetTokenQuery,
  GetTokensQuery,
  GetTransfersQuery,
  GetTransfersByTokenQuery,
  GetTransfersByAddressQuery,
  GetTokenAccountQuery,
  GetTokenAccountsByTokenQuery,
  GetTokenAccountsByAddressQuery,
  GetDailySnapshotsQuery,
  GetLatestDailySnapshotQuery,
  GetHourlySnapshotsQuery,
  GetLatestHourlySnapshotQuery,
  GetTokenStatisticsQuery,
  // Entity types
  Token,
  Transfer,
  TokenAccount,
  DailySnapshot,
  HourlySnapshot,
  // Enum types
  Transfer_OrderBy,
  OrderDirection,
  // Filter types
  Transfer_Filter,
} from './generated/graphql.js';

// Re-export SDK for advanced usage
export { getSdk } from './generated/graphql.js';
