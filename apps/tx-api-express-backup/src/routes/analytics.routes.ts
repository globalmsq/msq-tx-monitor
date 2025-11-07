import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

export const analyticsRoutes = Router();
const analyticsController = new AnalyticsController();

/**
 * @route GET /api/v1/analytics/volume/minutes
 * @description Get minute-level volume aggregation (5-minute intervals)
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [limit=60] - Maximum number of data points to return (1-60)
 * @returns {MinuteVolumeResponse} Minute-level volume data aggregated by token
 */
analyticsRoutes.get(
  '/volume/minutes',
  analyticsController.getMinuteVolumeStats
);

/**
 * @route GET /api/v1/analytics/volume/hourly
 * @description Get hourly volume aggregation (1-hour intervals)
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [limit=24] - Maximum number of data points to return (1-168)
 * @returns {HourlyVolumeResponse} Hourly volume data aggregated by token
 */
analyticsRoutes.get('/volume/hourly', analyticsController.getHourlyVolume);

/**
 * @route GET /api/v1/analytics/volume/daily
 * @description Get daily volume aggregation
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [limit=30] - Maximum number of days to return (1-90)
 * @returns {DailyVolumeResponse} Daily volume data aggregated by token
 */
analyticsRoutes.get('/volume/daily', analyticsController.getDailyVolumeStats);

/**
 * @route GET /api/v1/analytics/volume/weekly
 * @description Get weekly volume aggregation
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [limit=26] - Maximum number of weeks to return (1-52)
 * @returns {WeeklyVolumeResponse} Weekly volume data aggregated by token
 */
analyticsRoutes.get('/volume/weekly', analyticsController.getWeeklyVolumeStats);

/**
 * @route GET /api/v1/analytics/volume/monthly
 * @description Get monthly volume aggregation
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [limit=12] - Maximum number of months to return (1-60)
 * @returns {MonthlyVolumeResponse} Monthly volume data aggregated by token
 */
analyticsRoutes.get(
  '/volume/monthly',
  analyticsController.getMonthlyVolumeStats
);

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
analyticsRoutes.get(
  '/distribution/token',
  analyticsController.getTokenDistribution
);

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
 * @returns {TopAddressesResponse} Top receiver addresses data
 */
analyticsRoutes.get(
  '/addresses/receivers',
  analyticsController.getTopReceivers
);

/**
 * @route GET /api/v1/analytics/addresses/senders
 * @description Get top addresses ranked by outgoing transaction count
 * @query {number} [limit=10] - Number of addresses to return (1-100)
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
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
 * @route GET /api/v1/analytics/anomalies/timeseries/minutes
 * @description Get minute-level anomaly timeseries (5-minute intervals)
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [limit=60] - Maximum number of data points to return (1-60)
 * @returns {AnomalyTimeSeriesResponse} Minute-level anomaly timeseries data
 */
analyticsRoutes.get(
  '/anomalies/timeseries/minutes',
  analyticsController.getAnomalyTimeSeriesMinutes
);

/**
 * @route GET /api/v1/analytics/anomalies/timeseries/hourly
 * @description Get hourly anomaly trend data for time series charts (1-hour intervals)
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [limit=24] - Maximum number of data points to return (1-168)
 * @returns {AnomalyTimeSeriesResponse} Hourly anomaly trend data
 */
analyticsRoutes.get(
  '/anomalies/timeseries/hourly',
  analyticsController.getAnomalyTimeSeries
);

/**
 * @route GET /api/v1/analytics/anomalies/timeseries/daily
 * @description Get daily anomaly timeseries
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [limit=30] - Maximum number of days to return (1-90)
 * @returns {AnomalyTimeSeriesResponse} Daily anomaly timeseries data
 */
analyticsRoutes.get(
  '/anomalies/timeseries/daily',
  analyticsController.getAnomalyTimeSeriesDaily
);

/**
 * @route GET /api/v1/analytics/anomalies/timeseries/weekly
 * @description Get weekly anomaly timeseries
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [limit=26] - Maximum number of weeks to return (1-52)
 * @returns {AnomalyTimeSeriesResponse} Weekly anomaly timeseries data
 */
analyticsRoutes.get(
  '/anomalies/timeseries/weekly',
  analyticsController.getAnomalyTimeSeriesWeekly
);

/**
 * @route GET /api/v1/analytics/anomalies/timeseries
 * @description Get hourly anomaly trend data for time series charts (deprecated, use /hourly)
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {number} [limit=24] - Maximum number of data points to return (1-168)
 * @returns {AnomalyTimeSeriesResponse} Hourly anomaly trend data
 */
analyticsRoutes.get(
  '/anomalies/timeseries',
  analyticsController.getAnomalyTimeSeries
);

/**
 * @route GET /api/v1/analytics/network
 * @description Get blockchain network statistics and metrics
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @returns {NetworkStatsResponse} Network statistics and performance metrics
 */
analyticsRoutes.get('/network', analyticsController.getNetworkStats);
