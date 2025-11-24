import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const EXCLUDED_PATHS = ['/csrf/token', '/docs', '/swagger'];

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path || req.originalUrl || '';
    if (EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded))) {
      return next();
    }

    const csrfCookie = req.cookies?.csrfToken;
    const csrfHeader = req.headers['x-csrf-token'];

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }

    return next();
  }
}

