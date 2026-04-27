import type { ReportingJwtSource } from './extract-token';

/** Safe for logs: no secrets, no full permission rows, no raw JWT. */
export function buildReportingJwtDebugSnapshot(
  decoded: unknown,
  jwtSource: ReportingJwtSource,
): Record<string, unknown> {
  const keys =
    decoded && typeof decoded === 'object' ? Object.keys(decoded as Record<string, unknown>).sort() : [];
  const d = decoded && typeof decoded === 'object' ? (decoded as Record<string, unknown>) : {};
  const perms = d.permissions;
  const permissions_is_non_empty_array = Array.isArray(perms) && perms.length > 0;
  return {
    jwt_source: jwtSource,
    claim_keys: keys,
    user_sub: d.id ?? d.sub ?? d.user_id ?? null,
    exp: d.exp ?? null,
    permissions_type: perms === undefined ? 'undefined' : Array.isArray(perms) ? 'array' : typeof perms,
    permissions_length: Array.isArray(perms) ? perms.length : null,
    permissions_is_non_empty_array,
  };
}
