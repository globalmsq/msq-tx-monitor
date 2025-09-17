import { Request, Response, NextFunction } from 'express';
import { AddressService } from '../services/address.service';
import { AddressRankingFilters } from '../types/address.types';
import { config } from '../config';

export class AddressController {
  private addressService: AddressService;

  constructor() {
    // Service will be injected via middleware
    this.addressService = null as any;
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
  getTopAddressesByVolume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.addressService = new AddressService(req.db);

      const limit = Math.min(
        parseInt(req.query.limit as string) || 50,
        100 // Max 100 addresses
      );

      // Parse filters
      const filters: AddressRankingFilters = {
        token: req.query.token as string,
        time_period: req.query.time_period as 'day' | 'week' | 'month' | 'all',
        min_volume: req.query.min_volume as string,
        min_transactions: req.query.min_transactions ? parseInt(req.query.min_transactions as string) : undefined
      };

      // Validate time_period
      if (filters.time_period && !['day', 'week', 'month', 'all'].includes(filters.time_period)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid time_period',
            details: 'time_period must be one of: day, week, month, all',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Remove undefined values
      Object.keys(filters).forEach(key =>
        filters[key as keyof AddressRankingFilters] === undefined && delete filters[key as keyof AddressRankingFilters]
      );

      const result = await this.addressService.getTopAddresses(filters, limit);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/addresses/rankings/frequency
   * Get top addresses ranked by transaction frequency
   */
  getTopAddressesByFrequency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.addressService = new AddressService(req.db);

      const limit = Math.min(
        parseInt(req.query.limit as string) || 50,
        100 // Max 100 addresses
      );

      // Parse filters
      const filters: AddressRankingFilters = {
        token: req.query.token as string,
        time_period: req.query.time_period as 'day' | 'week' | 'month' | 'all',
        min_volume: req.query.min_volume as string,
        min_transactions: req.query.min_transactions ? parseInt(req.query.min_transactions as string) : undefined
      };

      // Validate time_period
      if (filters.time_period && !['day', 'week', 'month', 'all'].includes(filters.time_period)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid time_period',
            details: 'time_period must be one of: day, week, month, all',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Remove undefined values
      Object.keys(filters).forEach(key =>
        filters[key as keyof AddressRankingFilters] === undefined && delete filters[key as keyof AddressRankingFilters]
      );

      const result = await this.addressService.getTopAddressesByFrequency(filters, limit);

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
  searchAddresses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.addressService = new AddressService(req.db);

      const query = req.query.q as string;

      if (!query) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Missing search query',
            details: 'Query parameter q is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Validate query format (should start with 0x and be hex)
      if (!query.startsWith('0x') || !/^0x[a-fA-F0-9]*$/.test(query)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Invalid address format',
            details: 'Address must start with 0x and contain only hexadecimal characters',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Minimum 3 characters after 0x
      if (query.length < 5) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Query too short',
            details: 'Search query must be at least 3 characters after 0x prefix',
            timestamp: new Date().toISOString()
          }
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
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };
}