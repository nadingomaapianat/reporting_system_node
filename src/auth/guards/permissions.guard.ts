import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Request } from 'express';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request: any = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const requiredPermission = this.reflector.get<{ page: string; actions: string[] }>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true;
    }

    const { page, actions } = requiredPermission;

    const specialPages = ['Control Catalog', 'Risk Catalog', 'KRI Catalog', 'Dashboard', 'Incidents Catalog', 'Users', 'survey'];
    const requiredActions = ['create', 'show', 'edit'];

    if (actions.includes('show-all')) {
      return Array.isArray(user.permissions) && user.permissions.some((perm: any) =>
        specialPages.some((specialPage) =>
          String(perm.page)
            .split(',')
            .map((p: string) => p.trim())
            .includes(specialPage) &&
          requiredActions.some((action) => perm[action] === true),
        ),
      );
    }

    if (actions.includes('approve')) {
      return Array.isArray(user.permissions) && user.permissions.some((perm: any) =>
        String(perm.page)
          .split(',')
          .map((p: string) => p.trim())
          .includes(page) &&
        (perm['First Approval'] === true || perm.Reviewe === true || perm['Second Approval'] === true),
      );
    }

    if (!user.group || !user.permissions) {
      throw new ForbiddenException('User group or permissions not found');
    }

    const pagePermissions = (user.permissions as any[]).find((perm: any) =>
      page
        .split(',')
        .map((p) => p.trim())
        .includes(perm.page),
    );

    if (!pagePermissions) {
      throw new ForbiddenException(`No permissions found for page: ${page}`);
    }

    const hasPermission = actions.some((action) => pagePermissions[action] === true);
    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have the required permissions (${actions.join(', ')}) on ${page}`,
      );
    }

    return true;
  }
}



