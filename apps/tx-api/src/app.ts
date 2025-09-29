import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { databaseMiddleware } from './middleware/database.middleware';
import { healthCheck } from './controllers/health.controller';
import { apiRoutes } from './routes';
import {
  requestId,
  securityHeaders,
  apiVersionHeader,
  requestSizeLimit,
  requestLogger,
} from './middleware/security';
import { setupSwagger } from './middleware/swagger';

export const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Request tracking and security
app.use(requestId);
app.use(securityHeaders);
app.use(apiVersionHeader);

// Enhanced security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // We handle CSP in securityHeaders
    crossOriginEmbedderPolicy: false,
  })
);

// Request size limiting
app.use(requestSizeLimit);

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 200,
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware with smaller limits for security
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging (custom + morgan)
app.use(requestLogger);
app.use(morgan(config.logging.format));

// Database and Redis middleware
app.use(databaseMiddleware);

// Setup API documentation
setupSwagger(app);

// Health check endpoint
app.get('/health', healthCheck);

// API routes
app.use('/api/v1', apiRoutes);

// Legacy status endpoint
app.get('/api/v1/status', (req, res) => {
  res.json({
    message: 'TX API Server is running',
    version: config.api.version,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);
