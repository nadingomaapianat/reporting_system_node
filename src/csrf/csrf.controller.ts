import { Controller, Get, Options, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { CsrfService } from './csrf.service';

@Controller('csrf')
export class CsrfController {
  // Allowed origins for CSRF token requests (frontend only)
  private readonly allowedOrigins = [
    'https://reporting-system-frontend.pianat.ai',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:4200',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    // Add environment variable support
    ...(process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || []),
  ];

  constructor(private readonly csrfService: CsrfService) {}

  @Options('token')
  handleOptions(@Req() req: Request, @Res() res: Response) {
    // Handle OPTIONS preflight request
    console.log('[CSRF] OPTIONS preflight request received');
    console.log('[CSRF] Origin:', req.headers.origin);
    // CORS middleware will handle the response, just return 204
    return res.status(204).send();
  }

  @Get('token')
  getToken(@Req() req: Request, @Res() res: Response) {
    console.log('[CSRF] GET request received - Method:', req.method);
    // STRICT: Require Origin header for browser requests
    // Allow server-side requests (no Origin) - these are from Next.js API routes
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const userAgent = req.headers['user-agent'] || '';
    
    console.log(`[CSRF] Token request received - Origin: ${origin}, Referer: ${referer}`);
    console.log(`[CSRF] User-Agent: ${userAgent}`);
    console.log(`[CSRF] Allowed origins: ${this.allowedOrigins.join(', ')}`);
    
    // Extract origin from referer if origin header is not present
    let originUrl: string | null = null;
    if (origin) {
      originUrl = origin;
      console.log(`[CSRF] Using Origin header: ${originUrl}`);
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        originUrl = refererUrl.origin;
        console.log(`[CSRF] Extracted origin from Referer: ${originUrl}`);
      } catch {
        // Invalid referer URL, ignore
        console.warn(`[CSRF] Invalid Referer URL: ${referer}`);
      }
    }
    
    // SECURITY: Require origin for browser requests
    // Allow server-side requests (no Origin) - these are from Next.js API routes
    // Server-side requests typically have no Origin header and may have Node.js in User-Agent or empty User-Agent
    // If there's no Origin and no Referer, it's likely a server-side request (browsers always send Origin for cross-origin)
    const isServerSideRequest = !origin && !referer;
    
    if (!originUrl && !isServerSideRequest) {
      console.warn(`[CSRF] Blocked CSRF token request: Missing Origin/Referer header (not server-side)`);
      console.warn(`[CSRF] Request details: IP=${req.ip}, User-Agent=${userAgent}`);
      console.warn(`[CSRF] All headers:`, Object.keys(req.headers));
      throw new UnauthorizedException('Origin header required for browser requests');
    }
    
    if (isServerSideRequest) {
      console.log(`[CSRF] ✓ Allowing server-side request (no Origin header)`);
      console.log(`[CSRF] Server-side indicators: User-Agent=${userAgent || 'MISSING'}, IP=${req.ip}`);
      // Skip origin validation for server-side requests - proceed directly to token generation
    } else {
      // Validate origin against allowed list for browser requests only
      if (!originUrl) {
        console.warn(`[CSRF] Blocked CSRF token request: Missing Origin/Referer header`);
        console.warn(`[CSRF] Request details: IP=${req.ip}, User-Agent=${userAgent || 'MISSING'}`);
        throw new UnauthorizedException('Origin header required for browser requests');
      }
      
      const isAllowed = this.allowedOrigins.some(allowed => {
        // Exact match
        if (originUrl === allowed) {
          console.log(`[CSRF] Origin matched exactly: ${originUrl} === ${allowed}`);
          return true;
        }
        // Support wildcard subdomains (e.g., *.pianat.ai)
        if (allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          const matches = regex.test(originUrl);
          if (matches) {
            console.log(`[CSRF] Origin matched pattern: ${originUrl} matches ${allowed}`);
          }
          return matches;
        }
        return false;
      });

      if (!isAllowed) {
        console.warn(`[CSRF] Blocked CSRF token request from unauthorized origin: ${originUrl}`);
        console.warn(`[CSRF] Allowed origins: ${this.allowedOrigins.join(', ')}`);
        console.warn(`[CSRF] Request details: IP=${req.ip}, User-Agent=${userAgent || 'MISSING'}`);
        throw new UnauthorizedException('Origin not allowed');
      }
      
      console.log(`[CSRF] ✓ Allowed CSRF token request from origin: ${originUrl}`);
    }

    let csrfToken = req.cookies?.csrfToken;

    if (!csrfToken) {
      csrfToken = this.csrfService.generateToken();
      res.cookie('csrfToken', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      console.log(`[CSRF] Generated new CSRF token (length: ${csrfToken.length})`);
    } else {
      console.log(`[CSRF] Using existing CSRF token from cookie (length: ${csrfToken.length})`);
    }

    console.log(`[CSRF] ✓ Returning CSRF token to ${isServerSideRequest ? 'server-side' : 'browser'} request`);
    return res.status(200).json({ csrfToken });
  }
}

