/**
 * Logger utility for consistent logging across MSQ Transaction Monitor
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private timestamp: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.prefix = options.prefix ?? '';
    this.timestamp = options.timestamp ?? true;
  }

  private formatMessage(level: string, message: string): string {
    const parts: string[] = [];

    if (this.timestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    parts.push(`[${level}]`);

    if (this.prefix) {
      parts.push(`[${this.prefix}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(this.formatMessage('DEBUG', message), ...args);
      }
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  error(message: string, error?: unknown): void {
    if (this.level <= LogLevel.ERROR) {
      const errorMessage = error instanceof Error
        ? `${message}: ${error.message}`
        : message;
      console.error(this.formatMessage('ERROR', errorMessage));
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }
  }

  fatal(message: string, error?: unknown): void {
    if (this.level <= LogLevel.FATAL) {
      const errorMessage = error instanceof Error
        ? `${message}: ${error.message}`
        : message;
      console.error(this.formatMessage('FATAL', errorMessage));
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      // In production, you might want to send this to an error tracking service
    }
  }
}

// Default logger instance
export const logger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  prefix: 'MSQ',
});

// Service-specific loggers
export const apiLogger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  prefix: 'API',
});

export const cacheLogger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
  prefix: 'CACHE',
});

export const wsLogger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  prefix: 'WS',
});