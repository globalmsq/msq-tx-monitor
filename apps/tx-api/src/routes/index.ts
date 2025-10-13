import { Router } from 'express';
import { transactionRoutes } from './transaction.routes';
import { addressRoutes } from './address.routes';
import { analyticsRoutes } from './analytics.routes';
import { cacheRoutes } from './cache.routes';

export const apiRoutes = Router();

// Mount transaction routes
apiRoutes.use('/transactions', transactionRoutes);

// Mount address routes
apiRoutes.use('/addresses', addressRoutes);

// Mount analytics routes
apiRoutes.use('/analytics', analyticsRoutes);

// Mount cache routes
apiRoutes.use('/cache', cacheRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API information endpoint
 *     description: Get information about the MSQ Transaction Monitor API, including available endpoints and features
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   description: API name
 *                 version:
 *                   type: string
 *                   description: API version
 *                 description:
 *                   type: string
 *                   description: API description
 *                 endpoints:
 *                   type: object
 *                   description: Available API endpoints
 *                 features:
 *                   type: object
 *                   description: API features and capabilities
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Response timestamp
 */
// API info endpoint
apiRoutes.get('/', (req, res) => {
  res.json({
    name: 'MSQ Transaction Monitor API',
    version: '1.0.0',
    description: 'REST API for blockchain transaction monitoring and analysis',
    endpoints: {
      transactions: '/api/v1/transactions',
      addresses: '/api/v1/addresses',
      health: '/health',
    },
    features: {
      transaction_filtering:
        'Filter by token, address, amount, date, anomalies',
      address_analytics: 'Rankings by volume/frequency, search, summaries',
      caching: 'Redis-based caching for improved performance',
      pagination: 'Configurable pagination with limits',
    },
    timestamp: new Date().toISOString(),
  });
});
