import { Router } from 'express';
import { StatisticsController } from '../controllers/statistics.controller';

const router = Router();
const statisticsController = new StatisticsController();

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Transaction and network statistics endpoints
 */

/**
 * @swagger
 * /statistics/realtime:
 *   get:
 *     summary: Get real-time statistics
 *     description: Get current real-time statistics including transaction counts, volumes, and active addresses
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Real-time statistics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/RealtimeStats'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 cached:
 *                   type: boolean
 */
router.get('/realtime', statisticsController.getRealtimeStats);

/**
 * @swagger
 * /statistics/volume/hourly:
 *   get:
 *     summary: Get hourly volume statistics
 *     description: Get transaction volume statistics aggregated by hour
 *     tags: [Statistics]
 *     parameters:
 *       - name: startDate
 *         in: query
 *         description: Start date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: tokenSymbol
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum number of results
 *         schema:
 *           type: integer
 *           default: 24
 *     responses:
 *       200:
 *         description: Hourly volume statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/HourlyVolumeStats'
 */
router.get('/volume/hourly', statisticsController.getHourlyVolumeStats);

/**
 * @swagger
 * /statistics/volume/daily:
 *   get:
 *     summary: Get daily volume statistics
 *     description: Get transaction volume statistics aggregated by day
 *     tags: [Statistics]
 *     parameters:
 *       - name: startDate
 *         in: query
 *         description: Start date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: tokenSymbol
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum number of results
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Daily volume statistics
 */
router.get('/volume/daily', statisticsController.getDailyVolumeStats);

/**
 * @swagger
 * /statistics/tokens:
 *   get:
 *     summary: Get token-specific statistics
 *     description: Get comprehensive statistics for each token
 *     tags: [Statistics]
 *     parameters:
 *       - name: startDate
 *         in: query
 *         description: Start date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: tokenSymbol
 *         in: query
 *         description: Filter by specific token symbol
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token statistics
 */
router.get('/tokens', statisticsController.getTokenStats);

/**
 * @swagger
 * /statistics/addresses/top:
 *   get:
 *     summary: Get top addresses by various metrics
 *     description: Get top addresses ranked by volume, transaction count, or unique interactions
 *     tags: [Statistics]
 *     parameters:
 *       - name: metric
 *         in: query
 *         required: true
 *         description: Metric to rank by
 *         schema:
 *           type: string
 *           enum: [volume, transactions, unique_interactions]
 *       - name: tokenSymbol
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: timeframe
 *         in: query
 *         description: Time period for analysis
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, all]
 *           default: 30d
 *       - name: limit
 *         in: query
 *         description: Maximum number of results
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top addresses
 */
router.get('/addresses/top', statisticsController.getTopAddresses);

/**
 * @swagger
 * /statistics/anomalies:
 *   get:
 *     summary: Get anomaly detection statistics
 *     description: Get statistics about detected anomalies and suspicious activities
 *     tags: [Statistics]
 *     parameters:
 *       - name: startDate
 *         in: query
 *         description: Start date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: tokenSymbol
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Anomaly statistics
 */
router.get('/anomalies', statisticsController.getAnomalyStats);

/**
 * @swagger
 * /statistics/network:
 *   get:
 *     summary: Get network health statistics
 *     description: Get network performance and health metrics
 *     tags: [Statistics]
 *     parameters:
 *       - name: startDate
 *         in: query
 *         description: Start date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: limit
 *         in: query
 *         description: Maximum number of data points
 *         schema:
 *           type: integer
 *           default: 24
 *     responses:
 *       200:
 *         description: Network statistics
 */
router.get('/network', statisticsController.getNetworkStats);

/**
 * @swagger
 * /statistics/distribution/token:
 *   get:
 *     summary: Get token distribution statistics
 *     description: Get the distribution of transactions across different tokens
 *     tags: [Statistics]
 *     parameters:
 *       - name: startDate
 *         in: query
 *         description: Start date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Token distribution data
 */
router.get('/distribution/token', statisticsController.getTokenDistribution);

export default router;
