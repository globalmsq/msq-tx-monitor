import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

export const analyticsRoutes = Router();
const analyticsController = new AnalyticsController();

/**
 * @route GET /api/v1/analytics/volume/hourly
 * @description Get hourly volume aggregation for specified time range and token
 * @query {number} [hours=24] - Number of hours to look back (1-168)
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [limit=24] - Maximum number of hours to return (1-168)
 * @returns {HourlyVolumeResponse} Hourly volume data aggregated by token
 */
analyticsRoutes.get('/volume/hourly', analyticsController.getHourlyVolume);

/**
 * @route GET /api/v1/analytics/realtime
 * @description Get current transaction statistics and metrics
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @returns {RealtimeStatsResponse} Current transaction statistics
 */
analyticsRoutes.get('/realtime', analyticsController.getRealtimeStats);

/**
 * @route GET /api/v1/analytics/distribution/token
 * @description Get transaction count and volume distribution by token
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @returns {TokenDistributionResponse} Token distribution data
 */
analyticsRoutes.get('/distribution/token', analyticsController.getTokenDistribution);

/**
 * @route GET /api/v1/analytics/addresses/top
 * @description Get top addresses ranked by volume or transaction count
 * @query {string} [metric=volume] - Ranking metric (volume, transactions)
 * @query {number} [limit=10] - Number of addresses to return (1-100)
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @returns {TopAddressesResponse} Top addresses data
 */
analyticsRoutes.get('/addresses/top', analyticsController.getTopAddresses);

/**
 * @route GET /api/v1/analytics/addresses/receivers
 * @description Get top addresses ranked by incoming transaction count
 * @query {number} [limit=10] - Number of addresses to return (1-100)
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [hours=24] - Number of hours to look back (1-720)
 * @returns {TopAddressesResponse} Top receiver addresses data
 */
analyticsRoutes.get('/addresses/receivers', analyticsController.getTopReceivers);

/**
 * @route GET /api/v1/analytics/addresses/senders
 * @description Get top addresses ranked by outgoing transaction count
 * @query {number} [limit=10] - Number of addresses to return (1-100)
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [hours=24] - Number of hours to look back (1-720)
 * @returns {TopAddressesResponse} Top sender addresses data
 */
analyticsRoutes.get('/addresses/senders', analyticsController.getTopSenders);

/**
 * @route GET /api/v1/analytics/anomalies
 * @description Get transaction anomaly statistics and risk scores
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @returns {AnomalyStatsResponse} Anomaly statistics and risk metrics
 */
analyticsRoutes.get('/anomalies', analyticsController.getAnomalyStats);

/**
 * @route GET /api/v1/analytics/anomalies/timeseries
 * @description Get hourly anomaly trend data for time series charts
 * @query {number} [hours=24] - Number of hours to look back (1-168)
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [limit=24] - Maximum number of hours to return (1-168)
 * @returns {AnomalyTimeSeriesResponse} Hourly anomaly trend data
 */
analyticsRoutes.get('/anomalies/timeseries', analyticsController.getAnomalyTimeSeries);

/**
 * @route GET /api/v1/analytics/network
 * @description Get blockchain network statistics and metrics
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @returns {NetworkStatsResponse} Network statistics and performance metrics
 */
analyticsRoutes.get('/network', analyticsController.getNetworkStats);