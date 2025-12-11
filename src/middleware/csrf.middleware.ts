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
    // Check both uppercase and lowercase header names (some clients send different cases)
    const csrfHeader = req.headers['x-csrf-token'] || req.headers['X-CSRF-TOKEN'] || req.headers['csrf-token'] || req.headers['CSRF-Token'];

    // Log all cookies for debugging
    const allCookies = req.cookies ? Object.keys(req.cookies) : [];
    console.log('[CsrfMiddleware] Checking CSRF', {
      path: req.path,
      hasCookie: !!csrfCookie,
      hasHeader: !!csrfHeader,
      allCookies: allCookies,
      cookieNames: allCookies,
    });

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      const errorDetails = {
        path: req.path,
        method: req.method,
        origin: req.headers.origin,
        hasCookie: !!csrfCookie,
        hasHeader: !!csrfHeader,
        cookieValue: csrfCookie ? csrfCookie.substring(0, 10) + '...' : null,
        headerValue: csrfHeader ? (typeof csrfHeader === 'string' ? csrfHeader.substring(0, 10) + '...' : 'not-string') : null,
        allCookies: allCookies,
        csrfHeaders: Object.keys(req.headers).filter(h => h.toLowerCase().includes('csrf')),
        cookieHeader: req.headers.cookie ? req.headers.cookie.substring(0, 100) + '...' : 'no cookie header'
      };
      
      console.warn('[CsrfMiddleware] CSRF validation failed', errorDetails);
      
      // Provide more specific error message
      if (!csrfCookie && !csrfHeader) {
        return res.status(403).json({ 
          message: 'CSRF token missing: Both cookie and header are missing. Please fetch /csrf/token first.',
          details: 'No CSRF cookie or header found'
        });
      } else if (!csrfCookie) {
        return res.status(403).json({ 
          message: 'CSRF token missing: Cookie not found. Please fetch /csrf/token first.',
          details: 'CSRF cookie missing'
        });
      } else if (!csrfHeader) {
        return res.status(403).json({ 
          message: 'CSRF token missing: Header not found. Please include x-csrf-token header.',
          details: 'CSRF header missing'
        });
      } else {
        return res.status(403).json({ 
          message: 'CSRF token mismatch: Cookie and header do not match.',
          details: 'CSRF token mismatch'
        });
      }
    }
    
    console.log('[CsrfMiddleware] ✓ CSRF validation passed');

    return next();
  }
}

