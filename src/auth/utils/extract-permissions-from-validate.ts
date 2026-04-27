/**
 * Pull DCC-style permission rows from main backend `/entry/validate` JSON.
 * Shape varies by deployment (flat vs nested vs group catalog).
 */
export function extractPermissionsFromValidateBody(data: unknown): unknown[] | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  const fromObject = (obj: Record<string, unknown>): unknown[] | null =>
    pickNonEmptyArray(obj.permissions) ??
    pickNonEmptyArray(obj.group_permissions) ??
    pickNonEmptyArray(obj.user_permissions) ??
    pickNonEmptyArray(obj.pages) ??
    pickNonEmptyArray(obj.module_permissions) ??
    pickNonEmptyArray(obj.dcc_permissions);

  const direct = fromObject(d);
  if (direct) return direct;

  const user = d.user;
  if (user && typeof user === 'object') {
    const u = user as Record<string, unknown>;
    const fromUser = fromObject(u);
    if (fromUser) return fromUser;
  }

  const inner = d.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const fromData = fromObject(inner as Record<string, unknown>);
    if (fromData) return fromData;
    const g = (inner as Record<string, unknown>).group;
    if (g && typeof g === 'object') {
      const fromGroup = fromObject(g as Record<string, unknown>);
      if (fromGroup) return fromGroup;
    }
  }

  if (Array.isArray(inner)) {
    const groupId = firstDefined(d, ['group_id', 'groupId']);
    const groupName = firstDefined(d, ['group_name', 'groupName']);
    const userObj = d.user && typeof d.user === 'object' ? (d.user as Record<string, unknown>) : null;
    const groupIdU = groupId ?? (userObj ? firstDefined(userObj, ['group_id', 'groupId']) : undefined);
    const groupNameU = groupName ?? (userObj ? firstDefined(userObj, ['group_name', 'groupName']) : undefined);

    for (const item of inner) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const rid = firstDefined(row, ['group_id', 'groupId']);
      const rname = firstDefined(row, ['group_name', 'groupName']);
      const matchId =
        groupIdU !== undefined && rid !== undefined && String(rid) === String(groupIdU);
      const matchName =
        typeof groupNameU === 'string' &&
        typeof rname === 'string' &&
        rname.trim().toLowerCase() === String(groupNameU).trim().toLowerCase();
      if (matchId || matchName) {
        const perms = fromObject(row);
        if (perms) return perms;
      }
    }

    /** Only when validate did not send group id/name — avoid picking wrong row from catalog. */
    if (inner.length === 1 && groupIdU === undefined && groupNameU === undefined) {
      const only = inner[0];
      if (only && typeof only === 'object') {
        const perms = fromObject(only as Record<string, unknown>);
        if (perms) return perms;
      }
    }
  }

  return null;
}

function pickNonEmptyArray(v: unknown): unknown[] | null {
  return Array.isArray(v) && v.length > 0 ? v : null;
}

function firstDefined(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== null) {
      return obj[k];
    }
  }
  return undefined;
}
