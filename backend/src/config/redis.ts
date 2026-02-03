// =============================================================================
// GovBid Pro - Redis Configuration
// =============================================================================
// Redis client configuration for caching and job queues
// =============================================================================

import Redis, { RedisOptions } from 'ioredis';

// =============================================================================
// REDIS CONFIGURATION
// =============================================================================

export interface RedisConfig {
  url: string;
  host: string;
  port: number;
  password: string | undefined;
  db: number;
  keyPrefix: string;
  maxRetriesPerRequest: number;
  retryDelayMs: number;
  connectTimeout: number;
  commandTimeout: number;
  enableReadyCheck: boolean;
  enableOfflineQueue: boolean;
}

export const redisConfig: RedisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'govbid:',
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
  enableReadyCheck: true,
  enableOfflineQueue: true,
};

// =============================================================================
// REDIS CLIENT OPTIONS
// =============================================================================

const redisOptions: RedisOptions = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
  keyPrefix: redisConfig.keyPrefix,
  maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
  retryStrategy: (times: number) => {
    if (times > 10) {
      console.error('Redis: Max retry attempts reached');
      return null; // Stop retrying
    }
    const delay = Math.min(times * redisConfig.retryDelayMs, 3000);
    console.log(`Redis: Retrying connection in ${delay}ms (attempt ${times})`);
    return delay;
  },
  connectTimeout: redisConfig.connectTimeout,
  commandTimeout: redisConfig.commandTimeout,
  enableReadyCheck: redisConfig.enableReadyCheck,
  enableOfflineQueue: redisConfig.enableOfflineQueue,
  lazyConnect: true,
};

// =============================================================================
// REDIS CLIENT SINGLETON
// =============================================================================

class RedisClient {
  private static instance: Redis | null = null;
  private static subscriberInstance: Redis | null = null;

  /**
   * Get the main Redis client instance
   */
  static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis(redisOptions);

      // Event handlers
      RedisClient.instance.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      RedisClient.instance.on('error', (error) => {
        console.error('❌ Redis connection error:', error.message);
      });

      RedisClient.instance.on('close', () => {
        console.log('Redis connection closed');
      });

      RedisClient.instance.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });
    }

    return RedisClient.instance;
  }

  /**
   * Get a separate Redis client for subscriptions
   * (subscribed clients can't be used for regular commands)
   */
  static getSubscriberInstance(): Redis {
    if (!RedisClient.subscriberInstance) {
      RedisClient.subscriberInstance = new Redis({
        ...redisOptions,
        keyPrefix: undefined, // Subscribers shouldn't have key prefix
      });

      RedisClient.subscriberInstance.on('connect', () => {
        console.log('✅ Redis subscriber connected');
      });

      RedisClient.subscriberInstance.on('error', (error) => {
        console.error('❌ Redis subscriber error:', error.message);
      });
    }

    return RedisClient.subscriberInstance;
  }

  /**
   * Close all Redis connections
   */
  static async closeAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (RedisClient.instance) {
      promises.push(
        RedisClient.instance.quit().then(() => {
          RedisClient.instance = null;
          console.log('✅ Redis client disconnected');
        })
      );
    }

    if (RedisClient.subscriberInstance) {
      promises.push(
        RedisClient.subscriberInstance.quit().then(() => {
          RedisClient.subscriberInstance = null;
          console.log('✅ Redis subscriber disconnected');
        })
      );
    }

    await Promise.all(promises);
  }
}

// Export singleton instance
export const redis = RedisClient.getInstance();
export const redisSubscriber = RedisClient.getSubscriberInstance;
export const closeRedis = RedisClient.closeAll;

// =============================================================================
// REDIS CONNECTION HELPERS
// =============================================================================

/**
 * Connect to Redis
 * Call this during application startup
 */
export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (error) {
    // Connection might already be established
    if ((error as Error).message !== 'Redis is already connecting/connected') {
      throw error;
    }
  }
}

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// =============================================================================
// CACHE HELPERS
// =============================================================================

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

const DEFAULT_TTL = 3600; // 1 hour

/**
 * Get a value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in cache
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<boolean> {
  try {
    const ttl = options.ttl || DEFAULT_TTL;
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttl, serialized);
    return true;
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete a value from cache
 */
export async function cacheDelete(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return await redis.del(...keys);
  } catch (error) {
    console.error(`Cache delete pattern error for ${pattern}:`, error);
    return 0;
  }
}

/**
 * Get or set cache (cache-aside pattern)
 */
export async function cacheGetOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Generate value and cache it
  const value = await factory();
  await cacheSet(key, value, options);
  return value;
}

// =============================================================================
// RATE LIMITING HELPERS
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check and increment rate limit
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const fullKey = `ratelimit:${key}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Use Redis transaction for atomic operations
  const multi = redis.multi();
  multi.zremrangebyscore(fullKey, '-inf', windowStart);
  multi.zadd(fullKey, now, `${now}`);
  multi.zcount(fullKey, '-inf', '+inf');
  multi.expire(fullKey, windowSeconds);

  const results = await multi.exec();
  const count = results?.[2]?.[1] as number;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(now + windowSeconds * 1000),
  };
}

// =============================================================================
// SESSION HELPERS
// =============================================================================

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 86400 * 7; // 7 days

/**
 * Store session data
 */
export async function setSession(
  sessionId: string,
  data: Record<string, unknown>
): Promise<boolean> {
  return cacheSet(`${SESSION_PREFIX}${sessionId}`, data, { ttl: SESSION_TTL });
}

/**
 * Get session data
 */
export async function getSession(sessionId: string): Promise<Record<string, unknown> | null> {
  return cacheGet(`${SESSION_PREFIX}${sessionId}`);
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  return cacheDelete(`${SESSION_PREFIX}${sessionId}`);
}

/**
 * Extend session TTL
 */
export async function extendSession(sessionId: string): Promise<boolean> {
  try {
    await redis.expire(`${SESSION_PREFIX}${sessionId}`, SESSION_TTL);
    return true;
  } catch (error) {
    console.error('Session extend error:', error);
    return false;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  redis,
  config: redisConfig,
  connect: connectRedis,
  close: closeRedis,
  checkHealth: checkRedisHealth,
  cache: {
    get: cacheGet,
    set: cacheSet,
    delete: cacheDelete,
    deletePattern: cacheDeletePattern,
    getOrSet: cacheGetOrSet,
  },
  rateLimit: checkRateLimit,
  session: {
    set: setSession,
    get: getSession,
    delete: deleteSession,
    extend: extendSession,
  },
};
