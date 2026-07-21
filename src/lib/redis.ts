import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export const redis =
  globalForRedis.redis ||
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

// Simple rate limiter implementation using Redis
export async function rateLimit(
  ip: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Normalize IP
  const cleanIp = ip.replace(/[^a-zA-Z0-9]/g, '_');
  const now = Math.floor(Date.now() / 1000);
  const windowIndex = Math.floor(now / windowSeconds);
  const key = `ratelimit:${cleanIp}:${windowIndex}`;

  try {
    const multi = redis.multi();
    multi.incr(key);
    multi.ttl(key);
    const results = await multi.exec();

    if (!results) {
      return { success: true, limit, remaining: limit, reset: now + windowSeconds };
    }

    const count = (results[0][1] as number) || 1;
    const ttl = (results[1][1] as number) || -1;

    // Set TTL on fresh keys
    if (ttl === -1) {
      await redis.expire(key, windowSeconds);
    }

    const remaining = Math.max(0, limit - count);
    const reset = now + (ttl === -1 ? windowSeconds : ttl);

    return {
      success: count <= limit,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail-open in case Redis has issues (so we don't block legitimate users)
    return { success: true, limit, remaining: 1, reset: now + windowSeconds };
  }
}
