import { Request } from 'express';

export type TokenSource =
  | 'authorization_bearer'
  | 'iframe_d_c_c_t_p'
  | 'iframe_d_c_c_t_p'
  | 'd_c_c_t_p'
  | 'none';

export interface CandidateToken {
  token: string;
  source: TokenSource;
}

/** Read split-cookie JWT (e.g. d_c_c_t_p_1 + d_c_c_t_p_2 + ...). */
function readSplitCookies(cookies: Record<string, string>, prefix: string): string | null {
  const parts: string[] = [];
  let i = 1;
  while (true) {
    const v = cookies[`${prefix}_${i}`];
    if (!v) break;
    parts.push(v);
    i++;
  }
  if (parts.length === 0) return null;
  try {
    return decodeURIComponent(parts.join(''));
  } catch {
    return null;
  }
}

/**
 * Return all candidate JWT strings from the request in priority order:
 *   1. iframe_d_c_c_t_p cookie (our own JWT, may have no permissions if dcc-backend didn't return them)
 *   2. Authorization: Bearer header (often iframe_d_c_c_t_p again, but handle as fallback)
 *   3. iframe_d_c_c_t_p_* split cookies (iframe-forwarded main app token)
 *   4. d_c_c_t_p_* split cookies (main app JWT – shared-domain cookie, has permissions)
 *
 * The caller should try each in order and prefer the first one that verifies AND has permissions.
 */
export function getCandidateTokens(req: Request): CandidateToken[] {
  const candidates: CandidateToken[] = [];
  const cookies: Record<string, string> = (req.cookies as Record<string, string>) || {};

  const reportingSingle = cookies['iframe_d_c_c_t_p'];
  const reportingSplit = readSplitCookies(cookies, 'iframe_d_c_c_t_p');
  const reportingToken = (reportingSingle && reportingSingle.trim()) || reportingSplit;
  if (reportingToken) {
    candidates.push({ token: reportingToken, source: 'iframe_d_c_c_t_p' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader) {
    const bearer = authHeader.split('Bearer ')[1]?.trim();
    if (bearer && bearer !== reportingToken) {
      candidates.push({ token: bearer, source: 'authorization_bearer' });
    }
  }

  const iframeToken = readSplitCookies(cookies, 'iframe_d_c_c_t_p');
  if (iframeToken) {
    candidates.push({ token: iframeToken, source: 'iframe_d_c_c_t_p' });
  }

  const mainToken = readSplitCookies(cookies, 'd_c_c_t_p');
  if (mainToken) {
    candidates.push({ token: mainToken, source: 'd_c_c_t_p' });
  }

  return candidates;
}

/**
 * Legacy single-token extraction for backwards-compatible callers.
 * Returns the first available token (no preference for permissions).
 */
export function getReportingJwtFromRequest(req: Request): string | null {
  const list = getCandidateTokens(req);
  return list[0]?.token ?? null;
}

/** Parse `iframe_d_c_c_t_p` (single or split `_1`, `_2`, …) from a raw `Cookie` header (Socket.IO). */
export function getReportingJwtFromCookieHeader(cookieHeader: string | undefined): string | null {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const single = cookieHeader.match(/(?:^|;\s*)iframe_d_c_c_t_p=([^;]+)/i);
  if (single?.[1]) {
    try {
      return decodeURIComponent(single[1].trim());
    } catch {
      return single[1].trim();
    }
  }
  const parts: string[] = [];
  for (let i = 1; i <= 32; i++) {
    const re = new RegExp(`(?:^|;)\\s*iframe_d_c_c_t_p_${i}=([^;]+)`, 'i');
    const m = cookieHeader.match(re);
    if (!m?.[1]) break;
    parts.push(m[1].trim());
  }
  if (parts.length === 0) return null;
  try {
    return decodeURIComponent(parts.join(''));
  } catch {
    return parts.join('');
  }
}
