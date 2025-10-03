import { Request, Response, NextFunction } from 'express';
import { AddressService } from '../services/address.service';
import { AddressRankingFilters } from '../types/address.types';

export class AddressController {
  private addressService: AddressService;

  constructor() {
    this.addressService = new AddressService();
  }

  /**
   * @swagger
   * /addresses/rankings:
   *   get:
   *     summary: Get top addresses ranked by volume
   *     tags: [Addresses]
   *     parameters:
   *       - $ref: '#/components/parameters/TokenFilter'
   *       - $ref: '#/components/parameters/TimePeriodFilter'
   *       - name: min_volume
   *         in: query
   *         description: Minimum total volume threshold
   *         schema:
   *           type: string
   *       - name: min_transactions
   *         in: query
   *         description: Minimum transaction count threshold
   *         schema:
   *           type: integer
   *       - $ref: '#/components/parameters/LimitParam'
   *     responses:
   *       200:
   *         description: Successfully retrieved address rankings
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/AddressRanking'
   *                 filters:
   *                   type: object
   *                 period:
   *                   type: object
   *                   properties:
   *                     start_date:
   *                       type: string
   *                       format: date-time
   *                     end_date:
   *                       type: string
   *                       format: date-time
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         $ref: '#/components/schemas/Error'
   *       429:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  getTopAddressesByVolume = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const limit = Math.min(
        parseInt(req.query.limit as string) || 50,
        100 // Max 100 addresses
      );

      // Parse hours parameter (new) or time_period (legacy)
      const hours = req.query.hours
        ? parseInt(req.query.hours as string)
        : undefined;

      // Parse filters
      const filters: AddressRankingFilters = {
        token: req.query.token as string,
        time_period: req.query.time_period as 'day' | 'week' | 'month' | 'all',
        min_volume: req.query.min_volume as string,
        min_transactions: req.query.min_transactions
          ? parseInt(req.query.min_transactions as string)
          : undefined,
      };

      // Validate time_period if provided
      if (
        filters.time_period &&
        !['day', 'week', 'month', 'all'].includes(filters.time_period)
      ) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid time_period',
            details: 'time_period must be one of: day, week, month, all',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Remove undefined values
      Object.keys(filters).forEach(
        key =>
          filters[key as keyof AddressRankingFilters] === undefined &&
          delete filters[key as keyof AddressRankingFilters]
      );

      const result = await this.addressService.getTopAddresses(
        filters,
        limit,
        hours
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /addresses/rankings/frequency:
   *   get:
   *     summary: Get top addresses ranked by transaction frequency
   *     description: Retrieve addresses ranked by their transaction frequency (most active addresses)
   *     tags: [Addresses]
   *     parameters:
   *       - $ref: '#/components/parameters/TokenFilter'
   *       - $ref: '#/components/parameters/TimePeriodFilter'
   *       - name: min_volume
   *         in: query
   *         description: Minimum total volume threshold
   *         schema:
   *           type: string
   *       - name: min_transactions
   *         in: query
   *         description: Minimum transaction count threshold
   *         schema:
   *           type: integer
   *       - $ref: '#/components/parameters/LimitParam'
   *     responses:
   *       200:
   *         description: Successfully retrieved address frequency rankings
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/AddressRanking'
   *                 filters:
   *                   type: object
   *                 period:
   *                   type: object
   *                   properties:
   *                     start_date:
   *                       type: string
   *                       format: date-time
   *                     end_date:
   *                       type: string
   *                       format: date-time
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         $ref: '#/components/schemas/Error'
   *       429:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  getTopAddressesByFrequency = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const limit = Math.min(
        parseInt(req.query.limit as string) || 50,
        100 // Max 100 addresses
      );

      // Parse filters
      const filters: AddressRankingFilters = {
        token: req.query.token as string,
        time_period: req.query.time_period as 'day' | 'week' | 'month' | 'all',
        min_volume: req.query.min_volume as string,
        min_transactions: req.query.min_transactions
          ? parseInt(req.query.min_transactions as string)
          : undefined,
      };

      // Validate time_period
      if (
        filters.time_period &&
        !['day', 'week', 'month', 'all'].includes(filters.time_period)
      ) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid time_period',
            details: 'time_period must be one of: day, week, month, all',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Remove undefined values
      Object.keys(filters).forEach(
        key =>
          filters[key as keyof AddressRankingFilters] === undefined &&
          delete filters[key as keyof AddressRankingFilters]
      );

      const result = await this.addressService.getTopAddressesByFrequency(
        filters,
        limit
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /addresses/search:
   *   get:
   *     summary: Search addresses with autocomplete functionality
   *     tags: [Addresses]
   *     parameters:
   *       - name: q
   *         in: query
   *         required: true
   *         description: Search query (partial address starting with 0x)
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]*$'
   *           minLength: 5
   *       - name: limit
   *         in: query
   *         description: Number of results to return (max 20)
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 20
   *           default: 10
   *     responses:
   *       200:
   *         description: Successfully retrieved search results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/AddressSearch'
   *                 query:
   *                   type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         $ref: '#/components/schemas/Error'
   *       429:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  searchAddresses = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = req.query.q as string;

      if (!query) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Missing search query',
            details: 'Query parameter q is required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Validate query format (should start with 0x and be hex)
      if (!query.startsWith('0x') || !/^0x[a-fA-F0-9]*$/.test(query)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid address format',
            details:
              'Address must start with 0x and contain only hexadecimal characters',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Minimum 3 characters after 0x
      if (query.length < 5) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Query too short',
            details:
              'Search query must be at least 3 characters after 0x prefix',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const limit = Math.min(
        parseInt(req.query.limit as string) || 10,
        20 // Max 20 results for autocomplete
      );

      const results = await this.addressService.searchAddresses(query, limit);

      res.json({
        data: results,
        query,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /addresses/stats/{address}:
   *   get:
   *     summary: Get detailed statistics for a specific address
   *     description: Retrieve comprehensive statistics and analytics for a specific Ethereum address, including transaction history, token breakdown, and anomaly analysis
   *     tags: [Addresses]
   *     parameters:
   *       - name: address
   *         in: path
   *         required: true
   *         description: Ethereum address (0x prefixed 40-character hex string)
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]{40}$'
   *           example: '0x1234567890abcdef1234567890abcdef12345678'
   *     responses:
   *       200:
   *         description: Successfully retrieved address statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   properties:
   *                     address:
   *                       type: string
   *                       description: Ethereum address
   *                     total_transactions:
   *                       type: integer
   *                       description: Total number of transactions
   *                     total_sent:
   *                       type: string
   *                       description: Total amount sent in wei
   *                     total_received:
   *                       type: string
   *                       description: Total amount received in wei
   *                     total_volume:
   *                       type: string
   *                       description: Total volume (sent + received) in wei
   *                     total_sent_transactions:
   *                       type: integer
   *                       description: Number of sent transactions
   *                     total_received_transactions:
   *                       type: integer
   *                       description: Number of received transactions
   *                     first_transaction_date:
   *                       type: string
   *                       format: date-time
   *                       description: Date of first transaction
   *                     last_transaction_date:
   *                       type: string
   *                       format: date-time
   *                       description: Date of last transaction
   *                     token_breakdown:
   *                       type: object
   *                       description: Transaction breakdown by token (MSQ, SUT, KWT, P2UC)
   *                     anomaly_statistics:
   *                       type: object
   *                       properties:
   *                         total_anomalies:
   *                           type: integer
   *                           description: Total number of anomalous transactions
   *                         avg_anomaly_score:
   *                           type: number
   *                           description: Average anomaly score
   *                         max_anomaly_score:
   *                           type: number
   *                           description: Maximum anomaly score
   *                         anomaly_rate:
   *                           type: number
   *                           description: Percentage of anomalous transactions
   *                     calculated_at:
   *                       type: string
   *                       format: date-time
   *                       description: When statistics were calculated
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Invalid address format
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: Address not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       429:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  getAddressStatistics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { address } = req.params;
      const { hours, token } = req.query;

      // Validate Ethereum address format
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid address format',
            details:
              'Address must be a valid 40-character hex string with 0x prefix',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Parse hours parameter if provided
      const hoursParam = hours ? parseInt(hours as string) : undefined;

      const statistics = await this.addressService.getAddressStatistics(
        address,
        hoursParam,
        token as string
      );

      if (!statistics) {
        res.status(404).json({
          error: {
            code: 404,
            message: 'Address not found',
            details: `No transaction data found for address: ${address}`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /addresses/{address}/profile:
   *   get:
   *     summary: Get detailed behavioral profile for a specific address
   *     description: Retrieve comprehensive behavioral analysis including rank, percentile, category, and scores
   *     tags: [Addresses]
   *     parameters:
   *       - name: address
   *         in: path
   *         required: true
   *         description: Ethereum address (0x prefixed 40-character hex string)
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]{40}$'
   *       - name: tokenAddress
   *         in: query
   *         description: Filter by specific token address
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]{40}$'
   *     responses:
   *       200:
   *         description: Successfully retrieved address profile
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   properties:
   *                     address:
   *                       type: string
   *                     tokenAddress:
   *                       type: string
   *                     rank:
   *                       type: integer
   *                     percentile:
   *                       type: number
   *                     category:
   *                       type: object
   *                       properties:
   *                         whale:
   *                           type: boolean
   *                         activeTrader:
   *                           type: boolean
   *                         dormantAccount:
   *                           type: boolean
   *                         suspiciousPattern:
   *                           type: boolean
   *                         highRisk:
   *                           type: boolean
   *                     scores:
   *                       type: object
   *                       properties:
   *                         volume:
   *                           type: number
   *                         frequency:
   *                           type: number
   *                         recency:
   *                           type: number
   *                         diversity:
   *                           type: number
   *                         composite:
   *                           type: number
   *                     label:
   *                       type: string
   *                     metadata:
   *                       type: object
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         $ref: '#/components/schemas/Error'
   *       404:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  getAddressProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { address } = req.params;
      const { tokenAddress } = req.query;

      // Validate address format
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid address format',
            details:
              'Address must be a valid 40-character hex string with 0x prefix',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Validate token address format if provided
      if (tokenAddress && !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress as string)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid token address format',
            details:
              'Token address must be a valid 40-character hex string with 0x prefix',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const profile = await this.addressService.getAddressProfile(
        address,
        tokenAddress as string
      );

      if (!profile) {
        res.status(404).json({
          error: {
            code: 404,
            message: 'Address profile not found',
            details: `No profile data found for address: ${address}`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        data: profile,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /addresses/whales:
   *   get:
   *     summary: Get whale addresses (top 1% by volume)
   *     description: Retrieve addresses identified as whales based on transaction volume
   *     tags: [Addresses]
   *     parameters:
   *       - name: tokenAddress
   *         in: query
   *         description: Filter by specific token address
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]{40}$'
   *       - name: limit
   *         in: query
   *         description: Number of results to return (max 100)
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *     responses:
   *       200:
   *         description: Successfully retrieved whale addresses
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/AddressProfile'
   *                 filters:
   *                   type: object
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  getWhaleAddresses = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { tokenAddress, token } = req.query;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const hours = req.query.hours
        ? parseInt(req.query.hours as string)
        : undefined;

      // Validate token address format if provided
      if (tokenAddress && !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress as string)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid token address format',
            details:
              'Token address must be a valid 40-character hex string with 0x prefix',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const result = await this.addressService.getWhaleAddresses(
        tokenAddress as string,
        token as string,
        limit,
        hours
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /addresses/active-traders:
   *   get:
   *     summary: Get active trader addresses (high frequency)
   *     description: Retrieve addresses with high transaction frequency
   *     tags: [Addresses]
   *     parameters:
   *       - name: tokenAddress
   *         in: query
   *         description: Filter by specific token address
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]{40}$'
   *       - name: limit
   *         in: query
   *         description: Number of results to return (max 100)
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *       - name: minTransactions
   *         in: query
   *         description: Minimum transaction count threshold
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 50
   *     responses:
   *       200:
   *         description: Successfully retrieved active trader addresses
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/AddressProfile'
   *                 filters:
   *                   type: object
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  getActiveTraders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { tokenAddress, token, minTransactions } = req.query;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const minTxCount = Math.max(parseInt(minTransactions as string) || 50, 1);
      const hours = req.query.hours
        ? parseInt(req.query.hours as string)
        : undefined;

      // Validate token address format if provided
      if (tokenAddress && !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress as string)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid token address format',
            details:
              'Token address must be a valid 40-character hex string with 0x prefix',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const result = await this.addressService.getActiveTraders(
        tokenAddress as string,
        token as string,
        limit,
        minTxCount,
        hours
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /addresses/suspicious:
   *   get:
   *     summary: Get suspicious addresses (high risk score)
   *     description: Retrieve addresses with high risk scores or flagged as suspicious
   *     tags: [Addresses]
   *     parameters:
   *       - name: tokenAddress
   *         in: query
   *         description: Filter by specific token address
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]{40}$'
   *       - name: limit
   *         in: query
   *         description: Number of results to return (max 100)
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *       - name: minRiskScore
   *         in: query
   *         description: Minimum risk score threshold (0.0 - 1.0)
   *         schema:
   *           type: number
   *           minimum: 0
   *           maximum: 1
   *           default: 0.7
   *     responses:
   *       200:
   *         description: Successfully retrieved suspicious addresses
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/AddressProfile'
   *                 filters:
   *                   type: object
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  getSuspiciousAddresses = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { tokenAddress, token, minRiskScore } = req.query;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const minRisk = Math.min(
        Math.max(parseFloat(minRiskScore as string) || 0.7, 0),
        1
      );
      const hours = req.query.hours
        ? parseInt(req.query.hours as string)
        : undefined;

      // Validate token address format if provided
      if (tokenAddress && !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress as string)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid token address format',
            details:
              'Token address must be a valid 40-character hex string with 0x prefix',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const result = await this.addressService.getSuspiciousAddresses(
        tokenAddress as string,
        token as string,
        limit,
        minRisk,
        hours
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /addresses/{address}/trends:
   *   get:
   *     summary: Get transaction trends for a specific address
   *     description: Retrieve time-series data showing transaction activity trends for an address
   *     tags: [Addresses]
   *     parameters:
   *       - name: address
   *         in: path
   *         required: true
   *         description: Ethereum address (0x prefixed 40-character hex string)
   *         schema:
   *           type: string
   *           pattern: '^0x[a-fA-F0-9]{40}$'
   *       - name: hours
   *         in: query
   *         description: Number of hours to look back (1-720)
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 720
   *           default: 24
   *       - name: tokenSymbol
   *         in: query
   *         description: Filter by specific token symbol (MSQ, SUT, KWT, P2UC)
   *         schema:
   *           type: string
   *           enum: [MSQ, SUT, KWT, P2UC]
   *       - name: interval
   *         in: query
   *         description: Time interval for aggregation
   *         schema:
   *           type: string
   *           enum: [hourly, daily]
   *           default: hourly
   *     responses:
   *       200:
   *         description: Successfully retrieved address trends
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   properties:
   *                     trends:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           timestamp:
   *                             type: string
   *                             format: date-time
   *                           transactionCount:
   *                             type: integer
   *                           volume:
   *                             type: string
   *                           sentCount:
   *                             type: integer
   *                           receivedCount:
   *                             type: integer
   *                           sentVolume:
   *                             type: string
   *                           receivedVolume:
   *                             type: string
   *                           avgAnomalyScore:
   *                             type: number
   *                     summary:
   *                       type: object
   *                       properties:
   *                         totalTransactions:
   *                           type: integer
   *                         totalVolume:
   *                           type: string
   *                         peakHour:
   *                           type: string
   *                           format: date-time
   *                         avgTransactionsPerHour:
   *                           type: number
   *                         growthRate:
   *                           type: number
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         $ref: '#/components/schemas/Error'
   *       404:
   *         $ref: '#/components/schemas/Error'
   *       500:
   *         $ref: '#/components/schemas/Error'
   */
  getAddressTrends = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { address } = req.params;
      const { hours, tokenSymbol, interval } = req.query;

      // Validate address format
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid address format',
            details:
              'Address must be a valid 40-character hex string with 0x prefix',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Parse and validate hours parameter (only if provided)
      const hoursParam = hours ? parseInt(hours as string) : undefined;

      if (hoursParam !== undefined && (hoursParam < 1 || hoursParam > 8760)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid hours parameter',
            details: 'Hours must be between 1 and 8760',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Validate tokenSymbol if provided
      if (
        tokenSymbol &&
        !['MSQ', 'SUT', 'KWT', 'P2UC'].includes(tokenSymbol as string)
      ) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid token symbol',
            details: 'Token symbol must be one of: MSQ, SUT, KWT, P2UC',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Validate interval if provided
      const intervalParam = (interval as 'hourly' | 'daily') || 'hourly';
      if (!['hourly', 'daily'].includes(intervalParam)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid interval parameter',
            details: 'Interval must be either hourly or daily',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const trends = await this.addressService.getAddressTrends(
        address,
        hoursParam,
        tokenSymbol as string,
        intervalParam
      );

      if (!trends || trends.trends.length === 0) {
        res.status(404).json({
          error: {
            code: 404,
            message: 'No trend data found',
            details: `No transaction trends found for address: ${address}`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        data: trends,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
