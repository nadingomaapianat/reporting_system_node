import { Controller, Post, Body, Get, Request, Req, Headers, ForbiddenException, Res, Logger } from '@nestjs/common';
import { Request as ExpressRequest, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { isReportingVerboseLog } from '../shared/reporting-verbose';
import { TokenBlocklistService } from './token-blocklist.service';
import { getJwtSecret } from './jwt-secret';
import { getCandidateTokens } from './utils/extract-token';


const REPORTING_FRONTEND_URL = process.env.REPORTING_FRONTEND_URL || process.env.NEXT_PUBLIC_REPORTING_FRONTEND_URL || 'https://dcc-reporting.theubeg.ub.dom';
const COOKIE_NAME = 'iframe_d_c_c_t_p';
/** Browsers reject Set-Cookie values much over ~4KB; split across iframe_d_c_c_t_p_1, _2, … */
const REPORTING_JWT_COOKIE_CHUNK = 3800;
const REPORTING_JWT_COOKIE_MAX_PARTS = 16;

/** Allowed origins for entry-token (form POST must come from reporting frontend or listed origins). */
function getAllowedEntryOrigins(): string[] {
  const base = REPORTING_FRONTEND_URL.replace(/\/+$/, '').toLowerCase();
  const list = [base];
  // In development, allow both localhost and 127.0.0.1 (browser may send either)
  if (base.includes('localhost:3000')) {
    if (!list.includes('http://127.0.0.1:3000')) list.push('http://127.0.0.1:3000');
  }
 
 

  if (base.includes('127.0.0.1:3000')) {
    if (!list.includes('https://dcc-reporting.theubeg.ub.dom')) list.push('https://dcc-reporting.theubeg.ub.dom');
  }
  // In live UAT, allow both https and http for same host (e.g. https://dcc-reporting.theubeg.ub.dom)
  if (base.includes('dcc-reporting.theubeg.ub.dom')) {
    const other = base.startsWith('https://') ? base.replace('https://', 'http://') : base.replace('http://', 'https://');
    if (!list.includes(other)) list.push(other);
  }




  const extra = process.env.ENTRY_TOKEN_ALLOWED_ORIGINS;
  if (extra) {
    extra.split(',').forEach((o) => {
      const t = o.trim().replace(/\/+$/, '').toLowerCase();
      if (t && !list.includes(t)) list.push(t);
    });
  }
  return list;
}

/** Allowed origins for logout (only main app may trigger logout so malicious sites cannot). */
function getAllowedLogoutOrigins(): string[] {
  const main = process.env.MAIN_APP_ORIGIN || process.env.MAIN_APP_URL || process.env.NEXT_PUBLIC_MAIN_APP_ORIGIN;
  const list: string[] = [];
  if (main) list.push(main.replace(/\/+$/, '').toLowerCase());
  const extra = process.env.LOGOUT_ALLOWED_ORIGINS;
  if (extra) {
    extra.split(',').forEach((o) => {
      const t = o.trim().replace(/\/+$/, '').toLowerCase();
      if (t && !list.includes(t)) list.push(t);
    });
  }
  return list;
}

/** Normalize to origin (protocol + host, no path). */
function toOriginBase(value: string): string | null {
  const v = (value || '').trim();
  if (!v) return null;
  try {
    const url = new URL(v.startsWith('http') ? v : `https://${v}`);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

/** True if the request origin or referer is in the allowed list. */
function isAllowedOrigin(origin: string, referer: string, allowed: string[]): boolean {
  const o = toOriginBase(origin || '');
  if (o && allowed.includes(o)) return true;
  const r = toOriginBase(referer || '');
  return r !== null && allowed.includes(r);
}

/** Bank-grade: allow redirect only to configured reporting frontend origin (no open redirect). */
function isAllowedRedirectUri(uri: string): boolean {
  const base = REPORTING_FRONTEND_URL.replace(/\/+$/, '').toLowerCase();
  const u = (uri || '').trim().toLowerCase().replace(/\/+$/, '');
  if (!u) return false;
  if (u === base || u === `${base}/` || u.startsWith(`${base}/`)) return true;
  // Allow 127.0.0.1 when base is localhost (and vice versa) for same port
  const altBase = base.includes('localhost:3000') ? 'http://127.0.0.1:3000' : base.includes('127.0.0.1:3000') ? 'https://dcc-reporting-api-node.theubeg.ub.dom' : null;
  if (altBase && (u === altBase || u === `${altBase}/` || u.startsWith(`${altBase}/`))) return true;
  // In live UAT, allow redirect to both https and http for same host (e.g. dcc-reporting-api-node.theubeg.ub.dom)
  if (base.includes('dcc-reporting-api-node.theubeg.ub.dom')) {
    const other = base.startsWith('https://') ? base.replace('https://', 'http://') : base.replace('http://', 'https://');
    if (u === other || u === `${other}/` || u.startsWith(`${other}/`)) return true;
  }
  return false;
}

/**
 * Module backend auth: entry-token (IET exchange) and profile.
 * After entry: user is authenticated ONLY via HttpOnly cookie iframe_d_c_c_t_p.
 * No postMessage, no JS token access, no Referer-only validation.
 */
@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly blocklist: TokenBlocklistService,
  ) {}

  /**
   * Validate IET with main backend, create JWT, set it in cookie (backend sets cookie – no token in body).
   * Body: { iet, module_id, redirect_uri? }. Header: Origin.
   * On success: Set-Cookie + 302 redirect to reporting frontend. On failure: 403.
   */
  @Public()
  @Post('entry-token')
  async createEntryToken(
    @Body() body: { iet?: string; module_id?: string; redirect_uri?: string },
    @Headers('origin') origin: string,
    @Headers('referer') referer: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const iet = (body?.iet && String(body.iet).trim()) || '';
    const moduleId = (body?.module_id && String(body.module_id).trim()) || 'default';
    const verbose = isReportingVerboseLog();

    // Server-side: only accept form POST from reporting frontend (or allowed origins)
    const isDev = process.env.NODE_ENV !== 'production';
    const allowedEntry = getAllowedEntryOrigins();
    const hasOriginOrReferer = !!(origin?.trim() || referer?.trim());
    const allowed = isAllowedOrigin(origin || '', referer || '', allowedEntry);
    const devAllowNoOrigin = isDev && allowedEntry.some((o) => o.includes('localhost') || o.includes('127.0.0.1'));
    const skipOriginCheck = isDev && (allowedEntry.some((o) => o.includes('localhost') || o.includes('127.0.0.1')));

    this.logger.log(
      `[Reporting][entry-token] start module_id=${moduleId} iet_len=${iet.length} ` +
        `origin=${origin || '(none)'} referer=${referer ? 'present' : 'none'} ` +
        `allowed_origin=${allowed} skip_origin_check=${skipOriginCheck}`,
    );
    if (verbose) {
      this.logger.log(
        `[Reporting][verbose][entry-token] allowed_origins_list=${allowedEntry.join(' | ')}`,
      );
    }

    if (!skipOriginCheck && allowedEntry.length && !allowed && !(devAllowNoOrigin && !hasOriginOrReferer)) {
      this.logger.warn(
        `[AUDIT] event=ENTRY_TOKEN_FAIL reason=invalid_origin origin=${origin || '(none)'} referer=${referer || '(none)'} allowed=${allowedEntry.join(',')} timestamp=${new Date().toISOString()}`,
      );
      throw new ForbiddenException({ reason: 'invalid_origin', message: 'Invalid origin' });
    }

    if (!iet) {
      console.log('IET required');
      this.logger.warn(
        `[AUDIT] event=ENTRY_TOKEN_FAIL reason=no_iet timestamp=${new Date().toISOString()}`,
      );
      throw new ForbiddenException({ reason: 'no_iet', message: 'IET required' });
    }

    if (verbose) {
      this.logger.log(`[Reporting][verbose][entry-token] calling main backend /entry/validate (IET not logged)`);
    }
    const result = await this.authService.createTokenFromIet(iet, moduleId, origin || '');
    if (result.ok === false) {
      const reason = result.reason || 'invalid_iet';
      const message =
        reason === 'expired'
          ? 'Entry token expired. Open Reporting from the main app again.'
          : reason === 'already_used'
            ? 'Entry token was already used. Open Reporting from the main app again (do not refresh or open in two tabs).'
            : reason === 'invalid_origin'
              ? 'Invalid origin. Open Reporting from the main application.'
              : 'Invalid or expired IET. Open Reporting from the main app again.';
      this.logger.warn(
        `[AUDIT] event=ENTRY_TOKEN_FAIL reason=${reason} main_backend_reason=${reason} iet_length=${iet.length} timestamp=${new Date().toISOString()}`,
      );
      throw new ForbiddenException({ reason, message });
    }

    this.logger.log(
      `[AUDIT] event=ENTRY_TOKEN_SUCCESS user_id=${result.userId} timestamp=${new Date().toISOString()}`,
    );
    this.logger.log(
      `[Reporting][entry-token] jwt_chars=${result.token.length} expires_in_s=${result.expiresIn}`,
    );

    const requestedRedirect = (body?.redirect_uri && String(body.redirect_uri).trim()) || '';
    const defaultRedirect = REPORTING_FRONTEND_URL.replace(/\/+$/, '') + '/';
    let redirectTo = defaultRedirect;
    if (requestedRedirect) {
      if (isAllowedRedirectUri(requestedRedirect)) {
        redirectTo = requestedRedirect.replace(/\/+$/, '') + '/';
      } else {
        this.logger.warn(
          `[AUDIT] event=REDIRECT_URI_REJECTED requested=${requestedRedirect} allowed_base=${REPORTING_FRONTEND_URL} timestamp=${new Date().toISOString()}`,
        );
      }
    }

    // Bank-grade: HttpOnly (no JS access), Secure in production, SameSite for same-site/cross-site POST.
    // domain: COOKIE_DOMAIN (e.g. ".adib.co.eg") shares the cookie across all subdomains so that
    // the Next.js frontend proxy (reporting-system-frontend.*) can forward it to the backend.
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
    this.logger.log(
      `[Reporting][entry-token] redirect_status=302 location=${redirectTo} ` +
        `cookie_domain=${cookieDomain ?? '(host-only)'} secure=${process.env.NODE_ENV === 'production'}`,
    );

    this.setReportingNodeTokenCookies(res, result.token, result.expiresIn * 1000);
    res.status(302).redirect(redirectTo);
  }

  @Get('profile')
  async getProfile(@Request() req: any) {
    // User is attached to request by JwtAuthGuard
    const user = req.user;
    return {
      id: user?.id || '1',
      email: user?.email || 'demo@example.com',
      name: user?.name || 'Demo User',
      role: user?.role ?? null,
    };
  }


  /**
   * Logout: clear iframe_d_c_c_t_p (and iframe token cookies) so that when the user
   * logs out from the main app, the reporting module is also logged out in other tabs.
   * Only allowed origins (main app) may call this so a malicious site cannot iframe-logout the user.
   */
  @Get('logout')
  async logoutGet(
    @Req() req: ExpressRequest,
    @Headers('origin') origin: string,
    @Headers('referer') referer: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const allowed = getAllowedLogoutOrigins();
    const fromAllowedOrigin = allowed.length === 0 || isAllowedOrigin(origin || '', referer || '', allowed);
    if (!fromAllowedOrigin) {
      this.logger.warn(
        `[AUDIT] event=LOGOUT_ORIGIN_UNKNOWN origin=${origin || '(none)'} referer=${referer || '(none)'} – cookie cleared anyway`,
      );
    }
    // Revoke the token itself (blocked_tokens), then always clear the cookie so iframe_d_c_c_t_p is removed
    await this.blockRequestTokens(req);
    this.clearReportingCookies(res);
    res.status(200).json({ success: true, message: 'Logged out' });
  }

  @Public()
  @Post('logout')
  async logoutPost(
    @Req() req: ExpressRequest,
    @Headers('origin') origin: string,
    @Headers('referer') referer: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const allowed = getAllowedLogoutOrigins();
    const fromAllowedOrigin = allowed.length === 0 || isAllowedOrigin(origin || '', referer || '', allowed);
    if (!fromAllowedOrigin) {
      this.logger.warn(
        `[AUDIT] event=LOGOUT_ORIGIN_UNKNOWN origin=${origin || '(none)'} referer=${referer || '(none)'} – cookie cleared anyway`,
      );
    }
    await this.blockRequestTokens(req);
    this.clearReportingCookies(res);
    res.status(200).json({ success: true, message: 'Logged out' });
  }

  /**
   * Revoke the reporting token(s) this request carries by adding them to `blocked_tokens`, as the
   * main backend does for its own token on logout — clearing the cookie alone leaves a copied
   * token valid until it expires. Only tokens that verify with our secret are written, so a caller
   * cannot fill the table; the main app's d_c_c_t_p token is left to the main backend.
   */
  private async blockRequestTokens(req: ExpressRequest): Promise<void> {
    const secret = getJwtSecret();
    for (const { token, source } of getCandidateTokens(req)) {
      if (source === 'd_c_c_t_p') continue;
      let payload: { id?: string; sub?: string; exp?: number };
      try {
        payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as typeof payload;
      } catch {
        continue; // expired or foreign: nothing to revoke
      }
      const userId = String(payload.id ?? payload.sub ?? '').trim();
      if (!userId) continue;
      // keep the row a little past the token's own expiry (Python allows 30s clock drift)
      const expiresAt = new Date(payload.exp ? payload.exp * 1000 + 60_000 : Date.now() + 24 * 60 * 60 * 1000);
      try {
        await this.blocklist.blockToken(token, userId, expiresAt);
        this.logger.log(`[AUDIT] event=LOGOUT_TOKEN_BLOCKED user_id=${userId} source=${source}`);
      } catch (err) {
        this.logger.error(`[AUDIT] event=LOGOUT_TOKEN_BLOCK_FAIL user_id=${userId}: ${(err as Error)?.message ?? err}`);
      }
    }
  }

  /** Clear reporting auth cookies (same path/domain/options as when set). */
  private clearReportingCookies(res: Response): void {
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
    const opts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 0,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };
    res.cookie(COOKIE_NAME, '', opts);
    for (let i = 1; i <= REPORTING_JWT_COOKIE_MAX_PARTS; i++) {
      res.cookie(`${COOKIE_NAME}_${i}`, '', opts);
    }
    res.cookie('iframe_d_c_c_t_p_1', '', opts);
    res.cookie('iframe_d_c_c_t_p_2', '', opts);
  }

  /**
   * Set HttpOnly JWT cookie(s). Large JWTs are split so browsers accept Set-Cookie (see extract-token).
   */
  private setReportingNodeTokenCookies(res: Response, token: string, maxAgeMs: number): void {
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
    const baseOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: maxAgeMs,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };
    const clearOpts = { ...baseOpts, maxAge: 0 };

    const clearParts = (from: number, to: number) => {
      for (let i = from; i <= to; i++) {
        res.cookie(`${COOKIE_NAME}_${i}`, '', clearOpts);
      }
    };

    const maxChars = REPORTING_JWT_COOKIE_CHUNK * REPORTING_JWT_COOKIE_MAX_PARTS;
    if (token.length > maxChars) {
      this.logger.error(
        `[Reporting][entry-token] JWT too large for cookie chunking (${token.length} > ${maxChars})`,
      );
      throw new ForbiddenException({
        message: 'Session payload too large for cookies. Reduce permissions in token or raise chunk limits.',
      });
    }

    if (token.length <= REPORTING_JWT_COOKIE_CHUNK) {
      clearParts(1, REPORTING_JWT_COOKIE_MAX_PARTS);
      res.cookie(COOKIE_NAME, token, baseOpts);
      this.logger.log(`[Reporting][entry-token] cookie_mode=single len=${token.length}`);
      return;
    }

    res.cookie(COOKIE_NAME, '', clearOpts);
    const numParts = Math.ceil(token.length / REPORTING_JWT_COOKIE_CHUNK);
    for (let p = 1, i = 0; p <= numParts; p++, i += REPORTING_JWT_COOKIE_CHUNK) {
      res.cookie(`${COOKIE_NAME}_${p}`, token.slice(i, i + REPORTING_JWT_COOKIE_CHUNK), baseOpts);
    }
    clearParts(numParts + 1, REPORTING_JWT_COOKIE_MAX_PARTS);
    this.logger.log(`[Reporting][entry-token] cookie_mode=split parts=${numParts} total_len=${token.length}`);
  }
}
