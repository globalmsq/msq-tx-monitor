import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';

export class StatisticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  // Realtime Stats
  getRealtimeStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const data = await this.analyticsService.getRealtimeStats(tokenSymbol);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  // Volume endpoints
  getHourlyVolumeStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 24;
      const data = await this.analyticsService.getHourlyVolume(24, tokenSymbol, limit);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  getMinuteVolumeStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 60;
      const data = await this.analyticsService.getMinuteVolumeStats(tokenSymbol, limit);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  getDailyVolumeStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 30;
      const data = await this.analyticsService.getDailyVolumeStats(tokenSymbol, limit);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  getWeeklyVolumeStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 52;
      const data = await this.analyticsService.getWeeklyVolumeStats(tokenSymbol, limit);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  // Token Stats
  getTokenStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenSymbol = req.query.tokenSymbol as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const data = await this.analyticsService.getTokenStats(tokenSymbol, startDate, endDate);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  // Address endpoints
  getTopAddresses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metric = (req.query.metric as 'volume' | 'transactions') || 'volume';
      const limit = parseInt(req.query.limit as string) || 10;
      const tokenSymbol = req.query.tokenSymbol as string;
      const timeframe = req.query.timeframe as string;
      const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : timeframe === '30d' ? 720 : undefined;
      const data = await this.analyticsService.getTopAddresses(metric, limit, tokenSymbol, hours);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  getTopReceivers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const tokenSymbol = req.query.token as string;
      const hours = parseInt(req.query.hours as string) || 24;
      const data = await this.analyticsService.getTopReceivers(limit, hours, tokenSymbol);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  getTopSenders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const tokenSymbol = req.query.token as string;
      const hours = parseInt(req.query.hours as string) || 24;
      const data = await this.analyticsService.getTopSenders(limit, hours, tokenSymbol);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  // Anomaly endpoints
  getAnomalyStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenSymbol = req.query.tokenSymbol as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const hours = startDate && endDate ? 
        Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60)) : undefined;
      const data = await this.analyticsService.getAnomalyStats(tokenSymbol, hours);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  getAnomalyTimeSeriesMinutes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 60;
      const data = await this.analyticsService.getAnomalyTimeSeriesMinutes(tokenSymbol, limit);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  getAnomalyTimeSeries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 24;
      const data = await this.analyticsService.getAnomalyTimeSeries(24, tokenSymbol, limit);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  getAnomalyTimeSeriesDaily = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 30;
      const data = await this.analyticsService.getAnomalyTimeSeriesDaily(tokenSymbol, limit);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  getAnomalyTimeSeriesWeekly = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 52;
      const data = await this.analyticsService.getAnomalyTimeSeriesWeekly(tokenSymbol, limit);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  // Network Stats
  getNetworkStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenSymbol = req.query.tokenSymbol as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const hours = startDate && endDate ? 
        Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60)) : undefined;
      const data = await this.analyticsService.getNetworkStats(tokenSymbol, hours);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };

  // Token Distribution
  getTokenDistribution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const hours = startDate && endDate ? 
        Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60)) : undefined;
      const data = await this.analyticsService.getTokenDistribution(undefined, hours);
      res.json({ data, timestamp: new Date(), cached: false });
    } catch (error) { next(error); }
  };
}
