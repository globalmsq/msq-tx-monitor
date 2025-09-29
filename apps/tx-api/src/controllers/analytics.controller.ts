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
   *           maximum: 720
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
   *           maximum: 720
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
      const hours = parseInt(req.query.hours as string) || 24;
      const tokenSymbol = req.query.token as string;
      const limit = parseInt(req.query.limit as string) || 24;

      // Validate hours parameter
      if (hours < 1 || hours > 720) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Hours parameter must be between 1 and 720',
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

      const data = await this.analyticsService.getHourlyVolume(
        hours,
        tokenSymbol?.toUpperCase(),
        limit
      );

      res.status(200).json({
        success: true,
        data,
        metadata: {
          hours,
          tokenSymbol: tokenSymbol?.toUpperCase(),
          limit,
          count: data.length,
        },
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
   *       - name: hours
   *         in: query
   *         description: Number of hours to look back (default 24)
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 720
   *           default: 24
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
      const hours = parseInt(req.query.hours as string) || 24;

      // Validate hours parameter
      if (hours < 1 || hours > 720) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Hours parameter must be between 1 and 720',
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

      const data = await this.analyticsService.getRealtimeStats(
        tokenSymbol?.toUpperCase(),
        hours
      );

      res.status(200).json({
        success: true,
        data,
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
   *           maximum: 720
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
      const hours = req.query.hours
        ? parseInt(req.query.hours as string)
        : undefined;

      // Validate hours parameter if provided
      if (hours !== undefined && (hours < 1 || hours > 720)) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Hours parameter must be between 1 and 720',
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

      const data = await this.analyticsService.getTokenDistribution(
        tokenSymbol?.toUpperCase(),
        hours
      );

      res.status(200).json({
        success: true,
        data,
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
      const hours = req.query.hours
        ? parseInt(req.query.hours as string)
        : undefined;

      // Validate hours parameter if provided
      if (hours !== undefined && (hours < 1 || hours > 720)) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Hours parameter must be between 1 and 720',
          },
        });
        return;
      }

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

      const data = await this.analyticsService.getTopAddresses(
        metric as 'volume' | 'transactions',
        limit,
        tokenSymbol?.toUpperCase(),
        hours
      );

      res.status(200).json({
        success: true,
        data,
        metadata: {
          metric,
          limit,
          tokenSymbol: tokenSymbol?.toUpperCase(),
          count: data.length,
        },
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
   *       - name: hours
   *         in: query
   *         description: Number of hours to look back
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 720
   *           default: 24
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
      const hours = parseInt(req.query.hours as string) || 24;

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

      // Validate hours parameter
      if (hours < 1 || hours > 720) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Hours parameter must be between 1 and 720',
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

      const data = await this.analyticsService.getTopReceivers(
        limit,
        hours,
        tokenSymbol?.toUpperCase()
      );

      res.status(200).json({
        success: true,
        data,
        metadata: {
          metric: 'transaction_count',
          limit,
          tokenSymbol: tokenSymbol?.toUpperCase(),
          count: data.length,
        },
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
   *       - name: hours
   *         in: query
   *         description: Number of hours to look back
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 720
   *           default: 24
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
      const hours = parseInt(req.query.hours as string) || 24;

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

      // Validate hours parameter
      if (hours < 1 || hours > 720) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Hours parameter must be between 1 and 720',
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

      const data = await this.analyticsService.getTopSenders(
        limit,
        hours,
        tokenSymbol?.toUpperCase()
      );

      res.status(200).json({
        success: true,
        data,
        metadata: {
          metric: 'transaction_count',
          limit,
          tokenSymbol: tokenSymbol?.toUpperCase(),
          count: data.length,
        },
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
      const hours = req.query.hours
        ? parseInt(req.query.hours as string)
        : undefined;

      // Validate hours parameter if provided
      if (hours !== undefined && (hours < 1 || hours > 720)) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Hours parameter must be between 1 and 720',
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

      const data = await this.analyticsService.getAnomalyStats(
        tokenSymbol?.toUpperCase(),
        hours
      );

      res.status(200).json({
        success: true,
        data,
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
   *           maximum: 168
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
   *           maximum: 168
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
      if (hours < 1 || hours > 168) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Hours parameter must be between 1 and 168',
          },
        });
        return;
      }

      // Validate limit parameter
      if (limit < 1 || limit > 168) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Limit parameter must be between 1 and 168',
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

      res.status(200).json({
        success: true,
        data,
        metadata: {
          hours,
          tokenSymbol: tokenSymbol?.toUpperCase(),
          limit,
          count: data.length,
        },
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
      const hours = req.query.hours
        ? parseInt(req.query.hours as string)
        : undefined;

      // Validate hours parameter if provided
      if (hours !== undefined && (hours < 1 || hours > 720)) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Hours parameter must be between 1 and 720',
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

      const data = await this.analyticsService.getNetworkStats(
        tokenSymbol?.toUpperCase(),
        hours
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}
