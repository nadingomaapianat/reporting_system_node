import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { getJwtSecret } from './jwt-secret';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { getReportingJwtFromRequest } from './utils/extract-token';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>() as Request & { user?: unknown };
    const token = getReportingJwtFromRequest(request);

    if (!token) {
      throw new UnauthorizedException(
        'Authorization token is missing (use Bearer header or reporting_node_token / iframe_d_c_c_t_p_* cookies)',
      );
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret());
      request.user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
