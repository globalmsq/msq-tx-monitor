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
      const hours = req.query.hours
        ? parseInt(req.query.hours as string)
        : undefined;
      const filters: StatisticsFilters | undefined = hours
        ? {
            startDate: new Date(
              Date.now() - hours * 60 * 60 * 1000
            ).toISOString(),
            endDate: new Date().toISOString(),
            tokenSymbol: req.query.token as string,
          }
        : undefined;

      const stats = await this.analyticsService.getRealtimeStats(filters);

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
   * Time range calculated as: limit hours from now
   */
  getHourlyVolumeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 24;
      const filters: StatisticsFilters = {
        tokenSymbol: req.query.token as string,
        limit: limit,
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
   * GET /api/v1/statistics/volume/minutes
   * Get minute-level volume statistics (1-minute intervals)
   * Time range calculated as: limit minutes from now
   */
  getMinuteVolumeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 60;
      const filters: StatisticsFilters = {
        tokenSymbol: req.query.token as string,
        limit: limit,
      };

      const stats = await this.analyticsService.getMinuteVolumeStats(filters);

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
   * Time range calculated as: limit days from now
   */
  getDailyVolumeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const filters: StatisticsFilters = {
        tokenSymbol: req.query.token as string,
        limit: limit,
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
   * GET /api/v1/statistics/volume/weekly
   * Get weekly volume statistics
   * Time range calculated as: limit weeks from now
   */
  getWeeklyVolumeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 52;
      const filters: StatisticsFilters = {
        tokenSymbol: req.query.token as string,
        limit: limit,
      };

      const stats = await this.analyticsService.getWeeklyVolumeStats(filters);

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
          : '24h') as '24h' | '7d' | '30d' | '3m' | '6m' | '1y' | 'all',
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
          : '24h') as '24h' | '7d' | '30d' | '3m' | '6m' | '1y' | 'all',
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
          : '24h') as '24h' | '7d' | '30d' | '3m' | '6m' | '1y' | 'all',
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
   * GET /api/v1/analytics/anomalies/timeseries/minutes
   * Get minute-level anomaly time series data (1-minute intervals)
   * Time range calculated as: limit minutes from now
   */
  getAnomalyTimeSeriesMinutes = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 60;
      const filters: StatisticsFilters = {
        tokenSymbol: req.query.token as string,
        limit: limit,
      };

      const stats =
        await this.analyticsService.getAnomalyTimeSeriesMinutes(filters);

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
   * Get hourly anomaly time series data
   * Time range calculated as: limit hours from now
   */
  getAnomalyTimeSeries = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 24;
      const filters: StatisticsFilters = {
        tokenSymbol: req.query.token as string,
        limit: limit,
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
   * GET /api/v1/analytics/anomalies/timeseries/daily
   * Get daily anomaly time series data
   * Time range calculated as: limit days from now
   */
  getAnomalyTimeSeriesDaily = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const filters: StatisticsFilters = {
        tokenSymbol: req.query.token as string,
        limit: limit,
      };

      const stats =
        await this.analyticsService.getAnomalyTimeSeriesDaily(filters);

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
   * GET /api/v1/analytics/anomalies/timeseries/weekly
   * Get weekly anomaly time series data
   * Time range calculated as: limit weeks from now
   */
  getAnomalyTimeSeriesWeekly = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 52;
      const filters: StatisticsFilters = {
        tokenSymbol: req.query.token as string,
        limit: limit,
      };

      const stats =
        await this.analyticsService.getAnomalyTimeSeriesWeekly(filters);

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
    if (hours <= 168) return '7d'; // 7 days
    if (hours <= 720) return '30d'; // 30 days
    if (hours <= 2160) return '3m'; // 90 days (3 months)
    if (hours <= 4320) return '6m'; // 180 days (6 months)
    if (hours <= 8760) return '1y'; // 365 days (1 year)
    return 'all';
  }
}
