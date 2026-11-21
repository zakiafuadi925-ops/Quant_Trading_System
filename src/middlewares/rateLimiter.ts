import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    tokens: number;
    resetTime: number;
  };
}

export interface RateLimitOptions {
  windowMs: number; // Duration of window in ms
  max: number;      // Max number of requests allowed in windowMs
  message?: string;
}

/**
 * In-memory sliding window rate limiter middleware.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const store: RateLimitStore = {};
  const { windowMs, max, message = 'Too many requests, please try again later.' } = options;

  // Cleanup expired windows every 5 minutes to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const ip in store) {
      if (store[ip].resetTime <= now) {
        delete store[ip];
      }
    }
  }, 5 * 60 * 1000).unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    // Determine client identifier (support proxy headers)
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown-client';

    const now = Date.now();
    const clientRecord = store[clientIp];

    if (!clientRecord || clientRecord.resetTime <= now) {
      store[clientIp] = {
        tokens: 1,
        resetTime: now + windowMs
      };
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return next();
    }

    clientRecord.tokens += 1;
    const remaining = Math.max(0, max - clientRecord.tokens);
    const resetSeconds = Math.ceil(clientRecord.resetTime / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (clientRecord.tokens > max) {
      const retryAfter = Math.ceil((clientRecord.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message,
        retryAfterSeconds: retryAfter
      });
    }

    next();
  };
}

// Preset rate limiters
export const publicApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // 120 requests/minute
  message: 'Rate limit exceeded for public market & ML endpoints. Please wait 1 minute.'
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                  // 30 attempts/15 min
  message: 'Too many authentication attempts. Please try again after 15 minutes.'
});
