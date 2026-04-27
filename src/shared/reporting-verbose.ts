/**
 * Enable extra diagnostics: set REPORTING_VERBOSE_LOG=1 (or true) in .env
 * Logs JWT candidate steps, IET HTTP details, cookie names on auth miss, etc.
 * Never log secrets (IET / JWT values).
 */
export function isReportingVerboseLog(): boolean {
  const v = (process.env.REPORTING_VERBOSE_LOG || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
