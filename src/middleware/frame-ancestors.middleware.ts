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
  'http://localhost:5050';

@Injectable()
export class FrameAncestorsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const origin = FRAME_ANCESTORS_ORIGIN.trim().replace(/\/+$/, '');
    res.setHeader('Content-Security-Policy', `frame-ancestors ${origin};`);
    next();
  }
}
