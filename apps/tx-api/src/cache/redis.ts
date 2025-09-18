import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

export class RedisConnection {
  private static instance: RedisClientType;
  private static isConnected: boolean = false;

  public static async getInstance(): Promise<RedisClientType> {
    if (!RedisConnection.instance) {
      RedisConnection.instance = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
          reconnectStrategy: retries => {
            if (retries > 10) {
              console.error('❌ Redis connection failed after 10 retries');
              return new Error('Redis connection failed');
            }
            const delay = Math.min(retries * 50, 1000);
            console.log(
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
        console.log('🔄 Redis connecting...');
      });

      RedisConnection.instance.on('ready', () => {
        console.log('✅ Redis connected and ready');
        RedisConnection.isConnected = true;
      });

      RedisConnection.instance.on('error', error => {
        console.error('❌ Redis connection error:', error);
        RedisConnection.isConnected = false;
      });

      RedisConnection.instance.on('end', () => {
        console.log('🔌 Redis connection ended');
        RedisConnection.isConnected = false;
      });
    }

    if (!RedisConnection.isConnected) {
      try {
        await RedisConnection.instance.connect();
      } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
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
        console.log('✅ Redis connection test successful');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Redis connection test failed:', error);
      return false;
    }
  }

  public static isReady(): boolean {
    return RedisConnection.isConnected;
  }

  public static async closeConnection(): Promise<void> {
    if (RedisConnection.instance && RedisConnection.isConnected) {
      await RedisConnection.instance.quit();
      console.log('✅ Redis connection closed');
      RedisConnection.isConnected = false;
    }
  }

  // Cache helper methods
  public static async get(key: string): Promise<string | null> {
    try {
      const client = await RedisConnection.getInstance();
      return await client.get(key);
    } catch (error) {
      console.error(`❌ Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  public static async set(
    key: string,
    value: string,
    ttlSeconds?: number
  ): Promise<boolean> {
    try {
      const client = await RedisConnection.getInstance();
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, value);
      } else {
        await client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error(`❌ Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  public static async del(key: string): Promise<boolean> {
    try {
      const client = await RedisConnection.getInstance();
      await client.del(key);
      return true;
    } catch (error) {
      console.error(`❌ Redis DEL error for key ${key}:`, error);
      return false;
    }
  }
}
