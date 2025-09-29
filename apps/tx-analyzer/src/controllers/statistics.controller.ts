import { Request, Response, NextFunction } from 'express';
import { StatisticsService } from '../services/statistics.service';
import {
  StatisticsFilters,
  StatisticsResponse,
} from '../types/statistics.types';

export class StatisticsController {
  private statisticsService: StatisticsService;

  constructor() {
    this.statisticsService = new StatisticsService();
  }

  /**
   * GET /api/v1/statistics/realtime
   * Get real-time statistics summary
   */
  getRealtimeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const stats = await this.statisticsService.getRealtimeStats();

      const response: StatisticsResponse<typeof stats> = {
        data: stats,
        timestamp: new Date(),
        cached: false,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/statistics/volume/hourly
   * Get hourly volume statistics
   */
  getHourlyVolumeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const filters: StatisticsFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        tokenSymbol: req.query.tokenSymbol as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 24,
      };

      const stats = await this.statisticsService.getHourlyVolumeStats(filters);

      const response: StatisticsResponse<typeof stats> = {
        data: stats,
        filters,
        timestamp: new Date(),
        cached: false,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/statistics/volume/daily
   * Get daily volume statistics
   */
  getDailyVolumeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const filters: StatisticsFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        tokenSymbol: req.query.tokenSymbol as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 30,
      };

      const stats = await this.statisticsService.getDailyVolumeStats(filters);

      const response: StatisticsResponse<typeof stats> = {
        data: stats,
        filters,
        timestamp: new Date(),
        cached: false,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/statistics/tokens
   * Get token-specific statistics
   */
  getTokenStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: StatisticsFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        tokenSymbol: req.query.tokenSymbol as string,
      };

      const stats = await this.statisticsService.getTokenStats(filters);

      const response: StatisticsResponse<typeof stats> = {
        data: stats,
        filters,
        timestamp: new Date(),
        cached: false,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/statistics/addresses/top
   * Get top addresses by various metrics
   */
  getTopAddresses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        metric: req.query.metric as
          | 'volume'
          | 'transactions'
          | 'unique_interactions',
        tokenSymbol: req.query.tokenSymbol as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        timeframe: req.query.timeframe as '24h' | '7d' | '30d' | 'all',
      };

      const stats = await this.statisticsService.getTopAddresses(filters);

      const response: StatisticsResponse<typeof stats> = {
        data: stats,
        filters,
        timestamp: new Date(),
        cached: false,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/statistics/anomalies
   * Get anomaly detection statistics
   */
  getAnomalyStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: StatisticsFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        tokenSymbol: req.query.tokenSymbol as string,
      };

      const stats = await this.statisticsService.getAnomalyStats(filters);

      const response: StatisticsResponse<typeof stats> = {
        data: stats,
        filters,
        timestamp: new Date(),
        cached: false,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/statistics/network
   * Get network health statistics
   */
  getNetworkStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: StatisticsFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 24,
      };

      const stats = await this.statisticsService.getNetworkStats(filters);

      const response: StatisticsResponse<typeof stats> = {
        data: stats,
        filters,
        timestamp: new Date(),
        cached: false,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/statistics/distribution/token
   * Get token distribution statistics
   */
  getTokenDistribution = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const filters: StatisticsFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      const stats = await this.statisticsService.getTokenDistribution(filters);

      const response: StatisticsResponse<typeof stats> = {
        data: stats,
        filters,
        timestamp: new Date(),
        cached: false,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}
