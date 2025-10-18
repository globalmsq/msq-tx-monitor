import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * @swagger
   * /analytics/volume/hourly:
   *   get:
   *     summary: Get hourly volume aggregation
   *     description: Get hourly volume data aggregated by token for the specified time range
   *     tags: [Analytics]
   *     parameters:
   *       - name: hours
   *         in: query
   *         description: Number of hours to look back (default 24)
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 10000
   *           default: 24
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: limit
   *         in: query
   *         description: Maximum number of hours to return
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 10000
   *           default: 24
   *     responses:
   *       200:
   *         description: Hourly volume data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       hour:
   *                         type: string
   *                         format: date-time
   *                       tokenSymbol:
   *                         type: string
   *                       totalVolume:
   *                         type: string
   *                       transactionCount:
   *                         type: integer
   *                       averageVolume:
   *                         type: string
   */
  getHourlyVolume = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 24;

      // Validate limit parameter
      if (limit < 1 || limit > 720) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit parameter must be between 1 and 720',
          },
        });
        return;
      }

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getHourlyVolume(
        tokenSymbol?.toUpperCase(),
        limit
      );

      res.json({
        data,
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/realtime:
   *   get:
   *     summary: Get realtime statistics
   *     description: Get current transaction statistics and metrics
   *     tags: [Analytics]
   *     parameters:
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: timeRange
   *         in: query
   *         description: Time range for statistics (default all)
   *         schema:
   *           type: string
   *           enum: [1h, 24h, 7d, 30d, 3m, 6m, 1y, all]
   *           default: all
   *     responses:
   *       200:
   *         description: Realtime statistics
   */
  getRealtimeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const timeRange = req.query.timeRange as string;

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      // Validate timeRange parameter if provided
      const validTimeRanges = [
        '1h',
        '24h',
        '7d',
        '30d',
        '3m',
        '6m',
        '1y',
        'all',
      ];
      if (timeRange && !validTimeRanges.includes(timeRange)) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getRealtimeStats(
        tokenSymbol?.toUpperCase(),
        timeRange || 'all'
      );

      res.json({
        data,
        timeRange: timeRange || 'all',
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/distribution/token:
   *   get:
   *     summary: Get token distribution
   *     description: Get transaction count and volume distribution by token
   *     tags: [Analytics]
   *     parameters:
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: hours
   *         in: query
   *         description: Number of hours to look back (optional)
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 10000
   *     responses:
   *       200:
   *         description: Token distribution data
   */
  getTokenDistribution = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getTokenDistribution(
        tokenSymbol?.toUpperCase()
      );

      res.json({
        data,
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/addresses/top:
   *   get:
   *     summary: Get top addresses
   *     description: Get top addresses by volume or transaction count
   *     tags: [Analytics]
   *     parameters:
   *       - name: metric
   *         in: query
   *         description: Ranking metric
   *         schema:
   *           type: string
   *           enum: [volume, transactions]
   *           default: volume
   *       - name: limit
   *         in: query
   *         description: Number of addresses to return
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: timeRange
   *         in: query
   *         description: Time range for rankings (default all)
   *         schema:
   *           type: string
   *           enum: [1h, 24h, 7d, 30d, 3m, 6m, 1y, all]
   *           default: all
   *     responses:
   *       200:
   *         description: Top addresses data
   */
  getTopAddresses = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const metric = (req.query.metric as string) || 'volume';
      const limit = parseInt(req.query.limit as string) || 10;
      const tokenSymbol = req.query.token as string;
      const timeRange = req.query.timeRange as string;

      // Validate metric parameter
      if (!['volume', 'transactions'].includes(metric)) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Metric must be either "volume" or "transactions"',
          },
        });
        return;
      }

      // Validate limit parameter
      if (limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit must be between 1 and 100',
          },
        });
        return;
      }

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      // Validate timeRange parameter if provided
      const validTimeRanges = [
        '1h',
        '24h',
        '7d',
        '30d',
        '3m',
        '6m',
        '1y',
        'all',
      ];
      if (timeRange && !validTimeRanges.includes(timeRange)) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getTopAddresses(
        metric as 'volume' | 'transactions',
        limit,
        tokenSymbol?.toUpperCase(),
        timeRange || 'all'
      );

      res.json({
        data,
        timeRange: timeRange || 'all',
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/addresses/receivers:
   *   get:
   *     summary: Get top receiver addresses
   *     description: Get top addresses ranked by incoming transaction count
   *     tags: [Analytics]
   *     parameters:
   *       - name: limit
   *         in: query
   *         description: Maximum number of addresses to return
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: timeRange
   *         in: query
   *         description: Time range for rankings (default all)
   *         schema:
   *           type: string
   *           enum: [1h, 24h, 7d, 30d, 3m, 6m, 1y, all]
   *           default: all
   *     responses:
   *       200:
   *         description: Top receiver addresses
   */
  getTopReceivers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const tokenSymbol = req.query.token as string;
      const timeRange = req.query.timeRange as string;

      // Validate limit parameter
      if (limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit parameter must be between 1 and 100',
          },
        });
        return;
      }

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      // Validate timeRange parameter if provided
      const validTimeRanges = [
        '1h',
        '24h',
        '7d',
        '30d',
        '3m',
        '6m',
        '1y',
        'all',
      ];
      if (timeRange && !validTimeRanges.includes(timeRange)) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getTopReceivers(
        limit,
        tokenSymbol?.toUpperCase(),
        timeRange || 'all'
      );

      res.json({
        data,
        timeRange: timeRange || 'all',
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/addresses/senders:
   *   get:
   *     summary: Get top sender addresses
   *     description: Get top addresses ranked by outgoing transaction count
   *     tags: [Analytics]
   *     parameters:
   *       - name: limit
   *         in: query
   *         description: Maximum number of addresses to return
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: timeRange
   *         in: query
   *         description: Time range for rankings (default all)
   *         schema:
   *           type: string
   *           enum: [1h, 24h, 7d, 30d, 3m, 6m, 1y, all]
   *           default: all
   *     responses:
   *       200:
   *         description: Top sender addresses
   */
  getTopSenders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const tokenSymbol = req.query.token as string;
      const timeRange = req.query.timeRange as string;

      // Validate limit parameter
      if (limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit parameter must be between 1 and 100',
          },
        });
        return;
      }

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      // Validate timeRange parameter if provided
      const validTimeRanges = [
        '1h',
        '24h',
        '7d',
        '30d',
        '3m',
        '6m',
        '1y',
        'all',
      ];
      if (timeRange && !validTimeRanges.includes(timeRange)) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getTopSenders(
        limit,
        tokenSymbol?.toUpperCase(),
        timeRange || 'all'
      );

      res.json({
        data,
        timeRange: timeRange || 'all',
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/anomalies:
   *   get:
   *     summary: Get anomaly statistics
   *     description: Get transaction anomaly statistics and risk scores
   *     tags: [Analytics]
   *     parameters:
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *     responses:
   *       200:
   *         description: Anomaly statistics
   */
  getAnomalyStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getAnomalyStats(
        tokenSymbol?.toUpperCase()
      );

      res.json({
        data,
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/anomalies/timeseries:
   *   get:
   *     summary: Get anomaly time series data
   *     description: Get hourly anomaly trend data for time series charts
   *     tags: [Analytics]
   *     parameters:
   *       - name: hours
   *         in: query
   *         description: Number of hours to look back
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 10000
   *           default: 24
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: limit
   *         in: query
   *         description: Maximum number of hours to return
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 10000
   *           default: 24
   *     responses:
   *       200:
   *         description: Anomaly time series data
   */
  getAnomalyTimeSeries = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 24;

      // Validate hours parameter
      if (hours < 1 || hours > 10000) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Hours parameter must be between 1 and 10000',
          },
        });
        return;
      }

      // Validate limit parameter
      if (limit < 1 || limit > 720) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit parameter must be between 1 and 720',
          },
        });
        return;
      }

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getAnomalyTimeSeries(
        hours,
        tokenSymbol?.toUpperCase(),
        limit
      );

      res.json({
        data,
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/network:
   *   get:
   *     summary: Get network statistics
   *     description: Get blockchain network statistics and metrics
   *     tags: [Analytics]
   *     parameters:
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *     responses:
   *       200:
   *         description: Network statistics
   */
  getNetworkStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getNetworkStats(
        tokenSymbol?.toUpperCase()
      );

      res.json({
        data,
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/volume/minutes:
   *   get:
   *     summary: Get minute-level volume aggregation
   *     description: Get volume data aggregated by 5-minute intervals
   *     tags: [Analytics]
   *     parameters:
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: limit
   *         in: query
   *         description: Maximum number of data points to return
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 60
   *           default: 60
   *     responses:
   *       200:
   *         description: Minute-level volume data
   */
  getMinuteVolumeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 60;

      // Validate limit parameter
      if (limit < 1 || limit > 60) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit parameter must be between 1 and 60',
          },
        });
        return;
      }

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getMinuteVolumeStats(
        tokenSymbol?.toUpperCase(),
        limit
      );

      res.json({
        data,
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/volume/daily:
   *   get:
   *     summary: Get daily volume aggregation
   *     description: Get volume data aggregated by day
   *     tags: [Analytics]
   *     parameters:
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: limit
   *         in: query
   *         description: Maximum number of days to return
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 90
   *           default: 30
   *     responses:
   *       200:
   *         description: Daily volume data
   */
  getDailyVolumeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 30;

      // Validate limit parameter
      if (limit < 1 || limit > 90) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit parameter must be between 1 and 90',
          },
        });
        return;
      }

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getDailyVolumeStats(
        tokenSymbol?.toUpperCase(),
        limit
      );

      res.json({
        data,
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/volume/weekly:
   *   get:
   *     summary: Get weekly volume aggregation
   *     description: Get volume data aggregated by week
   *     tags: [Analytics]
   *     parameters:
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: limit
   *         in: query
   *         description: Maximum number of weeks to return (up to 5 years)
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 260
   *           default: 26
   *     responses:
   *       200:
   *         description: Weekly volume data
   */
  getWeeklyVolumeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 26;

      // Validate limit parameter (max 5 years = 260 weeks)
      if (limit < 1 || limit > 260) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit parameter must be between 1 and 260',
          },
        });
        return;
      }

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getWeeklyVolumeStats(
        tokenSymbol?.toUpperCase(),
        limit
      );

      res.json({
        data,
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/volume/monthly:
   *   get:
   *     summary: Get monthly volume aggregation
   *     description: Get volume data aggregated by month
   *     tags: [Analytics]
   *     parameters:
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: limit
   *         in: query
   *         description: Maximum number of months to return
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 60
   *           default: 12
   *     responses:
   *       200:
   *         description: Monthly volume data
   */
  getMonthlyVolumeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 12;

      // Validate limit parameter (max 60 months = 5 years)
      if (limit < 1 || limit > 60) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit parameter must be between 1 and 60',
          },
        });
        return;
      }

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getMonthlyVolumeStats(
        tokenSymbol?.toUpperCase(),
        limit
      );

      res.json({
        data,
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/anomalies/timeseries/minutes:
   *   get:
   *     summary: Get minute-level anomaly timeseries
   *     description: Get anomaly data aggregated by 5-minute intervals
   *     tags: [Analytics]
   *     parameters:
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: limit
   *         in: query
   *         description: Maximum number of data points to return
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 60
   *           default: 60
   *     responses:
   *       200:
   *         description: Minute-level anomaly timeseries data
   */
  getAnomalyTimeSeriesMinutes = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 60;

      // Validate limit parameter
      if (limit < 1 || limit > 60) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit parameter must be between 1 and 60',
          },
        });
        return;
      }

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getAnomalyTimeSeriesMinutes(
        tokenSymbol?.toUpperCase(),
        limit
      );

      res.json({
        data,
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/anomalies/timeseries/daily:
   *   get:
   *     summary: Get daily anomaly timeseries
   *     description: Get anomaly data aggregated by day
   *     tags: [Analytics]
   *     parameters:
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: limit
   *         in: query
   *         description: Maximum number of days to return
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 90
   *           default: 30
   *     responses:
   *       200:
   *         description: Daily anomaly timeseries data
   */
  getAnomalyTimeSeriesDaily = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 30;

      // Validate limit parameter
      if (limit < 1 || limit > 90) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit parameter must be between 1 and 90',
          },
        });
        return;
      }

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getAnomalyTimeSeriesDaily(
        tokenSymbol?.toUpperCase(),
        limit
      );

      res.json({
        data,
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /analytics/anomalies/timeseries/weekly:
   *   get:
   *     summary: Get weekly anomaly timeseries
   *     description: Get anomaly data aggregated by week
   *     tags: [Analytics]
   *     parameters:
   *       - name: token
   *         in: query
   *         description: Filter by specific token symbol
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: limit
   *         in: query
   *         description: Maximum number of weeks to return (up to 5 years)
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 260
   *           default: 26
   *     responses:
   *       200:
   *         description: Weekly anomaly timeseries data
   */
  getAnomalyTimeSeriesWeekly = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 26;

      // Validate limit parameter (max 5 years = 260 weeks)
      if (limit < 1 || limit > 260) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit parameter must be between 1 and 260',
          },
        });
        return;
      }

      // Validate token symbol if provided
      const validTokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
      if (tokenSymbol && !validTokens.includes(tokenSymbol.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Invalid token symbol. Must be one of: ${validTokens.join(', ')}`,
          },
        });
        return;
      }

      const data = await this.analyticsService.getAnomalyTimeSeriesWeekly(
        tokenSymbol?.toUpperCase(),
        limit
      );

      res.json({
        data,
        timestamp: new Date(),
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  };
}
