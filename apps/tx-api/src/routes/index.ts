import { Router } from 'express';
import { transactionRoutes } from './transaction.routes';
import { addressRoutes } from './address.routes';

export const apiRoutes = Router();

// Mount transaction routes
apiRoutes.use('/transactions', transactionRoutes);

// Mount address routes
apiRoutes.use('/addresses', addressRoutes);

// API info endpoint
apiRoutes.get('/', (req, res) => {
  res.json({
    name: 'MSQ Transaction Monitor API',
    version: '1.0.0',
    description: 'REST API for blockchain transaction monitoring and analysis',
    endpoints: {
      transactions: '/api/v1/transactions',
      addresses: '/api/v1/addresses',
      health: '/health'
    },
    features: {
      transaction_filtering: 'Filter by token, address, amount, date, anomalies',
      address_analytics: 'Rankings by volume/frequency, search, summaries',
      caching: 'Redis-based caching for improved performance',
      pagination: 'Configurable pagination with limits'
    },
    timestamp: new Date().toISOString()
  });
});