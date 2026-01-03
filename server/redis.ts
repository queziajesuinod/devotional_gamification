import Redis from 'ioredis';

const redisDisabled = process.env.REDIS_DISABLED === 'true';

// Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

// Create Redis client only when enabled
export let redis: Redis | null = null;

if (redisDisabled) {
  console.log('[Redis] Disabled via REDIS_DISABLED=true');
} else {
  redis = new Redis(redisConfig);

  // Redis connection event handlers
  redis.on('connect', () => {
    console.log('ƒo. Redis connected successfully');
  });

  redis.on('error', (err) => {
    console.error('ƒ?O Redis connection error:', err);
  });

  redis.on('ready', () => {
    console.log('ƒo. Redis ready to accept commands');
  });
}

// Session cache functions
const SESSION_PREFIX = 'session:';
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

export interface CachedSession {
  userId: number;
  email: string;
  nickname: string;
  createdAt: number;
}

/**
 * Store session in Redis cache
 */
export async function cacheSession(
  sessionToken: string,
  session: CachedSession
): Promise<void> {
  if (!redis) return;
  try {
    const key = `${SESSION_PREFIX}${sessionToken}`;
    await redis.setex(key, SESSION_TTL, JSON.stringify(session));
  } catch (error) {
    console.error('Redis cache session error (continuing without cache):', error);
    // Don't throw - allow app to continue without Redis
  }
}

/**
 * Get session from Redis cache
 */
export async function getSession(
  sessionToken: string
): Promise<CachedSession | null> {
  if (!redis) return null;
  try {
    const key = `${SESSION_PREFIX}${sessionToken}`;
    const data = await redis.get(key);
    
    if (!data) {
      return null;
    }
    
    return JSON.parse(data) as CachedSession;
  } catch (error) {
    console.error('Redis get session error (continuing without cache):', error);
    // Return null - app will fall back to database
    return null;
  }
}

/**
 * Delete session from Redis cache
 */
export async function deleteSession(sessionToken: string): Promise<void> {
  if (!redis) return;
  try {
    const key = `${SESSION_PREFIX}${sessionToken}`;
    await redis.del(key);
  } catch (error) {
    console.error('Redis delete session error (continuing without cache):', error);
    // Don't throw - allow app to continue without Redis
  }
}

/**
 * Extend session TTL in Redis cache
 */
export async function extendSession(sessionToken: string): Promise<void> {
  if (!redis) return;
  try {
    const key = `${SESSION_PREFIX}${sessionToken}`;
    await redis.expire(key, SESSION_TTL);
  } catch (error) {
    console.error('Redis extend session error (continuing without cache):', error);
    // Don't throw - allow app to continue without Redis
  }
}

/**
 * Check if Redis is healthy
 */
export async function checkRedisHealth(): Promise<boolean> {
  if (!redis) return false;
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (!redis) return;
  console.log('Closing Redis connection...');
  await redis.quit();
});

process.on('SIGINT', async () => {
  if (!redis) return;
  console.log('Closing Redis connection...');
  await redis.quit();
});
