import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  // Paths that don't require authentication
  private readonly publicPaths = [
    '/csrf/token',
    '/api/auth/validate-token',
    '/docs',
    '/swagger',
  ];

  use(req: Request, res: Response, next: NextFunction) {
    // Skip authentication for public paths
    if (this.publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        message: 'Authorization header is missing' 
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Bearer token is missing' 
      });
    }

    try {
      const decoded = jwt.verify(token, 'GRC_ADIB_2025');
      (req as any).user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token' 
      });
    }
  }
}

