/**
 * Super-admin group matching, identical to the main backend's groupHasRole
 * (new_adib_backend/src/auth/admin-groups.ts): the role's words must appear consecutively
 * once the group name is split on _, space or -. So "super_admin_", "Super Admin" and
 * future variants like "branch_super_admin_" all match, with no code change — and the
 * rule is the same across DCC, reporting Node and reporting Python.
 */
export function groupHasRole(groupName: string | null | undefined, roleWords: string): boolean {
  const words = String(groupName ?? '').toLowerCase().split(/[_\s-]+/).filter(Boolean);
  const wanted = String(roleWords).toLowerCase().split(/[_\s-]+/).filter(Boolean);
  if (!words.length || !wanted.length) return false;
  for (let i = 0; i + wanted.length <= words.length; i++) {
    if (wanted.every((w, j) => words[i + j] === w)) return true;
  }
  return false;
}

export function isSuperAdminGroup(groupName: string | null | undefined): boolean {
  return groupHasRole(groupName, 'super_admin');
}
