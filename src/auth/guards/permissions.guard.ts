import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionsMeta } from '../decorators/permissions.decorator';
import { Request } from 'express';
import { findDccPermissionRow, dccRowSatisfiesActions } from '../utils/dcc-permission-row';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>() as any;
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const required = this.reflector.getAllAndOverride<PermissionsMeta>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) {
      return true;
    }

    const { page, actions, requireAll } = required;

    const rows = user.permissions;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new ForbiddenException(
        'No DCC permissions in token; the JWT must include a non-empty `permissions` array.',
      );
    }

    const pagePermissions = findDccPermissionRow(rows, page);

    if (!pagePermissions) {
      throw new ForbiddenException(`No permissions configured for page "${page}"`);
    }

    const hasAction = dccRowSatisfiesActions(pagePermissions, actions, !!requireAll);

    if (!hasAction) {
      throw new ForbiddenException(
        `Missing required permission${requireAll ? 's' : ''} (${actions.join(', ')}) on ${page}`,
      );
    }

    return true;
  }
}
