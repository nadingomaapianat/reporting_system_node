import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { getJwtSecret } from './jwt-secret';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { getCandidateTokens, TokenSource } from './utils/extract-token';

interface JwtPayload {
  id?: string;
  sub?: string;
  permissions?: unknown;
  [key: string]: unknown;
}

function hasPermissions(payload: JwtPayload): boolean {
  return Array.isArray(payload.permissions) && (payload.permissions as unknown[]).length > 0;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const candidates = getCandidateTokens(request);

    if (candidates.length === 0) {
      throw new UnauthorizedException(
        'Authorization token is missing (use Bearer header or reporting_node_token / d_c_c_t_p_* cookies)',
      );
    }

    const secret = getJwtSecret();

    let firstValidPayload: JwtPayload | null = null;
    let firstValidSource: TokenSource | null = null;
    let chosenPayload: JwtPayload | null = null;
    let chosenSource: TokenSource | null = null;

    for (const { token, source } of candidates) {
      try {
        const decoded = jwt.verify(token, secret) as JwtPayload;

        // Remember the first token that validates (fallback)
        if (!firstValidPayload) {
          firstValidPayload = decoded;
          firstValidSource = source;
        }

        // Prefer the first token that also carries permissions
        if (hasPermissions(decoded)) {
          chosenPayload = decoded;
          chosenSource = source;
          break;
        }
      } catch {
        // Token invalid or wrong secret — try next candidate
      }
    }

    // Use permissions-bearing token; fall back to first valid token
    const payload = chosenPayload ?? firstValidPayload;
    const source = chosenSource ?? firstValidSource;

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (process.env.NODE_ENV !== 'production' || process.env.REPORTING_DEBUG_JWT === '1') {
      const userId = payload.id ?? payload.sub ?? 'unknown';
      const permType = Array.isArray(payload.permissions)
        ? `array(${(payload.permissions as unknown[]).length})`
        : typeof payload.permissions;

      if (!hasPermissions(payload)) {
        this.logger.warn(
          `[JwtAuth] no_permissions user=${userId} source=${source} ` +
          `permissions_type=${permType} claim_keys=${Object.keys(payload).join(',')} ` +
          `hint=main_app_d_c_c_t_p_cookies_must_be_on_shared_domain_or_dcc-backend_must_return_permissions`,
        );
      } else {
        this.logger.log(
          `[JwtAuth] ok user=${userId} source=${source} permissions=${permType}`,
        );
      }
    }

    request.user = payload;
    return true;
  }
}
