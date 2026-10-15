/**
 * Central JWT signing / verification secret: `JWT_SECRET` or `JWT_SECRET_KEY`, always
 * required. There is no built-in fallback — a default written in the source is public, and
 * anyone holding it could sign admin tokens. AuthModule calls this at startup, so a missing
 * secret stops the service from booting instead of running with a known key.
 */
export function getJwtSecret(): string {
  const fromEnv = (process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || '').trim();
  if (!fromEnv) {
    throw new Error('JWT_SECRET (or JWT_SECRET_KEY) must be set');
  }
  return fromEnv;
}
