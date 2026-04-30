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
import { isReportingVerboseLog } from '../shared/reporting-verbose';
import { TokenBlocklistService } from './token-blocklist.service';

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

  constructor(
    private readonly reflector: Reflector,
    private readonly blocklist: TokenBlocklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const candidates = getCandidateTokens(request);
    const verbose = isReportingVerboseLog();
    const handler = `${context.getClass().name}.${context.getHandler().name}`;

    if (candidates.length === 0) {
      if (verbose) {
        const cookieNames = request.cookies ? Object.keys(request.cookies).sort().join(',') : '(no parsed cookies)';
        this.logger.warn(
          `[Reporting][JwtAuth] no_token_candidates route=${handler} ` +
            `cookie_names=${cookieNames || '(empty)'} has_auth_header=${!!request.headers?.authorization}`,
        );
      }
      throw new UnauthorizedException(
        'Authorization token is missing (use Bearer header or iframe_d_c_c_t_p / d_c_c_t_p_* cookies)',
      );
    }

    if (verbose) {
      this.logger.log(
        `[Reporting][verbose][JwtAuth] route=${handler} candidates=${candidates.length} ` +
          `sources_in_order=${candidates.map((c) => c.source).join(' → ')}`,
      );
    }

    const secret = getJwtSecret();

    // 1) Verify each candidate against the JWT secret; remember every one that passes signature/exp checks.
    type Verified = { token: string; payload: JwtPayload; source: TokenSource };
    const verified: Verified[] = [];
    for (const { token, source } of candidates) {
      try {
        const decoded = jwt.verify(token, secret) as JwtPayload;
        verified.push({ token, payload: decoded, source });
      } catch (e) {
        if (verbose) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.log(
            `[Reporting][verbose][JwtAuth] skip source=${source} jwt_chars=${token.length} err=${msg}`,
          );
        }
      }
    }

    if (verified.length === 0) {
      this.logger.warn(
        `[Reporting][JwtAuth] all_candidates_invalid route=${handler} tried_sources=${candidates.map((c) => c.source).join(',')}`,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }

    // 2) Reject revoked tokens (DCC inserts into `blocked_tokens` on logout / force-logout).
    //    Run the blocklist lookup once per verified token in parallel; treat DB errors as "not blocked"
    //    (fail-open) — TokenBlocklistService already logs the underlying failure.
    const blockedFlags = await Promise.all(
      verified.map((v) =>
        this.blocklist.isTokenBlocked(v.token).catch(() => false),
      ),
    );
    const usable = verified.filter((_, i) => !blockedFlags[i]);

    if (usable.length === 0) {
      const sample = verified[0]?.payload;
      this.logger.warn(
        `[Reporting][JwtAuth] all_tokens_revoked route=${handler} user=${sample?.id ?? sample?.sub ?? '?'} ` +
          `revoked_sources=${verified.map((v) => v.source).join(',')}`,
      );
      throw new UnauthorizedException('Session has been revoked. Please sign in again.');
    }

    // 3) Among the usable tokens, prefer the first one that carries permissions; otherwise the first valid.
    const chosen =
      usable.find((u) => hasPermissions(u.payload)) ?? usable[0];
    const payload = chosen.payload;
    const source = chosen.source;

    const logJwtAccept =
      verbose || process.env.NODE_ENV !== 'production' || process.env.REPORTING_DEBUG_JWT === '1';
    if (logJwtAccept) {
      this.logger.log(
        `[Reporting][JwtAuth] accepted route=${handler} user=${payload.id ?? payload.sub ?? '?'} source=${source} ` +
          `permissions=${hasPermissions(payload) ? (payload.permissions as unknown[]).length : 0} rows`,
      );
    }

    if (process.env.NODE_ENV !== 'production' || process.env.REPORTING_DEBUG_JWT === '1') {
      const userId = payload.id ?? payload.sub ?? 'unknown';
      const permType = Array.isArray(payload.permissions)
        ? `array(${(payload.permissions as unknown[]).length})`
        : typeof payload.permissions;

      if (!hasPermissions(payload)) {
        this.logger.warn(
          `[Reporting][JwtAuth] no_permissions user=${userId} source=${source} ` +
            `permissions_type=${permType} claim_keys=${Object.keys(payload).join(',')} ` +
            `hint=main_app_d_c_c_t_p_cookies_must_be_on_shared_domain_or_dcc-backend_must_return_permissions`,
        );
      }
    }

    request.user = payload;
    return true;
  }
}
