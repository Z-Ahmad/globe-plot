import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiter for AI queries - user-based (not IP-based)
 * Limits: 30 queries per hour per authenticated user
 */
export const aiQueryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 requests per hour per user
  standardHeaders: true,
  legacyHeaders: false,
  
  // Use Firebase UID as key instead of IP
  keyGenerator: (req: Request): string => {
    // If authenticated, use user ID
    if (req.user && req.user.uid) {
      return `ai-query:${req.user.uid}`;
    }
    // Fallback to IP (should not happen with auth middleware)
    return `ai-query:${req.ip}`;
  },
  
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response) => {
    const retryAfter = res.getHeader('Retry-After');
    res.status(429).json({
      error: 'AI query rate limit exceeded',
      message: 'You can make 30 AI queries per hour. Please try again later.',
      retryAfter: retryAfter || 3600
    });
  },
  
  // Skip rate limiting for certain conditions (optional)
  skip: (req: Request): boolean => {
    // Could add logic here to skip rate limiting for premium users in the future
    return false;
  }
});

/**
 * Daily rate limiter - additional protection
 * Limits: 100 queries per day per user
 */
export const aiQueryDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // 100 requests per day per user
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request): string => {
    if (req.user && req.user.uid) {
      return `ai-query-daily:${req.user.uid}`;
    }
    return `ai-query-daily:${req.ip}`;
  },
  
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Daily AI query limit exceeded',
      message: 'You have reached your daily limit of 100 AI queries. Please try again tomorrow.',
      retryAfter: 86400 // 24 hours in seconds
    });
  }
});

/**
 * Global fail-safe limiter - prevents abuse across all users
 * Limits: 500 queries per hour globally
 */
export const globalAiQueryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // 500 requests per hour total
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (): string => {
    return 'ai-query:global';
  },
  
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Service temporarily unavailable',
      message: 'AI query service is experiencing high traffic. Please try again in a few minutes.',
      retryAfter: 300 // 5 minutes
    });
  }
});
