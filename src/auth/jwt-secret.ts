/**
 * Central JWT signing / verification secret.
 * - Production: `JWT_SECRET` or `JWT_SECRET_KEY` is mandatory.
 * - Non-production: falls back to a fixed dev secret only if unset (local setups).
 */
export function getJwtSecret(): string {
  const fromEnv = (process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || '').trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET or JWT_SECRET_KEY must be set when NODE_ENV=production');
  }
  return 'GRC_ADIB_2025';
}
