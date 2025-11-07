import { Request, Response, NextFunction } from 'express';
import { RedisConnection } from '../cache/redis';
import { logger } from '@msq-tx-monitor/msq-common';

export class CacheController {
  /**
   * @swagger
   * /cache/purge/addresses:
   *   post:
   *     summary: Purge all address-related caches
   *     description: Removes all cached data related to address rankings, statistics, profiles, whales, traders, and suspicious addresses
   *     tags: [Cache]
   *     responses:
   *       200:
   *         description: Successfully purged address caches
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 purged_keys:
   *                   type: integer
   *                   description: Total number of keys deleted
   *                 patterns_purged:
   *                   type: array
   *                   items:
   *                     type: string
   *                   description: List of cache patterns that were purged
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  purgeAddressCache = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const patterns = [
        'top_addresses:*',
        'top_addresses_frequency:*',
        'address_search:*',
        'address_stats:*',
        'address_profile:*',
        'whale_addresses:*',
        'active_traders:*',
        'suspicious_addresses:*',
        'address_stats_detail:*',
        'address_trends:*',
      ];

      let totalPurged = 0;

      for (const pattern of patterns) {
        const count = await RedisConnection.deleteByPattern(pattern);
        totalPurged += count;
      }

      logger.info(`✅ Purged ${totalPurged} address-related cache keys`);

      res.json({
        success: true,
        purged_keys: totalPurged,
        patterns_purged: patterns,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('❌ Error purging address cache:', error);
      next(error);
    }
  };

  /**
   * @swagger
   * /cache/purge/transactions:
   *   post:
   *     summary: Purge all transaction-related caches
   *     description: Removes all cached data related to transactions and address summaries
   *     tags: [Cache]
   *     responses:
   *       200:
   *         description: Successfully purged transaction caches
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 purged_keys:
   *                   type: integer
   *                 patterns_purged:
   *                   type: array
   *                   items:
   *                     type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  purgeTransactionCache = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const patterns = [
        'transactions:*',
        'transactions_cursor:*',
        'transaction:*',
        'address_summary:*',
      ];

      let totalPurged = 0;

      for (const pattern of patterns) {
        const count = await RedisConnection.deleteByPattern(pattern);
        totalPurged += count;
      }

      logger.info(`✅ Purged ${totalPurged} transaction-related cache keys`);

      res.json({
        success: true,
        purged_keys: totalPurged,
        patterns_purged: patterns,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('❌ Error purging transaction cache:', error);
      next(error);
    }
  };

  /**
   * @swagger
   * /cache/purge/all:
   *   post:
   *     summary: Purge all caches
   *     description: Removes all cached data from Redis database (use with caution)
   *     tags: [Cache]
   *     responses:
   *       200:
   *         description: Successfully purged all caches
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  purgeAllCache = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const client = await RedisConnection.getInstance();
      await client.flushDb();

      logger.warn('⚠️  Purged ALL cache keys from Redis database');

      res.json({
        success: true,
        message: 'All cache keys have been purged',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('❌ Error purging all cache:', error);
      next(error);
    }
  };

  /**
   * @swagger
   * /cache/purge:
   *   post:
   *     summary: Purge cache by custom pattern
   *     description: Removes cached data matching a specific pattern
   *     tags: [Cache]
   *     parameters:
   *       - name: pattern
   *         in: query
   *         required: true
   *         description: Redis key pattern to purge (e.g., "top_addresses:*")
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully purged cache by pattern
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 purged_keys:
   *                   type: integer
   *                 pattern:
   *                   type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Missing or invalid pattern parameter
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  purgeByPattern = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const pattern = req.query.pattern as string;

      if (!pattern) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Missing pattern parameter',
            details: 'Query parameter "pattern" is required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const purgedCount = await RedisConnection.deleteByPattern(pattern);

      logger.info(`✅ Purged ${purgedCount} keys matching pattern: ${pattern}`);

      res.json({
        success: true,
        purged_keys: purgedCount,
        pattern,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('❌ Error purging cache by pattern:', error);
      next(error);
    }
  };
}
