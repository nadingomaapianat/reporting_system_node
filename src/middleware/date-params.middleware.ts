import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/** Query parameters the dashboard services write into SQL date comparisons. */
const DATE_PARAMS = ['startDate', 'endDate'];

/**
 * YYYY-MM-DD, optionally with a time and zone (what <input type="date"> and toISOString send).
 * The allowed characters can never close a SQL string literal.
 */
const DATE_VALUE = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,7})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Rejects malformed startDate / endDate before any controller runs. Many GRC queries put these
 * values straight into the SQL text, so a value that is not a plain date is refused with 400
 * here instead of in each of those queries. Valid dates pass through unchanged.
 */
@Injectable()
export class DateParamsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    for (const name of DATE_PARAMS) {
      const raw = (req.query as Record<string, unknown>)[name];
      if (raw === undefined) continue;
      const values = Array.isArray(raw) ? raw : [raw];
      for (const value of values) {
        const text = typeof value === 'string' ? value.trim() : value;
        if (text === '') continue;
        if (typeof text !== 'string' || !DATE_VALUE.test(text)) {
          res.status(400).json({ statusCode: 400, error: 'BAD_REQUEST', message: `Invalid ${name}` });
          return;
        }
      }
    }
    next();
  }
}
