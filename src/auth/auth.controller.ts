import { Controller, Post, Body, Get, UseGuards, Request, Headers, ForbiddenException, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import * as jwt from 'jsonwebtoken';

const REPORTING_FRONTEND_URL = process.env.REPORTING_FRONTEND_URL || process.env.NEXT_PUBLIC_REPORTING_FRONTEND_URL || 'http://localhost:3001';
const COOKIE_NAME = 'reporting_node_token';

/** Bank-grade: allow redirect only to configured reporting frontend origin (no open redirect). */
function isAllowedRedirectUri(uri: string): boolean {
  const base = REPORTING_FRONTEND_URL.replace(/\/+$/, '').toLowerCase();
  const u = (uri || '').trim().toLowerCase().replace(/\/+$/, '');
  if (!u) return false;
  return u === base || u === `${base}/` || u.startsWith(`${base}/`);
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
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const iet = (body?.iet && String(body.iet).trim()) || '';
    const moduleId = (body?.module_id && String(body.module_id).trim()) || 'default';

    // console.log('body', body);
    // console.log('iet', iet);
    // console.log('moduleId', moduleId);
    // console.log('origin', origin);

    // console.log('[AuthController.entry-token] body keys:', body ? Object.keys(body) : [], 'iet length:', iet?.length ?? 0, 'origin:', origin);

    if (!iet) {
      this.logger.warn(
        `[AUDIT] event=ENTRY_TOKEN_FAIL reason=no_iet timestamp=${new Date().toISOString()}`,
      );
      throw new ForbiddenException('IET required');
    }

    const result = await this.authService.createTokenFromIet(iet, moduleId, origin || '');
    if (!result) {
      this.logger.warn(
        `[AUDIT] event=ENTRY_TOKEN_FAIL reason=invalid_or_expired_iet iet_length=${iet.length} timestamp=${new Date().toISOString()}`,
      );
      throw new ForbiddenException('Invalid or expired IET');
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
      const secretKey = 'GRC_ADIB_2025';
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

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any): Promise<any> {
    try {
      // Note: Session management is handled by v2_backend
      // This endpoint validates the token and returns success
      // The actual logout (isSessionActive update) should be done via v2_backend
      
      return {
        isSuccess: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      console.error('Error during logout:', error);
      return {
        isSuccess: false,
        message: 'An error occurred during logout',
      };
    }
  }
}
