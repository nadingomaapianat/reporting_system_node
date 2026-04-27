import { Request } from 'express';

/**
 * Same cookie/header rules as HTTP `JwtAuthGuard` (keep in sync for Socket.IO handshake).
 *
 * Order: `reporting_node_token` (entry-token JWT, should embed DCC `permissions`) → `Authorization: Bearer` →
 * `iframe_d_c_c_t_p_*` (often main-app JWT without reporting permissions — last resort).
 */
export function getReportingJwtFromRequest(req: Request): string | null {
  const reportingToken = req.cookies?.['reporting_node_token'];
  if (reportingToken) return reportingToken;

  const authHeader = req.headers.authorization;
  if (authHeader) {
    const bearer = authHeader.split('Bearer ')[1];
    if (bearer) return bearer.trim();
  }

  const iframePart1 = req.cookies?.['iframe_d_c_c_t_p_1'];
  const iframePart2 = req.cookies?.['iframe_d_c_c_t_p_2'];
  if (iframePart1) {
    const encoded = `${iframePart1}${iframePart2 || ''}`;
    try {
      return decodeURIComponent(encoded);
    } catch {
      return null;
    }
  }

  return null;
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
