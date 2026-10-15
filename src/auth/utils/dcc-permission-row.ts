/**
 * Subset of DCC permission rows embedded in JWT (`user.permissions`).
 * Matches how `PermissionsGuard` and ICR hydration interpret the payload.
 */
export type DccPermissionRow = {
  page?: string;
  show?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  Reviewe?: boolean;
  'First Approval'?: boolean;
  'Second Approval'?: boolean;
};

/** Same page resolution as `PermissionsGuard` (exact match or comma-separated `page`). */
export function findDccPermissionRow(rows: unknown, page: string): DccPermissionRow | undefined {
  if (!Array.isArray(rows) || typeof page !== 'string' || page.length === 0) {
    return undefined;
  }
  for (const p of rows) {
    if (!p || typeof p !== 'object') continue;
    const row = p as DccPermissionRow;
    if (row.page === page) return row;
    if (typeof row.page === 'string') {
      const pages = row.page.split(',').map((x: string) => x.trim());
      if (pages.includes(page)) return row;
    }
  }
  return undefined;
}

export function dccRowSatisfiesActions(
  row: DccPermissionRow | undefined,
  actions: string[],
  requireAll: boolean,
): boolean {
  if (!row || actions.length === 0) return false;
  const flags = row as Record<string, unknown>;
  const ok = (action: string) =>
    flags[action] === true ||
    // The main backend folded 'First Approval'/'Second Approval' into one 'approve' column
    // (group/page-catalog.ts); rows saved before or after that change both count.
    (APPROVAL_ACTIONS.includes(action) && APPROVAL_ACTIONS.some((a) => flags[a] === true));
  return requireAll ? actions.every(ok) : actions.some(ok);
}

const APPROVAL_ACTIONS = ['approve', 'First Approval', 'Second Approval'];
