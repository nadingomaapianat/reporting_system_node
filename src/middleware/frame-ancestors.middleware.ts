import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Clickjacking protection: module backend may only be embedded by the listed
 * parent origins. Sets Content-Security-Policy: frame-ancestors <list> on every
 * response. The list is built from (in order):
 *   1. FRAME_ANCESTORS (comma-separated list, takes precedence if set)
 *   2. IFRAME_MAIN_ORIGIN
 *   3. MAIN_APP_ORIGIN
 *   4. fallback: https://demo.pianat.ai
 */
function buildFrameAncestors(): string {
  const fromList = (process.env.FRAME_ANCESTORS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (fromList.length) return fromList.join(' ');

  const single = (
    process.env.IFRAME_MAIN_ORIGIN ||
    process.env.MAIN_APP_ORIGIN ||
    'https://demo.pianat.ai'
  )
    .trim()
    .replace(/\/+$/, '');

  return single;
}

const FRAME_ANCESTORS = buildFrameAncestors();

@Injectable()
export class FrameAncestorsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader('Content-Security-Policy', `frame-ancestors ${FRAME_ANCESTORS};`);
    next();
  }
}
