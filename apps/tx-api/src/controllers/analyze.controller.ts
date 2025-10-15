import { Request, Response, NextFunction } from 'express';
import { AnalyzeService } from '../services/analyze.service';
import { AnalyticsFilters, AnalyticsResponse } from '../types/analyze.types';

export class AnalyzeController {
  private analyzeService: AnalyzeService;

  constructor() {
    this.analyzeService = new AnalyzeService();
  }

  /**
   * GET /api/v1/analyze/summary
   * Get overall transaction summary
   */
  getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: AnalyticsFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        tokenAddress: req.query.tokenAddress as string,
      };

      const summary = await this.analyzeService.getTransactionSummary(filters);

      const response: AnalyticsResponse<typeof summary> = {
        data: summary,
        filters,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analyze/trends/hourly
   * Get hourly transaction trends
   */
  getHourlyTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: AnalyticsFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        tokenAddress: req.query.tokenAddress as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 24,
      };

      const trends = await this.analyzeService.getTrends('hour', filters);

      const response: AnalyticsResponse<typeof trends> = {
        data: trends,
        filters,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analyze/trends/daily
   * Get daily transaction trends
   */
  getDailyTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: AnalyticsFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        tokenAddress: req.query.tokenAddress as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 30,
      };

      const trends = await this.analyzeService.getTrends('day', filters);

      const response: AnalyticsResponse<typeof trends> = {
        data: trends,
        filters,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analyze/trends/weekly
   * Get weekly transaction trends
   */
  getWeeklyTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: AnalyticsFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        tokenAddress: req.query.tokenAddress as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 12,
      };

      const trends = await this.analyzeService.getTrends('week', filters);

      const response: AnalyticsResponse<typeof trends> = {
        data: trends,
        filters,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analyze/tokens
   * Get token analytics
   */
  getTokenAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const filters: AnalyticsFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      };

      const tokenAnalytics =
        await this.analyzeService.getTokenAnalytics(filters);

      const response: AnalyticsResponse<typeof tokenAnalytics> = {
        data: tokenAnalytics,
        filters,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analyze/volume
   * Get comprehensive volume analysis
   */
  getVolumeAnalysis = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const filters: AnalyticsFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        tokenAddress: req.query.tokenAddress as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      };

      const volumeAnalysis =
        await this.analyzeService.getVolumeAnalysis(filters);

      const response: AnalyticsResponse<typeof volumeAnalysis> = {
        data: volumeAnalysis,
        filters,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}
