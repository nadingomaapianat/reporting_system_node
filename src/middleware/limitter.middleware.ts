import { Injectable, NestMiddleware } from '@nestjs/common';
import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware (bank security requirement).
 * Limits requests per IP to reduce brute-force and DoS risk.
 * /csrf/token is excluded so the frontend can obtain a CSRF token before
 * authenticated requests without hitting 429 (e.g. multiple tabs or retries).
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/csrf/token',
    message: {
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
    },
  });

  use(req: any, res: any, next: () => void) {
    this.limiter(req, res, next);
  }
}
