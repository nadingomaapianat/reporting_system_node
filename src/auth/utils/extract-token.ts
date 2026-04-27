import { Request } from 'express';

/** Where the reporting API took the JWT from (for diagnostics). */
export type ReportingJwtSource =
  | 'reporting_node_token'
  | 'iframe_cookie'
  | 'authorization_bearer'
  | 'none';

/**
 * Same cookie/header rules as HTTP `JwtAuthGuard` (keep in sync for Socket.IO handshake).
 *
 * Prefer `reporting_node_token` (IET exchange JWT with embedded DCC `permissions`) over
 * `Authorization: Bearer …`, which is often the main-app JWT and does not include `permissions`.
 */
export function getReportingJwtFromRequestMeta(req: Request): { token: string | null; source: ReportingJwtSource } {
  const reportingToken = req.cookies?.['reporting_node_token'];
  if (reportingToken) return { token: reportingToken, source: 'reporting_node_token' };

  const iframePart1 = req.cookies?.['iframe_d_c_c_t_p_1'];
  const iframePart2 = req.cookies?.['iframe_d_c_c_t_p_2'];
  if (iframePart1) {
    const encoded = `${iframePart1}${iframePart2 || ''}`;
    try {
      return { token: decodeURIComponent(encoded), source: 'iframe_cookie' };
    } catch {
      return { token: null, source: 'none' };
    }
  }

  const authHeader = req.headers.authorization;
  if (authHeader) {
    const bearer = authHeader.split('Bearer ')[1];
    if (bearer) return { token: bearer.trim(), source: 'authorization_bearer' };
  }

  return { token: null, source: 'none' };
}

export function getReportingJwtFromRequest(req: Request): string | null {
  return getReportingJwtFromRequestMeta(req).token;
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
