import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '@msq-tx-monitor/msq-common';

export class RedisConnection {
  private static instance: RedisClientType | null = null;
  private static isConnected: boolean = false;
  private static enabled: boolean = config.redis.enabled;

  public static async getInstance(): Promise<RedisClientType> {
    if (!RedisConnection.enabled) {
      throw new Error('Redis is disabled by configuration');
    }

    if (!RedisConnection.instance) {
      RedisConnection.instance = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
          reconnectStrategy: retries => {
            if (retries > 10) {
              logger.error('❌ Redis connection failed after 10 retries');
              return new Error('Redis connection failed');
            }
            const delay = Math.min(retries * 50, 1000);
            logger.info(
              `🔄 Redis reconnecting in ${delay}ms (attempt ${retries})`
            );
            return delay;
          },
          connectTimeout: 5000,
        },
        password: config.redis.password || undefined,
        database: config.redis.db,
      });

      // Event handlers
      RedisConnection.instance.on('connect', () => {
        logger.info('🔄 Redis connecting...');
      });

      RedisConnection.instance.on('ready', () => {
        logger.info('✅ Redis connected and ready');
        RedisConnection.isConnected = true;
      });

      RedisConnection.instance.on('error', error => {
        logger.error('❌ Redis connection error:', error);
        RedisConnection.isConnected = false;
      });

      RedisConnection.instance.on('end', () => {
        logger.info('🔌 Redis connection ended');
        RedisConnection.isConnected = false;
      });
    }

    if (!RedisConnection.isConnected) {
      try {
        await RedisConnection.instance.connect();
      } catch (error) {
        logger.error('❌ Failed to connect to Redis:', error);
        throw error;
      }
    }

    return RedisConnection.instance;
  }

  public static async testConnection(): Promise<boolean> {
    try {
      const client = await RedisConnection.getInstance();
      const pong = await client.ping();

      if (pong === 'PONG') {
        logger.info('✅ Redis connection test successful');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('❌ Redis connection test failed:', error);
      return false;
    }
  }

  public static isReady(): boolean {
    return RedisConnection.isConnected;
  }

  public static async closeConnection(): Promise<void> {
    if (RedisConnection.instance && RedisConnection.isConnected) {
      await RedisConnection.instance.quit();
      logger.info('✅ Redis connection closed');
      RedisConnection.isConnected = false;
    }
  }

  // Cache helper methods
  public static async get(key: string): Promise<string | null> {
    if (!RedisConnection.enabled) {
      return null;
    }

    try {
      const client = await RedisConnection.getInstance();
      return await client.get(key);
    } catch (error) {
      logger.error(`❌ Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  public static async set(
    key: string,
    value: string,
    ttlSeconds?: number
  ): Promise<boolean> {
    if (!RedisConnection.enabled) {
      return false;
    }

    try {
      const client = await RedisConnection.getInstance();
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, value);
      } else {
        await client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`❌ Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  public static async del(key: string): Promise<boolean> {
    if (!RedisConnection.enabled) {
      return false;
    }

    try {
      const client = await RedisConnection.getInstance();
      await client.del(key);
      return true;
    } catch (error) {
      logger.error(`❌ Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  public static async deleteByPattern(pattern: string): Promise<number> {
    if (!RedisConnection.enabled) {
      return 0;
    }

    try {
      const client = await RedisConnection.getInstance();
      let cursor = 0;
      let deletedCount = 0;

      do {
        const reply = await client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = reply.cursor;

        if (reply.keys.length > 0) {
          await client.del(reply.keys);
          deletedCount += reply.keys.length;
        }
      } while (cursor !== 0);

      logger.info(
        `✅ Redis purged ${deletedCount} keys matching pattern: ${pattern}`
      );
      return deletedCount;
    } catch (error) {
      logger.error(
        `❌ Redis deleteByPattern error for pattern ${pattern}:`,
        error
      );
      return 0;
    }
  }
}
