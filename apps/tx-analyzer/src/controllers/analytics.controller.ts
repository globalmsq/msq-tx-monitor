import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import {
  StatisticsFilters,
  StatisticsResponse,
} from '../types/analytics.types';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
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
      const stats = await this.analyticsService.getRealtimeStats();

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

      const stats = await this.analyticsService.getHourlyVolumeStats(filters);

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

      const stats = await this.analyticsService.getDailyVolumeStats(filters);

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

      const stats = await this.analyticsService.getTokenStats(filters);

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
        tokenSymbol: req.query.token as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        timeframe: (req.query.hours
          ? this.hoursToTimeframe(parseInt(req.query.hours as string))
          : '24h') as '24h' | '7d' | '30d' | 'all',
      };

      const stats = await this.analyticsService.getTopAddresses(filters);

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

      const stats = await this.analyticsService.getAnomalyStats(filters);

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

      const stats = await this.analyticsService.getNetworkStats(filters);

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

      const stats = await this.analyticsService.getTokenDistribution(filters);

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
   * GET /api/v1/analytics/addresses/receivers
   * Get top receivers (addresses receiving the most transactions)
   */
  getTopReceivers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        metric: 'transactions' as const,
        tokenSymbol: req.query.token as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        timeframe: (req.query.hours
          ? this.hoursToTimeframe(parseInt(req.query.hours as string))
          : '24h') as '24h' | '7d' | '30d' | 'all',
      };

      const stats = await this.analyticsService.getTopReceivers(filters);

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
   * GET /api/v1/analytics/addresses/senders
   * Get top senders (addresses sending the most transactions)
   */
  getTopSenders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        metric: 'transactions' as const,
        tokenSymbol: req.query.token as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        timeframe: (req.query.hours
          ? this.hoursToTimeframe(parseInt(req.query.hours as string))
          : '24h') as '24h' | '7d' | '30d' | 'all',
      };

      const stats = await this.analyticsService.getTopSenders(filters);

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
   * GET /api/v1/analytics/anomalies/timeseries
   * Get anomaly time series data
   */
  getAnomalyTimeSeries = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const hours = req.query.hours
        ? parseInt(req.query.hours as string)
        : 24;
      const filters: StatisticsFilters = {
        startDate: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        tokenSymbol: req.query.token as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 24,
      };

      const stats = await this.analyticsService.getAnomalyTimeSeries(filters);

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
   * Helper: Convert hours to timeframe string
   */
  private hoursToTimeframe(hours: number): string {
    if (hours <= 24) return '24h';
    if (hours <= 168) return '7d';
    if (hours <= 720) return '30d';
    return 'all';
  }
}
