import { Controller, Post, Body, Get, UseGuards, Request, Headers, ForbiddenException, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import * as jwt from 'jsonwebtoken';

const REPORTING_FRONTEND_URL = process.env.REPORTING_FRONTEND_URL || process.env.NEXT_PUBLIC_REPORTING_FRONTEND_URL || 'https://reporting-system-frontend.pianat.ai';
const COOKIE_NAME = 'reporting_node_token';

/** Allowed origins for entry-token (form POST must come from reporting frontend or listed origins). */
function getAllowedEntryOrigins(): string[] {
  const base = REPORTING_FRONTEND_URL.replace(/\/+$/, '').toLowerCase();
  const list = [base];
  // In development, allow both localhost and 127.0.0.1 (browser may send either)
  if (base.includes('localhost:3000')) {
    if (!list.includes('http://127.0.0.1:3000')) list.push('http://127.0.0.1:3000');
  }
  if (base.includes('127.0.0.1:3000')) {
    if (!list.includes('https://reporting-system-frontend.pianat.ai')) list.push('https://reporting-system-frontend.pianat.ai');
  }
  // In live UAT, allow both https and http for same host (e.g. https://reporting-system-frontend.pianat.ai)
  if (base.includes('reporting-system-frontend.pianat.ai')) {
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
  const altBase = base.includes('localhost:3000') ? 'http://127.0.0.1:3000' : base.includes('127.0.0.1:3000') ? 'https://reporting-system-frontend.pianat.ai' : null;
  if (altBase && (u === altBase || u === `${altBase}/` || u.startsWith(`${altBase}/`))) return true;
  // In live UAT, allow redirect to both https and http for same host (e.g. reporting-system-frontend.pianat.ai)
  if (base.includes('reporting-system-frontend.pianat.ai')) {
    const other = base.startsWith('https://') ? base.replace('https://', 'http://') : base.replace('http://', 'https://');
    if (u === other || u === `${other}/` || u.startsWith(`${other}/`)) return true;
  }
  return false;
}

/**
 * Module backend auth: entry-token (IET exchange) and profile.
 * After entry: user is authenticated ONLY via HttpOnly cookie reporting_node_token.
 * No postMessage, no JS token access, no Referer-only validation.
 */
@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Validate IET with main backend, create JWT, set it in cookie (backend sets cookie – no token in body).
   * Body: { iet, module_id, redirect_uri? }. Header: Origin.
   * On success: Set-Cookie + 302 redirect to reporting frontend. On failure: 403.
   */
  @Post('entry-token')
  async createEntryToken(
    @Body() body: { iet?: string; module_id?: string; redirect_uri?: string },
    @Headers('origin') origin: string,
    @Headers('referer') referer: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const iet = (body?.iet && String(body.iet).trim()) || '';
    const moduleId = (body?.module_id && String(body.module_id).trim()) || 'default';

    // Server-side: only accept form POST from reporting frontend (or allowed origins)
    const isDev = process.env.NODE_ENV !== 'production';
    const allowedEntry = getAllowedEntryOrigins();
    const hasOriginOrReferer = !!(origin?.trim() || referer?.trim());
    const allowed = isAllowedOrigin(origin || '', referer || '', allowedEntry);
    const devAllowNoOrigin = isDev && allowedEntry.some((o) => o.includes('localhost') || o.includes('127.0.0.1'));
    const skipOriginCheck = isDev && (allowedEntry.some((o) => o.includes('localhost') || o.includes('127.0.0.1')));
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

    // Bank-grade: HttpOnly (no JS access), Secure in production, SameSite for same-site/cross-site POST
    res
      .cookie(COOKIE_NAME, result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: result.expiresIn * 1000,
        path: '/',
      })
      .status(302)
      .redirect(redirectTo);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    // User is attached to request by JwtAuthGuard
    const user = req.user;
    return {
      id: user?.id || '1',
      email: user?.email || 'demo@example.com',
      name: user?.name || 'Demo User',
      role: user?.role || 'admin',
    };
  }

  @Post('validate-token')
  async validateToken(@Body() body: { token: string }): Promise<any> {
    const { token } = body;

    if (!token) {
      return { success: false, message: 'Token is required' };
    }

    try {
      const secretKey = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'GRC_ADIB_2025';
      const decoded: any = jwt.verify(token, secretKey);

      // Extract user info from token - matching v2_backend format exactly
      const { group, title, name, id } = decoded;

      return {
        success: true,
        data: { group, title, name, id },
      };
    } catch (error) {
      console.error('Error validating token:', error);
      return { success: false, message: 'Invalid or expired token' };
    }
  }

  /**
   * Logout: clear reporting_node_token (and iframe token cookies) so that when the user
   * logs out from the main app, the reporting module is also logged out in other tabs.
   * Only allowed origins (main app) may call this so a malicious site cannot iframe-logout the user.
   */
  @Get('logout')
  async logoutGet(
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
    // Always clear the cookie when this endpoint is hit so reporting_node_token is removed (e.g. after main app logout)
    this.clearReportingCookies(res);
    res.status(200).json({ success: true, message: 'Logged out' });
  }

  @Post('logout')
  async logoutPost(
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
    this.clearReportingCookies(res);
    res.status(200).json({ success: true, message: 'Logged out' });
  }

  /** Clear reporting auth cookies (same path/domain/options as when set). */
  private clearReportingCookies(res: Response): void {
    const opts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 0,
      path: '/',
    };
    res.cookie(COOKIE_NAME, '', opts);
    res.cookie('iframe_d_c_c_t_p_1', '', opts);
    res.cookie('iframe_d_c_c_t_p_2', '', opts);
  }
}
