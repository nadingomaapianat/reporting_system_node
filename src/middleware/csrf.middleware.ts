import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/csrf/token') {
      return next();
    }

    if (req.path.startsWith('/uploads/')) {
      return next();
    }

    const csrfCookie = (req as any).cookies?.['csrfToken'];
    const csrfHeader = req.headers['x-csrf-token'];

    if (!csrfHeader || csrfHeader !== csrfCookie) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }

    next();
  }
}



