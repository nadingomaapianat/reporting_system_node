/**
 * Parse GRC dashboard function filter from query string.
 * - functionIds: comma-separated list (preferred for multi-select)
 * - functionId: single id (backward compatible); may appear multiple times in some clients
 */
export function parseGrcFunctionIdsFromQueries(
  functionId?: string | string[],
  functionIds?: string,
): string[] | undefined {
  const norm = (s: string) => s.replace(/\+/g, ' ').trim().replace(/\s+/g, ' ');

  if (functionIds != null && String(functionIds).trim() !== '') {
    const parts = String(functionIds)
      .split(',')
      .map((p) => norm(p))
      .filter(Boolean);
    const u = [...new Set(parts)];
    return u.length ? u : undefined;
  }

  if (Array.isArray(functionId)) {
    const flat = functionId
      .flatMap((x) => String(x).split(','))
      .map((p) => norm(p))
      .filter(Boolean);
    const u = [...new Set(flat)];
    return u.length ? u : undefined;
  }

  if (functionId != null && String(functionId).trim() !== '') {
    return [norm(String(functionId))];
  }

  return undefined;
}
