/**
 * Query param: orderByFunction=1 | true (alias: orderByFunctionAsc)
 * Used with dashboard and paginated list APIs so exports and UI share the same ordering.
 */

export function orderByFunctionFromRequest(req: { query?: Record<string, unknown> } | undefined): boolean {
  if (!req?.query) return false;
  const v = req.query['orderByFunction'] ?? req.query['orderByFunctionAsc'];
  if (v === true || v === 1) return true;
  const s = String(v ?? '').toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

function getSortKey(row: Record<string, unknown>): string {
  const keys = [
    'function_name',
    'functionName',
    'function',
    'Function',
    'incident_department',
    'department',
    'Department',
    'function_id',
    'functionId',
    'Functionn',
    'FunctionID',
    'name',
  ];
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

export function sortRowsByFunctionAsc<T extends Record<string, unknown>>(rows: T[]): T[] {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  return [...rows].sort((a, b) =>
    getSortKey(a).localeCompare(getSortKey(b), undefined, { sensitivity: 'base', numeric: true }),
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && Object.prototype.toString.call(v) === '[object Object]';
}

/**
 * Recursively walk JSON-like structures and sort arrays of plain objects by function/name keys.
 */
export function applyOrderByFunctionDeep<T>(input: T): T {
  if (input === null || input === undefined) return input;
  const walk = (val: unknown): unknown => {
    if (val === null || typeof val !== 'object') return val;
    if (Array.isArray(val)) {
      const inner = val.map(walk);
      if (inner.length > 0 && inner.every((x) => isPlainObject(x))) {
        return sortRowsByFunctionAsc(inner as Record<string, unknown>[]);
      }
      return inner;
    }
    if (isPlainObject(val)) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(val)) {
        out[k] = walk(val[k]);
      }
      return out;
    }
    return val;
  };
  return walk(JSON.parse(JSON.stringify(input))) as T;
}

export function sortPaginatedResponseIfNeeded<T extends { data?: unknown[] }>(result: T, enabled: boolean): T {
  if (!enabled || !result?.data || !Array.isArray(result.data)) return result;
  return {
    ...result,
    data: sortRowsByFunctionAsc(result.data as Record<string, unknown>[]),
  } as T;
}
