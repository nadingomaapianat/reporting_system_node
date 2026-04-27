import { Request } from 'express';

export type TokenSource =
  | 'authorization_bearer'
  | 'reporting_node_token'
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
 *   1. reporting_node_token cookie (our own JWT, may have no permissions if dcc-backend didn't return them)
 *   2. Authorization: Bearer header (often reporting_node_token again, but handle as fallback)
 *   3. iframe_d_c_c_t_p_* split cookies (iframe-forwarded main app token)
 *   4. d_c_c_t_p_* split cookies (main app JWT – shared-domain cookie, has permissions)
 *
 * The caller should try each in order and prefer the first one that verifies AND has permissions.
 */
export function getCandidateTokens(req: Request): CandidateToken[] {
  const candidates: CandidateToken[] = [];
  const cookies: Record<string, string> = (req.cookies as Record<string, string>) || {};

  const reportingSingle = cookies['reporting_node_token'];
  const reportingSplit = readSplitCookies(cookies, 'reporting_node_token');
  const reportingToken = (reportingSingle && reportingSingle.trim()) || reportingSplit;
  if (reportingToken) {
    candidates.push({ token: reportingToken, source: 'reporting_node_token' });
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

/** Parse `reporting_node_token` from a raw `Cookie` header (Socket.IO handshake). */
export function getReportingJwtFromCookieHeader(cookieHeader: string | undefined): string | null {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const match = cookieHeader.match(/(?:^|;\s*)reporting_node_token=([^;]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return null;
  }
}
