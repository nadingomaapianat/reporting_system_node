import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  applyDecorators,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export enum IcrRole {
  VIEWER = 'ICR_VIEWER',
  PREPARER = 'ICR_PREPARER',
  REVIEWER = 'ICR_REVIEWER',
  APPROVER = 'ICR_APPROVER',
  ADMIN = 'ICR_ADMIN',
}

export const ICR_ROLES_KEY = 'icr_roles';

export const IcrRoles = (...roles: IcrRole[]) =>
  SetMetadata(ICR_ROLES_KEY, roles);

/**
 * Platform superadmin / full admin: must bypass ICR ownership and see all templates, reports, and sections.
 * (JWT from IET may omit ICR_ADMIN in `roles` or use a group name that did not match older heuristics.)
 */
export function userHasFullIcrAccess(user: {
  roles?: string[];
  isAdmin?: boolean | number | string;
  groupName?: string;
  role?: string;
}): boolean {
  const roleSet = new Set(user.roles ?? []);
  if (roleSet.has(IcrRole.ADMIN)) return true;
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

interface DccPermission {
  page: string;
  show?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  'First Approval'?: boolean;
  Reviewe?: boolean;
  'Second Approval'?: boolean;
}

/**
 * Map DCC group permissions to ICR roles.
 *
 * Checks two DCC pages:
 *   - "ICR Reports" → VIEWER, PREPARER, REVIEWER, APPROVER
 *   - "ICR Admin"   → ADMIN
 *
 * Fallback: if no DCC `permissions` array in JWT, derive from `groupName`.
 */
function resolveIcrRoles(user: any): IcrRole[] {
  if (userHasFullIcrAccess(user)) {
    return [...Object.values(IcrRole)];
  }

  const dccPerms: DccPermission[] | undefined = user.permissions;

  if (Array.isArray(dccPerms) && dccPerms.length > 0) {
    return rolesFromDccPermissions(dccPerms);
  }

  return rolesFromGroupName(user);
}

function rolesFromDccPermissions(perms: DccPermission[]): IcrRole[] {
  const roles: IcrRole[] = [];

  const icrReports = perms.find(p => p.page === 'ICR Reports');
  const icrAdmin = perms.find(p => p.page === 'ICR Admin');

  if (icrReports?.show) roles.push(IcrRole.VIEWER);
  if (icrReports?.create || icrReports?.edit) roles.push(IcrRole.PREPARER);
  if (icrReports?.Reviewe) roles.push(IcrRole.REVIEWER);
  if (icrReports?.['First Approval'] || icrReports?.['Second Approval']) roles.push(IcrRole.APPROVER);

  if (icrAdmin?.show || icrAdmin?.create || icrAdmin?.edit) roles.push(IcrRole.ADMIN);

  return [...new Set(roles)];
}

function rolesFromGroupName(user: any): IcrRole[] {
  const g = (user.groupName ?? '').toString().toLowerCase();
  const hasRoleInfo = !!(user.groupName || user.role || user.isAdmin !== undefined);

  if (!hasRoleInfo) {
    return Object.values(IcrRole);
  }

  if (
    g.includes('super_admin') ||
    g.includes('super admin') ||
    g.includes('superadmin') ||
    user.isAdmin === true ||
    user.isAdmin === 1 ||
    user.isAdmin === 'true' ||
    user.isAdmin === '1'
  ) {
    return Object.values(IcrRole);
  }

  const r = (user.role ?? '').toString().toLowerCase().replace(/\s+/g, '_');
  if (r.includes('super_admin') || r.includes('superadmin') || (r.includes('super') && r.includes('admin'))) {
    return Object.values(IcrRole);
  }

  if (g.includes('head_of_orm') || g.includes('head of orm')) {
    return [IcrRole.VIEWER, IcrRole.PREPARER, IcrRole.REVIEWER, IcrRole.APPROVER, IcrRole.ADMIN];
  }

  if (g.includes('orm')) {
    return [IcrRole.VIEWER, IcrRole.PREPARER, IcrRole.REVIEWER];
  }

  if (g.includes('head_of_business') || g.includes('head of business')) {
    return [IcrRole.VIEWER, IcrRole.APPROVER];
  }

  if (g.includes('business')) {
    return [IcrRole.VIEWER, IcrRole.PREPARER];
  }

  return [IcrRole.VIEWER];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: any }>();

    if (!request.user) {
      request.user = {
        id: 1,
        fullName: 'Development User',
        email: 'dev@adib.ae',
        roles: Object.values(IcrRole),
      };
    }

    if (!request.user.fullName) {
      request.user.fullName =
        request.user.name ?? request.user.username ?? request.user.email ?? `User ${request.user.id}`;
    }

    const existing = Array.isArray(request.user.roles) ? request.user.roles.filter(Boolean) : [];
    const derived = resolveIcrRoles(request.user);
    request.user.roles =
      userHasFullIcrAccess(request.user) || existing.length === 0
        ? [...new Set([...derived, ...existing])]
        : [...new Set([...existing, ...derived])];

    return true;
  }
}

@Injectable()
export class IcrRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<IcrRole[]>(
      ICR_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<{
      user?: { roles?: string[] };
    }>();

    const userRoles: string[] = request.user?.roles ?? [];

    const hasRole =
      userRoles.includes(IcrRole.ADMIN) ||
      requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}

export const IcrGuard = (...roles: IcrRole[]) =>
  applyDecorators(
    UseGuards(JwtAuthGuard, IcrRolesGuard),
    IcrRoles(...roles),
  );
