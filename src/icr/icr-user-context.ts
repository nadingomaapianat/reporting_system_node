import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { findDccPermissionRow, dccRowSatisfiesActions } from '../auth/utils/dcc-permission-row';

const ICR_ADMIN_ROLE = 'ICR_ADMIN';

/** JWT user subset used for DCC checks + legacy admin hints. */
export type IcrAuthUser = {
  permissions?: unknown;
  roles?: string[];
  isAdmin?: boolean | number | string;
  groupName?: string;
  role?: string;
};

/**
 * Platform superadmin / full admin (JWT hints outside DCC rows).
 * Also treats legacy `ICR_ADMIN` in `roles[]` as full access.
 */
export function userHasFullIcrAccess(user: IcrAuthUser): boolean {
  const roleSet = new Set(user.roles ?? []);
  if (roleSet.has(ICR_ADMIN_ROLE)) return true;
  if (user.isAdmin === true || user.isAdmin === 1 || user.isAdmin === 'true' || user.isAdmin === '1') return true;

  const g = (user.groupName ?? '').toString().toLowerCase().replace(/\s+/g, ' ');
  if (
    g.includes('super_admin') ||
    g.includes('super admin') ||
    g.includes('superadmin') ||
    g.includes('system admin') ||
    g.includes('system_admin')
  ) {
    return true;
  }

  const r = (user.role ?? '').toString().toLowerCase().replace(/\s+/g, '_');
  if (r.includes('super_admin') || r.includes('superadmin') || (r.includes('super') && r.includes('admin'))) {
    return true;
  }

  return false;
}

/** Tasks list: show every section (not only maker/checker for the user’s functions). */
export function userSeesAllIcrTasks(user: IcrAuthUser): boolean {
  if (userHasFullIcrAccess(user)) return true;
  const rows = user.permissions;
  if (dccRowSatisfiesActions(findDccPermissionRow(rows, 'Tasks'), ['delete'], false)) return true;
  if (dccRowSatisfiesActions(findDccPermissionRow(rows, 'ICR Reports'), ['delete'], false)) return true;
  return false;
}

/** Align with Tasks UI: create+edit on Tasks, or same on ICR Reports if Tasks row missing. */
export function userCanPrepareIcrTasks(user: IcrAuthUser): boolean {
  if (userSeesAllIcrTasks(user)) return true;
  const rows = user.permissions;
  const tasks = findDccPermissionRow(rows, 'Tasks');
  const reports = findDccPermissionRow(rows, 'ICR Reports');
  return (
    dccRowSatisfiesActions(tasks, ['create', 'edit'], true) ||
    dccRowSatisfiesActions(reports, ['create', 'edit'], true)
  );
}

/** Align with Tasks UI: Reviewe / approvals on Tasks or ICR Reports. */
export function userCanReviewIcrTasks(user: IcrAuthUser): boolean {
  if (userSeesAllIcrTasks(user)) return true;
  const rows = user.permissions;
  const reviewKeys = ['Reviewe', 'First Approval', 'Second Approval'] as const;
  for (const page of ['Tasks', 'ICR Reports'] as const) {
    const row = findDccPermissionRow(rows, page);
    for (const k of reviewKeys) {
      if (row && (row as Record<string, boolean | undefined>)[k] === true) return true;
    }
  }
  return false;
}

/** Sets `req.user.fullName` when missing (DCC / audit display). */
export function hydrateIcrRequestUser(request: { user?: any }): void {
  if (!request.user) {
    throw new UnauthorizedException('Authentication required');
  }

  if (!request.user.fullName) {
    request.user.fullName =
      request.user.name ?? request.user.username ?? request.user.email ?? `User ${request.user.id}`;
  }
}

/**
 * Runs after `PermissionsGuard`. Normalizes `req.user` for ICR; task scoping uses DCC rows in services.
 */
@Injectable()
export class IcrRequestHydrateInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: any }>();
    hydrateIcrRequestUser(request);
    return next.handle();
  }
}
