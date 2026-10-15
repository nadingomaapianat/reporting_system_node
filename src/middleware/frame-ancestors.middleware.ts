import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Clickjacking protection: module backend may only be embedded by the main app.
 * Sets Content-Security-Policy: frame-ancestors <main_origin> on all responses.
 * Bank-grade: no Referer-only validation; CSP is enforced by the browser.
 */
const FRAME_ANCESTORS_ORIGIN =
  process.env.IFRAME_MAIN_ORIGIN ||
  process.env.MAIN_APP_ORIGIN ||
  'https://dcc-grc.theubeg.ub.dom';

@Injectable()
export class FrameAncestorsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const origin = FRAME_ANCESTORS_ORIGIN.trim().replace(/\/+$/, '');
    // Helmet (main.ts) has already set a full policy: replace only its frame-ancestors
    // directive instead of discarding the rest of it.
    const existing = String(res.getHeader('Content-Security-Policy') ?? '');
    const others = existing
      .split(';')
      .map((d) => d.trim())
      .filter((d) => d && !/^frame-ancestors\b/i.test(d));
    res.setHeader('Content-Security-Policy', [...others, `frame-ancestors ${origin}`].join('; ') + ';');
    next();
  }
}
