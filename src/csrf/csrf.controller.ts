import { Controller, Get, Options, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { CsrfService } from './csrf.service';

@Controller('csrf')
export class CsrfController {
  // Allowed origins for CSRF token requests (frontend only)
  private readonly allowedOrigins = [
    'https://fawry-reporting.comply.now',
    'https://fawry.comply.now',
    'https://reporting-system-frontend.pianat.ai',
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4200',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    // Add environment variable support
    ...(process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || []),
  ];
  
  private isOriginAllowed(originUrl: string): boolean {
    try {
      // Check exact matches first
      if (this.allowedOrigins.includes(originUrl)) {
        return true;
      }
      
      // Check wildcard patterns (e.g., *.comply.now matches any subdomain)
      for (const allowed of this.allowedOrigins) {
        if (allowed.includes('*')) {
          try {
            const pattern = allowed.replace(/\*/g, '.*');
            const regex = new RegExp(`^${pattern}$`);
            if (regex.test(originUrl)) {
              return true;
            }
          } catch (regexError) {
            console.warn(`[CSRF] Invalid wildcard pattern: ${allowed}`, regexError);
            // Continue to next pattern
          }
        }
      }
      
      // For production, also allow any origin that matches the backend's domain pattern
      // This handles cases where frontend and backend are on different subdomains
      const backendHost = process.env.BACKEND_HOST || 'backendnode-fawry-reporting.comply.now';
      const backendDomain = backendHost.includes('.') 
        ? '.' + backendHost.split('.').slice(-2).join('.') // e.g., .comply.now
        : null;
      
      if (backendDomain && originUrl.includes(backendDomain.replace('.', ''))) {
        // Allow any subdomain of the same parent domain (e.g., *.comply.now)
        try {
          const originDomain = originUrl.split('://')[1]?.split('/')[0];
          if (originDomain && originDomain.endsWith(backendDomain)) {
            console.log(`[CSRF] Allowing origin ${originUrl} based on domain pattern ${backendDomain}`);
            return true;
          }
        } catch (parseError) {
          console.warn(`[CSRF] Error parsing origin URL: ${originUrl}`, parseError);
          // Continue to return false
        }
      }
      
      return false;
    } catch (error: any) {
      console.error(`[CSRF] Error in isOriginAllowed for ${originUrl}:`, error);
      // Fail securely - deny access on error
      return false;
    }
  }

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
    try {
      console.log('[CSRF] GET request received - Method:', req.method);
      console.log('[CSRF] Request URL:', req.url);
      console.log('[CSRF] Request protocol:', req.protocol);
      console.log('[CSRF] Request host:', req.get('host'));
      console.log('[CSRF] X-Forwarded-Proto:', req.get('x-forwarded-proto'));
      
      // STRICT: Require Origin header for browser requests
      // Allow server-side requests (no Origin) - these are from Next.js API routes
      const origin = req.headers.origin;
      const referer = req.headers.referer;
      const userAgent = req.headers['user-agent'] || '';
      
      console.log(`[CSRF] Token request received - Origin: ${origin}, Referer: ${referer}`);
      console.log(`[CSRF] User-Agent: ${userAgent}`);
      console.log(`[CSRF] Allowed origins: ${this.allowedOrigins.join(', ')}`);
      console.log(`[CSRF] Cookies present:`, req.cookies ? Object.keys(req.cookies) : 'none');
      
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
        } catch (error: any) {
          // Invalid referer URL, ignore
          console.warn(`[CSRF] Invalid Referer URL: ${referer}`, error?.message || error);
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
        return res.status(401).json({ message: 'Origin header required for browser requests' });
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
          return res.status(401).json({ message: 'Origin header required for browser requests' });
        }
        
        const isAllowed = this.isOriginAllowed(originUrl);

        if (!isAllowed) {
          console.warn(`[CSRF] Blocked CSRF token request from unauthorized origin: ${originUrl}`);
          console.warn(`[CSRF] Allowed origins: ${this.allowedOrigins.join(', ')}`);
          console.warn(`[CSRF] Request details: IP=${req.ip}, User-Agent=${userAgent || 'MISSING'}`);
          console.warn(`[CSRF] Backend host: ${process.env.BACKEND_HOST || 'not set'}`);
          return res.status(401).json({ 
            message: 'Origin not allowed',
            receivedOrigin: originUrl,
            allowedOrigins: this.allowedOrigins
          });
        }
        
        console.log(`[CSRF] ✓ Allowed CSRF token request from origin: ${originUrl}`);
      }

      // Safely access cookies (cookie-parser middleware should populate this)
      const cookies = req.cookies || {};
      let csrfToken = cookies.csrfToken;

      if (!csrfToken) {
        try {
          csrfToken = this.csrfService.generateToken();
        } catch (generateError: any) {
          console.error('[CSRF] Error generating token:', generateError);
          throw new Error(`Failed to generate CSRF token: ${generateError?.message || 'Unknown error'}`);
        }
        
        try {
          // Determine if this is a cross-origin request
          const host = req.get('host') || '';
          const currentOrigin = host ? `${req.protocol}://${host}` : null;
          const isCrossOrigin = originUrl && currentOrigin && originUrl !== currentOrigin;
          const isHttps = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https';
          
          // For cross-origin requests, use sameSite: 'none' and secure: true
          // For same-origin, use sameSite: 'strict' for better security
          // Note: sameSite: 'none' REQUIRES secure: true
          const isSecure = isHttps || process.env.NODE_ENV === 'production';
          const sameSiteValue = isCrossOrigin ? 'none' : 'strict';
          
          // If sameSite is 'none', secure MUST be true
          const finalSecure = sameSiteValue === 'none' ? true : isSecure;
          
          const cookieOptions: any = {
            httpOnly: true,
            path: '/',
            secure: finalSecure,
            sameSite: sameSiteValue as 'none' | 'strict' | 'lax',
          };
          
          // Set domain for shared cookies if needed (e.g., .comply.now)
          // Validate cookie domain format before setting
          const cookieDomain = process.env.COOKIE_DOMAIN;
          if (cookieDomain && !cookieDomain.includes('localhost') && !cookieDomain.includes('127.0.0.1')) {
            // Validate domain format (should start with . for subdomain sharing, or be a valid domain)
            if (cookieDomain.startsWith('.') || /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(cookieDomain)) {
              cookieOptions.domain = cookieDomain;
            } else {
              console.warn(`[CSRF] Invalid COOKIE_DOMAIN format: ${cookieDomain}, skipping domain setting`);
            }
          }
          
          res.cookie('csrfToken', csrfToken, cookieOptions);
          console.log(`[CSRF] Generated new CSRF token (length: ${csrfToken.length}), sameSite: ${cookieOptions.sameSite}, secure: ${cookieOptions.secure}, domain: ${cookieOptions.domain || 'not set'}`);
        } catch (cookieError: any) {
          console.error('[CSRF] Error setting cookie:', cookieError);
          console.error('[CSRF] Cookie error details:', {
            message: cookieError?.message,
            stack: cookieError?.stack,
            cookieOptions: cookieError?.cookieOptions
          });
          // Continue anyway - token is still returned in response body
          // This allows the request to succeed even if cookie setting fails
        }
      } else {
        console.log(`[CSRF] Using existing CSRF token from cookie (length: ${csrfToken.length})`);
      }

      console.log(`[CSRF] ✓ Returning CSRF token to ${isServerSideRequest ? 'server-side' : 'browser'} request`);
      return res.status(200).json({ csrfToken });
    } catch (error: any) {
      console.error('[CSRF] Unexpected error in getToken:', error);
      console.error('[CSRF] Error name:', error?.name);
      console.error('[CSRF] Error message:', error?.message);
      console.error('[CSRF] Error stack:', error?.stack);
      console.error('[CSRF] Request details:', {
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
        referer: req.headers.referer,
        host: req.get('host'),
        protocol: req.protocol,
        xForwardedProto: req.get('x-forwarded-proto'),
      });
      
      // For unexpected errors, return 500 with error message
      return res.status(500).json({ 
        message: 'Failed to generate CSRF token',
        error: error?.message || 'Unknown error',
        errorName: error?.name || 'Error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      });
    }
  }
}

