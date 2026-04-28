import type { Response } from 'express';

/** Must match chunking in auth.controller / extract-token split readers. */
export const REPORTING_AUTH_COOKIE_MAX_PARTS = 16;

const REPORTING_COOKIE = 'reporting_node_token';

const SPLIT_PREFIXES = ['iframe_d_c_c_t_p', 'd_c_c_t_p'] as const;

export function getReportingAuthCookieClearOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  maxAge: number;
  path: string;
  domain?: string;
} {
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  };
}

/**
 * Clears every HttpOnly JWT cookie this stack may set or read on the reporting host
 * (`extract-token.ts`): reporting token, iframe-forwarded main token, main split token.
 * Use on logout, before minting a new reporting session, and when JWT validation fails.
 */
export function clearReportingAuthCookies(res: Response): void {
  const opts = getReportingAuthCookieClearOptions();
  res.cookie(REPORTING_COOKIE, '', opts);
  for (let i = 1; i <= REPORTING_AUTH_COOKIE_MAX_PARTS; i++) {
    res.cookie(`${REPORTING_COOKIE}_${i}`, '', opts);
  }
  for (const prefix of SPLIT_PREFIXES) {
    for (let i = 1; i <= REPORTING_AUTH_COOKIE_MAX_PARTS; i++) {
      res.cookie(`${prefix}_${i}`, '', opts);
    }
  }
}
