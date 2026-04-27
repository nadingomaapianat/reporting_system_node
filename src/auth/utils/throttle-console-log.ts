/** Avoid flooding logs when every tab hits the same failing JWT state. */
const last = new Map<string, number>();

/** @returns true if this log line should be skipped (still within cooldown). */
export function isLogThrottled(key: string, cooldownMs: number): boolean {
  const now = Date.now();
  const prev = last.get(key) ?? 0;
  if (now - prev < cooldownMs) return true;
  last.set(key, now);
  return false;
}
