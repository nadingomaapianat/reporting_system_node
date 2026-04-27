import { Injectable, Logger } from '@nestjs/common';
import { isLogThrottled } from '../auth/utils/throttle-console-log';

/**
 * Resolves DCC-style `GET /groups/permissions?page=…` for the reporting frontend header,
 * using the same JWT payload the app already trusts (no second HTTP hop to main backend).
 *
 * Uses `user.permissions` (array from IET / main) and the row for `page` (same matching as PermissionsGuard).
 * If there is no row for the page, or no non-empty `permissions` array, `show` is false for that tab.
 */
@Injectable()
export class GroupPermissionsService {
  private readonly logger = new Logger(GroupPermissionsService.name);
  /**
   * Shape matches what `reporting_system_frontend2` Header expects:
   * `{ success: true, permissions: { show, page?, … } }`
   */
  resolveForPage(
    user: unknown,
    page: string,
    debug?: { jwtSource?: string; claim_keys?: string[] },
  ): { success: boolean; permissions?: Record<string, unknown>; message?: string } {
    if (!user || typeof user !== 'object') {
      this.logPermissionFalse('no_user_on_request', page, { detail: 'req.user missing or not an object' });
      return { success: false, message: 'Unauthorized' };
    }

    const u = user as Record<string, unknown>;
    const row = this.findPermissionRow(u, page);
    if (row) {
      const permissions = this.normalizePermissionRow(row, page);
      if (permissions.show !== true) {
        this.logPermissionFalse('row_show_false_or_missing', page, {
          raw_show: row.show,
          normalized_show: permissions.show,
        });
      }
      return {
        success: true,
        permissions,
      };
    }

    const perms = u.permissions;
    if (!Array.isArray(perms)) {
      const keys = debug?.claim_keys ?? [];
      const looksLikeMinimalReportingJwt =
        debug?.jwtSource === 'reporting_node_token' &&
        keys.includes('id') &&
        !keys.includes('permissions');
      this.logPermissionFalse('jwt_permissions_not_array', page, {
        permissions_type: perms === undefined ? 'undefined' : typeof perms,
        jwt_source: debug?.jwtSource,
        jwt_claim_keys: debug?.claim_keys,
        hint:
          debug?.jwtSource === 'authorization_bearer'
            ? 'Bearer is often main-app JWT without permissions; use reporting_node_token (re-open Reporting from main app after entry-token).'
            : debug?.jwtSource === 'iframe_cookie'
              ? 'iframe cookie JWT may omit permissions; prefer reporting_node_token from IET exchange.'
              : looksLikeMinimalReportingJwt
                ? 'Stale or minimal reporting cookie JWT (only id, no permissions). Fix: (1) Clear reporting_node_token and open Reporting from main again. (2) MAIN_BACKEND POST /entry/validate must return permissions[], OR set REPORTING_BOOTSTRAP_SECRET + POST /entry/reporting-permissions on same host (exempt that path from CSRF on main).'
                : 'reporting_node_token must include permissions[] from IET exchange; check MAIN_BACKEND validate/bootstrap logs on reporting server.',
      });
    } else if (perms.length === 0) {
      this.logPermissionFalse('jwt_permissions_empty_array', page, {});
    } else {
      this.logPermissionFalse('no_row_for_page', page, {
        pages_in_jwt: this.collectPageHints(perms),
      });
    }

    return {
      success: true,
      permissions: { page, show: false },
    };
  }

  /** Logs why `show` is false so devs can correlate with JWT / DCC rows. */
  private logPermissionFalse(reason: string, page: string, extra: Record<string, unknown>): void {
    if (
      reason === 'jwt_permissions_not_array' &&
      isLogThrottled(`gp-jwt-miss:${String(extra.jwt_source ?? '')}`, 90_000)
    ) {
      return;
    }
    const payload = { reason, page, ...extra };
    const line = `[GroupPermissions] show=false ${JSON.stringify(payload)}`;
    this.logger.warn(line);
    console.warn(line);
  }

  private collectPageHints(perms: unknown[]): string[] {
    const out: string[] = [];
    for (const p of perms) {
      if (!p || typeof p !== 'object') continue;
      const row = p as Record<string, unknown>;
      const raw = row.page;
      if (typeof raw === 'string' && raw.trim()) out.push(raw.trim());
    }
    return out;
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
