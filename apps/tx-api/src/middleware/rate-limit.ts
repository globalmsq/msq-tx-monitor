import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { config } from '../config';

// Rate limiting configuration
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 1 minute window
  max: config.rateLimit.max, // 100 requests per window per IP
  message: {
    error: {
      code: 429,
      message: 'Too many requests',
      details: 'Rate limit exceeded. Please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Slow down configuration for gradual response delays
export const speedLimiter = slowDown({
  windowMs: config.rateLimit.windowMs, // 1 minute window
  delayAfter: Math.floor(config.rateLimit.max * 0.5), // Start slowing after 50% of limit
  delayMs: () => 500, // Add 500ms delay per request after threshold (new v3 syntax)
  maxDelayMs: 2000, // Maximum delay of 2 seconds
});

// Stricter rate limit for search endpoints (potential for abuse)
export const searchRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.floor(config.rateLimit.max * 0.3), // 30% of normal limit for search
  message: {
    error: {
      code: 429,
      message: 'Search rate limit exceeded',
      details:
        'Too many search requests. Please slow down your search queries.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict rate limit for health check endpoint to prevent monitoring abuse
export const healthRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 30, // 30 requests per minute for health checks
  message: {
    error: {
      code: 429,
      message: 'Health check rate limit exceeded',
      details: 'Too many health check requests.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
