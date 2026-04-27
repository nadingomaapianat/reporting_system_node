/**
 * Main / DCC backend base URL used for IET → `POST …/entry/validate`.
 * Must be the same deployment that creates IET rows and marks them used.
 */
export const DEFAULT_MAIN_BACKEND_URL = 'https://dcc-backend.pianat.ai';

export function getResolvedMainBackendUrl(): string {
  const fromEnv = process.env.MAIN_BACKEND_URL?.trim() || process.env.NEXT_PUBLIC_NODE_API_URL?.trim();
  return fromEnv || DEFAULT_MAIN_BACKEND_URL;
}

/** True when no MAIN_BACKEND_URL / NEXT_PUBLIC_NODE_API_URL was set (fell back to default). */
export function isImplicitMainBackendUrl(): boolean {
  return !process.env.MAIN_BACKEND_URL?.trim() && !process.env.NEXT_PUBLIC_NODE_API_URL?.trim();
}
