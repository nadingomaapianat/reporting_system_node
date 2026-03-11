import { Injectable, NestMiddleware } from '@nestjs/common';
import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware (bank security requirement).
 * Limits requests per IP to reduce brute-force and DoS risk.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
    },
  });

  use(req: any, res: any, next: () => void) {
    this.limiter(req, res, next);
  }
}
