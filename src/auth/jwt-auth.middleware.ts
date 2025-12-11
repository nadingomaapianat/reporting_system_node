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
      // Try to verify token (will throw if expired or invalid)
      const decoded = jwt.verify(token, 'GRC_ADIB_2025');
      (req as any).user = decoded;
      next();
    } catch (error: any) {
      // If token is expired, check if it's only slightly expired (clock skew tolerance)
      if (error.name === 'TokenExpiredError') {
        // Decode without verification to check expiration time
        const decodedWithoutVerify = jwt.decode(token) as any;
        
        if (!decodedWithoutVerify) {
          return res.status(401).json({ 
            success: false,
            message: 'Token has expired and cannot be decoded' 
          });
        }
        
        // Check if token expired recently (within 5 minutes) - might be clock skew
        const expirationTime = decodedWithoutVerify.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const expiredBy = now - expirationTime;
        const fiveMinutes = 5 * 60 * 1000;
        
        if (expiredBy > fiveMinutes) {
          // Token expired more than 5 minutes ago - reject it
          console.log(`[JwtAuthMiddleware] Token expired ${Math.round(expiredBy / 1000 / 60)} minutes ago, rejecting`);
          return res.status(401).json({ 
            success: false,
            message: 'Token has expired' 
          });
        } else {
          // Token expired recently (within 5 minutes) - might be clock skew
          // Verify signature but ignore expiration (using verify with ignoreExpiration option)
          try {
            const decoded = jwt.verify(token, 'GRC_ADIB_2025', { ignoreExpiration: true });
            (req as any).user = decoded;
            console.log(`[JwtAuthMiddleware] Token expired ${Math.round(expiredBy / 1000)} seconds ago (within grace period), allowing`);
            next();
          } catch (sigError: any) {
            // Signature verification failed - reject
            return res.status(401).json({ 
              success: false,
              message: 'Token signature is invalid' 
            });
          }
        }
      } else {
        // Other JWT errors - reject
        return res.status(401).json({ 
          success: false,
          message: 'Invalid or expired token' 
        });
      }
    }
  }
}


