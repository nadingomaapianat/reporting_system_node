import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Request } from 'express';

/**
 * Permission guard (same pattern as adib_backend).
 * Requires request.user (set by JwtAuthGuard). For page 'Reporting', any authenticated user is allowed.
 * Can be extended later to check user.permissions from JWT or DB.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>() as any;
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const required = this.reflector.get<{ page: string; actions: string[] }>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!required) {
      return true;
    }

    const { page, actions } = required;

    // Reporting: any authenticated user has access (token already verified by JwtAuthGuard)
    if (page === 'Reporting' && actions.includes('show')) {
      return true;
    }

    // If user has permissions array (e.g. from main backend JWT), check it
    if (user.permissions && Array.isArray(user.permissions)) {
      const pagePermissions = user.permissions.find(
        (p: any) =>
          p &&
          (p.page === page ||
            (typeof p.page === 'string' &&
              p.page.split(',').map((x: string) => x.trim()).includes(page))),
      );
      if (pagePermissions) {
        const hasAction = actions.some((action) => pagePermissions[action] === true);
        if (hasAction) return true;
      }
    }

    throw new ForbiddenException(
      `You do not have the required permissions (${actions.join(', ')}) on ${page}`,
    );
  }
}
