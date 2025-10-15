import { Router } from 'express';
import { AnalyzeController } from '../controllers/analyze.controller';

export const analyzeRoutes = Router();
const analyzeController = new AnalyzeController();

/**
 * @route GET /api/v1/analyze/summary
 * @description Get overall transaction summary statistics
 */
analyzeRoutes.get('/summary', analyzeController.getSummary);

/**
 * @route GET /api/v1/analyze/trends/hourly
 * @description Get hourly transaction trends
 */
analyzeRoutes.get('/trends/hourly', analyzeController.getHourlyTrends);

/**
 * @route GET /api/v1/analyze/trends/daily
 * @description Get daily transaction trends
 */
analyzeRoutes.get('/trends/daily', analyzeController.getDailyTrends);

/**
 * @route GET /api/v1/analyze/trends/weekly
 * @description Get weekly transaction trends
 */
analyzeRoutes.get('/trends/weekly', analyzeController.getWeeklyTrends);

/**
 * @route GET /api/v1/analyze/tokens
 * @description Get analytics by token
 */
analyzeRoutes.get('/tokens', analyzeController.getTokenAnalytics);

/**
 * @route GET /api/v1/analyze/volume
 * @description Get comprehensive volume analysis
 */
analyzeRoutes.get('/volume', analyzeController.getVolumeAnalysis);
