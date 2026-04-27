import { Injectable } from '@nestjs/common';

/**
 * Resolves DCC-style `GET /groups/permissions?page=…` for the reporting frontend header,
 * using the same JWT payload the app already trusts (no second HTTP hop to main backend).
 *
 * Uses `user.permissions` (array from IET / main) and the row for `page` (same matching as PermissionsGuard).
 * If there is no row for the page, or no non-empty `permissions` array, `show` is false for that tab.
 */
@Injectable()
export class GroupPermissionsService {
  /**
   * Shape matches what `reporting_system_frontend2` Header expects:
   * `{ success: true, permissions: { show, page?, … } }`
   */
  resolveForPage(user: unknown, page: string): { success: boolean; permissions?: Record<string, unknown>; message?: string } {
    if (!user || typeof user !== 'object') {
      return { success: false, message: 'Unauthorized' };
    }

    const u = user as Record<string, unknown>;
    const row = this.findPermissionRow(u, page);
    if (row) {
      return {
        success: true,
        permissions: this.normalizePermissionRow(row, page),
      };
    }

    return {
      success: true,
      permissions: { page, show: false },
    };
  }

  private findPermissionRow(user: Record<string, unknown>, page: string): Record<string, unknown> | null {
    const perms = user.permissions;
    if (!Array.isArray(perms)) return null;

    const pagePermissions = perms.find((p: unknown) => {
      if (!p || typeof p !== 'object') return false;
      const row = p as Record<string, unknown>;
      const rowPage = row.page;
      if (rowPage === page) return true;
      if (typeof rowPage === 'string') {
        return rowPage
          .split(',')
          .map((x) => x.trim())
          .includes(page);
      }
      return false;
    });

    return pagePermissions && typeof pagePermissions === 'object'
      ? (pagePermissions as Record<string, unknown>)
      : null;
  }

  private normalizePermissionRow(row: Record<string, unknown>, fallbackPage: string): Record<string, unknown> {
    const show = row.show === true || row.show === 1 || row.show === '1' || row.show === 'true';
    return {
      ...row,
      page: typeof row.page === 'string' ? row.page : fallbackPage,
      show,
    };
  }
}
