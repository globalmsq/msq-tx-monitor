import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

// Custom error class for API errors
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(statusCode: number, message: string, details?: any, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    code: number;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    stack?: string;
  };
}

// Global error handling middleware
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = err;

  // Convert non-ApiError errors to ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = (error as any).statusCode || 500;
    const message = error.message || 'Internal server error';
    error = new ApiError(statusCode, message, null, false);
  }

  const apiError = error as ApiError;

  // Log error details
  console.error('API Error:', {
    timestamp: new Date().toISOString(),
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      message: apiError.message,
      stack: apiError.stack,
      statusCode: apiError.statusCode,
      isOperational: apiError.isOperational,
      details: apiError.details
    }
  });

  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: {
      code: apiError.statusCode,
      message: apiError.message,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || undefined
    }
  };

  // Add details if available and not in production
  if (apiError.details && config.server.env !== 'production') {
    errorResponse.error.details = apiError.details;
  }

  // Add stack trace in development
  if (config.server.env === 'development') {
    errorResponse.error.stack = apiError.stack;
  }

  // Send error response
  res.status(apiError.statusCode).json(errorResponse);
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new ApiError(404, 'Resource not found', {
    path: req.originalUrl,
    method: req.method
  });

  res.status(404).json({
    error: {
      code: 404,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString()
    }
  });
};

// Async error wrapper for controllers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Common error factory functions
export const createNotFoundError = (resource: string) => {
  return new ApiError(404, `${resource} not found`);
};

export const createValidationError = (message: string, details?: any) => {
  return new ApiError(400, message, details);
};

export const createUnauthorizedError = (message: string = 'Unauthorized') => {
  return new ApiError(401, message);
};

export const createForbiddenError = (message: string = 'Forbidden') => {
  return new ApiError(403, message);
};

export const createInternalError = (message: string = 'Internal server error', details?: any) => {
  return new ApiError(500, message, details);
};

export const createServiceUnavailableError = (service: string) => {
  return new ApiError(503, `${service} service unavailable`);
};