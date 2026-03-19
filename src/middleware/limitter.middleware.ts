import { Injectable, NestMiddleware } from '@nestjs/common';
import rateLimit from 'express-rate-limit';

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          /** Paths that are not counted toward rate limit (auth check + activity used often by frontend). */
const RATE_LIMIT_SKIP_PATHS = [
  '/csrf/token',
  '/api/auth/profile',
  '/api/dashboard/activity',
];

/**
 * Rate limiting middleware (bank security requirement).
 * Limits requests per IP to reduce brute-force and DoS risk.
 * Skip: /csrf/token, /api/auth/profile, /api/dashboard/activity so frontend
 * auth checks and activity tracking do not cause 429.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      const raw = req.originalUrl || req.url || req.path || '';
      const path = raw.split('?')[0];
      return RATE_LIMIT_SKIP_PATHS.some((p) => path === p);
    },
    message: {
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
    },
  });

  use(req: any, res: any, next: () => void) {
    this.limiter(req, res, next);
  }
}
