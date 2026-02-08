import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'GRC_ADIB_2025';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  // Paths that don't require authentication
  private readonly publicPaths = [
    '/csrf/token',
    '/api/auth/validate-token',
    '/api/auth/entry-token',
    '/docs',
    '/swagger',
  ];

  /**
   * Get token from: (1) Authorization Bearer, (2) reporting_node_token cookie, (3) iframe_d_c_c_t_p_1 + iframe_d_c_c_t_p_2 cookies.
   * Iframe token is handled only in reporting backend (not in main backend).
   */
  private getTokenFromRequest(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const bearer = authHeader.split('Bearer ')[1];
      if (bearer) return bearer;
    }

    const reportingToken = req.cookies?.['reporting_node_token'];
    if (reportingToken) return reportingToken;

    const iframePart1 = req.cookies?.['iframe_d_c_c_t_p_1'];
    const iframePart2 = req.cookies?.['iframe_d_c_c_t_p_2'];
    if (iframePart1) {
      const encoded = `${iframePart1}${iframePart2 || ''}`;
      if (encoded) {
        try {
          return decodeURIComponent(encoded);
        } catch {
          // invalid encoding
        }
      }
    }

    return null;
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Skip authentication for public paths
    if (this.publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const token = this.getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token is missing (use Bearer header or reporting_node_token / iframe_d_c_c_t_p_* cookies)',
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      (req as any).user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  }
}


