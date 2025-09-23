import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

export class RedisService {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password || undefined,
      database: config.redis.db,
    });

    this.client.on('error', error => {
      console.error('Redis cache connection error:', error);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('✅ Redis cache connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      console.log('🔗 Redis cache ready');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      console.log('❌ Redis cache disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        // Continue without cache if Redis is not available
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds: number = 300
  ): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  generateCacheKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          if (params[key] !== undefined && params[key] !== null) {
            acc[key] = params[key];
          }
          return acc;
        },
        {} as Record<string, unknown>
      );

    const paramString = Object.entries(sortedParams)
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    return `tx-analyzer:${prefix}:${paramString}`;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const redisService = new RedisService();
