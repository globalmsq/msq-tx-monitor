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

      const result = await this.addressService.getTopAddresses(filters, limit);

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

      const statistics =
        await this.addressService.getAddressStatistics(address);

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
}
