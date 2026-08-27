/**
 * Required environment variables — fail fast, never fall back to a host.
 *
 * Hardcoded host fallbacks are what let this service run pointed at another
 * deployment's hostnames while looking perfectly healthy: a missing variable
 * produced a plausible-but-wrong config instead of an error. Every deployment
 * URL must come from .env, and an unset one must stop the process at boot with
 * the variable's name, not degrade into a silent misconfiguration.
 *
 * Safe to call at module scope: src/main.ts and src/app.module.ts both load
 * `dotenv/config` as their first import, so process.env is populated before any
 * module body here runs.
 */
export function requireEnv(name: string, ...aliases: string[]): string {
  for (const key of [name, ...aliases]) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim().replace(/\/+$/, '');
  }
  throw new Error(
    `Missing required environment variable: ${[name, ...aliases].join(' or ')}. ` +
      `Set it in .env — this service has no hardcoded fallback host by design.`,
  );
}

/**
 * Same, but for values that are genuinely optional. Returns undefined rather
 * than throwing, so callers can decide. Still normalises the trailing slash.
 */
export function optionalEnv(name: string, ...aliases: string[]): string | undefined {
  for (const key of [name, ...aliases]) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim().replace(/\/+$/, '');
  }
  return undefined;
}
