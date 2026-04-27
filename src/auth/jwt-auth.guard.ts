import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { getJwtSecret } from './jwt-secret';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { getReportingJwtFromRequestMeta } from './utils/extract-token';
import { buildReportingJwtDebugSnapshot } from './utils/jwt-debug-snapshot';
import { isLogThrottled } from './utils/throttle-console-log';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

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

    const request = context.switchToHttp().getRequest<Request>() as Request & {
      user?: unknown;
      reportingJwtSource?: string;
    };
    const { token, source } = getReportingJwtFromRequestMeta(request);
    request.reportingJwtSource = source;

    if (!token) {
      throw new UnauthorizedException(
        'Authorization token is missing (use Bearer header or reporting_node_token / iframe_d_c_c_t_p_* cookies)',
      );
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret()) as Record<string, unknown>;
      request.user = decoded;

      const uid = decoded.id ?? decoded.sub ?? decoded.user_id;
      const tokenPart =
        token.length > 36
          ? `${token.slice(0, 24)}...${token.slice(-12)}`
          : `${token.slice(0, 8)}…(len=${token.length})`;
      const logLine = `[JwtAuth] user_id=${uid ?? '(none)'} jwt=${tokenPart} source=${source}`;
      if (!isLogThrottled(`jwtlog:${source}:${String(uid ?? 'none')}`, 2000)) {
        this.logger.log(logLine);
        console.log(logLine);
      }

      const snap = buildReportingJwtDebugSnapshot(decoded, source);
      const debugJwt =
        process.env.REPORTING_DEBUG_JWT === 'true' || process.env.REPORTING_DEBUG_JWT === '1';
      const hasPerms = snap.permissions_is_non_empty_array === true;
      const devLogMissing = process.env.NODE_ENV !== 'production' && !hasPerms;
      const subKey = String(snap.user_sub ?? 'unknown');
      const throttled = devLogMissing && isLogThrottled(`jwt-miss:${subKey}`, 90_000);
      if (debugJwt || (devLogMissing && !throttled)) {
        const line = `[JwtAuth] ${debugJwt ? 'verified' : 'missing_permissions'} ${JSON.stringify(snap)}`;
        this.logger.warn(line);
        console.warn(line);
      }
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
