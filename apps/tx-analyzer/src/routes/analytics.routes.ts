import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();
const analyticsController = new AnalyticsController();

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
router.get('/realtime', analyticsController.getRealtimeStats);

/**
 * @swagger
 * /statistics/volume/hourly:
 *   get:
 *     summary: Get hourly volume statistics
 *     description: Get transaction volume statistics aggregated by hour
 *     tags: [Statistics]
 *     parameters:
 *       - name: token
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum number of results (number of hours from now)
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
router.get('/volume/hourly', analyticsController.getHourlyVolumeStats);

/**
 * @swagger
 * /statistics/volume/minutes:
 *   get:
 *     summary: Get minute-level volume statistics
 *     description: Get transaction volume statistics aggregated by 1-minute intervals (for 1-hour time range)
 *     tags: [Statistics]
 *     parameters:
 *       - name: token
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum number of results (number of minutes from now)
 *         schema:
 *           type: integer
 *           default: 60
 *     responses:
 *       200:
 *         description: Minute-level volume statistics
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
router.get('/volume/minutes', analyticsController.getMinuteVolumeStats);

/**
 * @swagger
 * /statistics/volume/daily:
 *   get:
 *     summary: Get daily volume statistics
 *     description: Get transaction volume statistics aggregated by day
 *     tags: [Statistics]
 *     parameters:
 *       - name: token
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum number of results (number of days from now)
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Daily volume statistics
 */
router.get('/volume/daily', analyticsController.getDailyVolumeStats);

/**
 * @swagger
 * /statistics/volume/weekly:
 *   get:
 *     summary: Get weekly volume statistics
 *     description: Get transaction volume statistics aggregated by week (ISO week format)
 *     tags: [Statistics]
 *     parameters:
 *       - name: token
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum number of results (number of weeks from now)
 *         schema:
 *           type: integer
 *           default: 52
 *     responses:
 *       200:
 *         description: Weekly volume statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WeeklyVolumeStats'
 */
router.get('/volume/weekly', analyticsController.getWeeklyVolumeStats);

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
router.get('/tokens', analyticsController.getTokenStats);

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
router.get('/addresses/top', analyticsController.getTopAddresses);

/**
 * @swagger
 * /analytics/addresses/receivers:
 *   get:
 *     summary: Get top receivers by transaction count
 *     description: Get addresses that receive the most transactions
 *     tags: [Statistics]
 *     parameters:
 *       - name: token
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: hours
 *         in: query
 *         description: Time period in hours
 *         schema:
 *           type: integer
 *           default: 24
 *       - name: limit
 *         in: query
 *         description: Maximum number of results
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top receivers
 */
router.get('/addresses/receivers', analyticsController.getTopReceivers);

/**
 * @swagger
 * /analytics/addresses/senders:
 *   get:
 *     summary: Get top senders by transaction count
 *     description: Get addresses that send the most transactions
 *     tags: [Statistics]
 *     parameters:
 *       - name: token
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: hours
 *         in: query
 *         description: Time period in hours
 *         schema:
 *           type: integer
 *           default: 24
 *       - name: limit
 *         in: query
 *         description: Maximum number of results
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top senders
 */
router.get('/addresses/senders', analyticsController.getTopSenders);

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
router.get('/anomalies', analyticsController.getAnomalyStats);

/**
 * @swagger
 * /analytics/anomalies/timeseries/minutes:
 *   get:
 *     summary: Get minute-level anomaly time series data
 *     description: Get anomaly counts aggregated by 1-minute intervals (for 1-hour time range)
 *     tags: [Statistics]
 *     parameters:
 *       - name: token
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum number of data points (number of minutes from now)
 *         schema:
 *           type: integer
 *           default: 60
 *     responses:
 *       200:
 *         description: Minute-level anomaly time series data
 */
router.get(
  '/anomalies/timeseries/minutes',
  analyticsController.getAnomalyTimeSeriesMinutes
);

/**
 * @swagger
 * /analytics/anomalies/timeseries/hourly:
 *   get:
 *     summary: Get hourly anomaly time series data
 *     description: Get hourly anomaly counts and risk scores over time (for 24h and 7d ranges)
 *     tags: [Statistics]
 *     parameters:
 *       - name: token
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum number of data points (number of hours from now)
 *         schema:
 *           type: integer
 *           default: 24
 *     responses:
 *       200:
 *         description: Hourly anomaly time series data
 */
router.get(
  '/anomalies/timeseries/hourly',
  analyticsController.getAnomalyTimeSeries
);

/**
 * @swagger
 * /analytics/anomalies/timeseries/daily:
 *   get:
 *     summary: Get daily anomaly time series data
 *     description: Get daily anomaly counts and risk scores over time (for 30d+ ranges)
 *     tags: [Statistics]
 *     parameters:
 *       - name: token
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum number of data points (number of days from now)
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Daily anomaly time series data
 */
router.get(
  '/anomalies/timeseries/daily',
  analyticsController.getAnomalyTimeSeriesDaily
);

/**
 * @swagger
 * /analytics/anomalies/timeseries/weekly:
 *   get:
 *     summary: Get weekly anomaly time series data
 *     description: Get weekly anomaly counts and risk scores over time (for 6m, 1y, all ranges)
 *     tags: [Statistics]
 *     parameters:
 *       - name: token
 *         in: query
 *         description: Filter by token symbol
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum number of data points (number of weeks from now)
 *         schema:
 *           type: integer
 *           default: 52
 *     responses:
 *       200:
 *         description: Weekly anomaly time series data
 */
router.get(
  '/anomalies/timeseries/weekly',
  analyticsController.getAnomalyTimeSeriesWeekly
);

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
router.get('/network', analyticsController.getNetworkStats);

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
router.get('/distribution/token', analyticsController.getTokenDistribution);

export default router;
