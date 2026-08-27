import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { requireEnv } from '../shared/required-env';

/**
 * Clickjacking protection: module backend may only be embedded by the main app.
 * Sets Content-Security-Policy: frame-ancestors <main_origin> on all responses.
 * Bank-grade: no Referer-only validation; CSP is enforced by the browser.
 */
@Injectable()
export class FrameAncestorsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const origin = requireEnv('IFRAME_MAIN_ORIGIN', 'MAIN_APP_ORIGIN');
    res.setHeader('Content-Security-Policy', `frame-ancestors ${origin};`);
    next();
  }
}
