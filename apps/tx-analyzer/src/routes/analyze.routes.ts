import { Router } from 'express';
import { AnalyzeController } from '../controllers/analyze.controller';

export const analyzeRoutes = Router();
const analyzeController = new AnalyzeController();

/**
 * @route GET /api/v1/analyze/summary
 * @description Get overall transaction summary statistics
 * @query {string} [startDate] - Filter by start date (ISO string)
 * @query {string} [endDate] - Filter by end date (ISO string)
 * @query {string} [tokenAddress] - Filter by specific token address
 * @returns {AnalyticsResponse<TransactionSummary>} Summary statistics
 */
analyzeRoutes.get('/summary', analyzeController.getSummary);

/**
 * @route GET /api/v1/analyze/trends/hourly
 * @description Get hourly transaction trends
 * @query {string} [startDate] - Filter by start date (ISO string)
 * @query {string} [endDate] - Filter by end date (ISO string)
 * @query {string} [tokenAddress] - Filter by specific token address
 * @query {number} [limit=24] - Number of data points to return
 * @returns {AnalyticsResponse<TrendData[]>} Hourly trends
 */
analyzeRoutes.get('/trends/hourly', analyzeController.getHourlyTrends);

/**
 * @route GET /api/v1/analyze/trends/daily
 * @description Get daily transaction trends
 * @query {string} [startDate] - Filter by start date (ISO string)
 * @query {string} [endDate] - Filter by end date (ISO string)
 * @query {string} [tokenAddress] - Filter by specific token address
 * @query {number} [limit=30] - Number of data points to return
 * @returns {AnalyticsResponse<TrendData[]>} Daily trends
 */
analyzeRoutes.get('/trends/daily', analyzeController.getDailyTrends);

/**
 * @route GET /api/v1/analyze/trends/weekly
 * @description Get weekly transaction trends
 * @query {string} [startDate] - Filter by start date (ISO string)
 * @query {string} [endDate] - Filter by end date (ISO string)
 * @query {string} [tokenAddress] - Filter by specific token address
 * @query {number} [limit=12] - Number of data points to return
 * @returns {AnalyticsResponse<TrendData[]>} Weekly trends
 */
analyzeRoutes.get('/trends/weekly', analyzeController.getWeeklyTrends);

/**
 * @route GET /api/v1/analyze/tokens
 * @description Get analytics by token
 * @query {string} [startDate] - Filter by start date (ISO string)
 * @query {string} [endDate] - Filter by end date (ISO string)
 * @query {number} [limit=10] - Number of tokens to return
 * @returns {AnalyticsResponse<TokenAnalytics[]>} Token analytics
 */
analyzeRoutes.get('/tokens', analyzeController.getTokenAnalytics);

/**
 * @route GET /api/v1/analyze/volume
 * @description Get comprehensive volume analysis
 * @query {string} [startDate] - Filter by start date (ISO string)
 * @query {string} [endDate] - Filter by end date (ISO string)
 * @query {string} [tokenAddress] - Filter by specific token address
 * @query {number} [limit=10] - Number of top items to return
 * @returns {AnalyticsResponse<VolumeAnalysis>} Volume analysis
 */
analyzeRoutes.get('/volume', analyzeController.getVolumeAnalysis);
