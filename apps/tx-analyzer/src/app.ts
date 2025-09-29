import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { analyzeRoutes } from './routes/analyze.routes';
import statisticsRoutes from './routes/statistics.routes';

export function createApp(): Application {
  const app = express();

  // Configure Express to handle BigInt serialization
  app.set('json replacer', (key: string, value: any) =>
    typeof value === 'bigint' ? value.toString() : value
  );

  // Security middleware
  app.use(helmet());

  // CORS middleware
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === 'production'
          ? ['http://localhost:3000'] // tx-dashboard
          : true,
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'tx-analyzer',
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use('/api/v1/analyze', analyzeRoutes);
  app.use('/api/v1/statistics', statisticsRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'TX Analyzer API',
      version: '1.0.0',
      endpoints: [
        'GET /api/v1/analyze/summary',
        'GET /api/v1/analyze/trends/hourly',
        'GET /api/v1/analyze/trends/daily',
        'GET /api/v1/analyze/tokens',
        'GET /api/v1/analyze/volume',
        'GET /api/v1/statistics/realtime',
        'GET /api/v1/statistics/volume/hourly',
        'GET /api/v1/statistics/volume/daily',
        'GET /api/v1/statistics/tokens',
        'GET /api/v1/statistics/addresses/top',
        'GET /api/v1/statistics/anomalies',
        'GET /api/v1/statistics/network',
        'GET /api/v1/statistics/distribution/token',
      ],
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method,
    });
  });

  // Error handling middleware
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error('Error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message:
          process.env.NODE_ENV === 'development'
            ? err.message
            : 'Something went wrong',
      });
    }
  );

  return app;
}
