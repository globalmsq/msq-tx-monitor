import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

// Request ID middleware for tracking
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID if not provided
  const requestId = req.headers['x-request-id'] as string ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict transport security (HTTPS only)
  if (config.server.env === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content security policy
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self'; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "media-src 'self'; " +
    "frame-src 'none';"
  );

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remove server information
  res.removeHeader('X-Powered-By');

  next();
};

// API version header middleware
export const apiVersionHeader = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-API-Version', config.api.version);
  next();
};

// CORS preflight handling
export const corsPreflightHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
};

// Request size limit middleware
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxSize = 1024 * 1024; // 1MB limit

  if (contentLength > maxSize) {
    res.status(413).json({
      error: {
        code: 413,
        message: 'Request entity too large',
        details: `Maximum request size is ${maxSize} bytes`,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  next();
};

// IP whitelist middleware (for production use)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || '';

    // Skip in development
    if (config.server.env === 'development') {
      next();
      return;
    }

    if (!allowedIPs.includes(clientIP)) {
      res.status(403).json({
        error: {
          code: 403,
          message: 'Access denied',
          details: 'IP address not whitelisted',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Log request
  console.log('Request:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'],
    contentLength: req.headers['content-length']
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log('Response:', {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'],
      statusCode: res.statusCode,
      contentLength: res.get('content-length'),
      duration: `${duration}ms`
    });
  });

  next();
};