import { Injectable } from '@nestjs/common';

/**
 * Resolves DCC-style `GET /groups/permissions?page=…` for the reporting frontend header,
 * using the same JWT payload the app already trusts (no second HTTP hop to main backend).
 *
 * - If `user.permissions` exists (array from IET / main), use the row for `page` (same matching as PermissionsGuard).
 * - Else if `REPORTING_GROUP_PERMISSIONS_LENIENT=true`, any authenticated user gets `show: true` for the tab.
 * - Else `show: false` for that page.
 */
@Injectable()
export class GroupPermissionsService {
  /**
   * When true (default): if JWT has no `permissions` array, header tabs still show (`show: true`).
   * Set `REPORTING_GROUP_PERMISSIONS_LENIENT=false` once IET embeds `permissions` in the token.
   */
  isLenient(): boolean {
    const v = String(process.env.REPORTING_GROUP_PERMISSIONS_LENIENT ?? 'true').toLowerCase();
    return v !== 'false' && v !== '0' && v !== 'no';
  }

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

    const hasPermissionsArray = Array.isArray(u.permissions) && (u.permissions as unknown[]).length > 0;
    if (hasPermissionsArray) {
      return {
        success: true,
        permissions: { page, show: false },
      };
    }

    if (this.isLenient()) {
      return {
        success: true,
        permissions: {
          page,
          show: true,
          create: false,
          edit: false,
          delete: false,
        },
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
