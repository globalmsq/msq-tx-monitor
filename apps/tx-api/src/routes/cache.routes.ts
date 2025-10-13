import { Router } from 'express';
import { CacheController } from '../controllers/cache.controller';

export const cacheRoutes = Router();
const cacheController = new CacheController();

/**
 * @route POST /api/v1/cache/purge/addresses
 * @description Purge all address-related caches (top_addresses, address_stats, whale_addresses, etc.)
 * @returns {PurgeResponse} Success status with count of purged keys
 */
cacheRoutes.post('/purge/addresses', cacheController.purgeAddressCache);

/**
 * @route POST /api/v1/cache/purge/transactions
 * @description Purge all transaction-related caches (transactions, transaction details, address summaries)
 * @returns {PurgeResponse} Success status with count of purged keys
 */
cacheRoutes.post('/purge/transactions', cacheController.purgeTransactionCache);

/**
 * @route POST /api/v1/cache/purge/all
 * @description Purge ALL caches from Redis database (use with caution)
 * @returns {PurgeResponse} Success status message
 */
cacheRoutes.post('/purge/all', cacheController.purgeAllCache);

/**
 * @route POST /api/v1/cache/purge
 * @description Purge caches by custom pattern
 * @query {string} pattern - Redis key pattern to purge (e.g., "top_addresses:*")
 * @returns {PurgeResponse} Success status with count of purged keys
 */
cacheRoutes.post('/purge', cacheController.purgeByPattern);
