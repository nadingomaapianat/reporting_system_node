import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as https from 'https';
import { extractPermissionsFromValidateBody } from './utils/extract-permissions-from-validate';
import { getResolvedMainBackendUrl } from './main-backend-config';



/** Path on main backend for IET exchange (some gateways mount under `/api`). */
const MAIN_BACKEND_ENTRY_VALIDATE_PATH =
  process.env.MAIN_BACKEND_ENTRY_VALIDATE_PATH || '/entry/validate';
/** Optional second hop when validate omits permissions (requires main `POST …/entry/reporting-permissions` + shared secret). */
const MAIN_BACKEND_REPORTING_PERMISSIONS_PATH =
  process.env.MAIN_BACKEND_REPORTING_PERMISSIONS_PATH || '/entry/reporting-permissions';
/** Static origin sent to main backend – must match main backend's allowed origin (e.g. main app URL). */
const ORIGIN_FOR_MAIN_BACKEND = process.env.IFRAME_MAIN_ORIGIN || process.env.MAIN_APP_ORIGIN || 'https://grc-reporting-uat.adib.co.eg';
const JWT_EXPIRES_IN = '2h';




const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || process.env.NEXT_PUBLIC_NODE_API_URL || 'https://uat-backend.adib.co.eg';







/** Result of IET validation: success with token, or failure with reason from main backend. */
export type CreateTokenFromIetResult =
  | { ok: true; token: string; expiresIn: number; userId: string }
  | { ok: false; reason: string };

/**
 * Validate IET with main backend and create a JWT for reporting_system_node so the frontend can call our APIs.
 * Sends Origin = main app (IFRAME_MAIN_ORIGIN), not the reporting frontend origin, so main backend allows the request.
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  private getAxiosConfig() {
    const config: any = {
      headers: {
        Origin: ORIGIN_FOR_MAIN_BACKEND,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
      timeout: 15000,
    };

    // In development or when ALLOW_SELF_SIGNED_CERTS=true, allow self-signed certificates for HTTPS URLs
    const allowSelfSigned = process.env.NODE_ENV === 'development' || process.env.ALLOW_SELF_SIGNED_CERTS === 'true';
    const isHttps = getResolvedMainBackendUrl().startsWith('https://');
    
    if (allowSelfSigned && isHttps && https && https.Agent) {
      config.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
    }

    return config;
  }

  /**
   * When main `POST /entry/validate` returns only `user_id`, call main `POST …/reporting-permissions`
   * with shared secret (same host/DB as IET). Set `REPORTING_BOOTSTRAP_SECRET` on main and reporting.
   */
  private async fetchPermissionsViaBootstrap(
    baseNoSlash: string,
    userId: string,
  ): Promise<{
    permissions: unknown[];
    groupName?: string;
    role?: unknown;
    isAdmin?: unknown;
  } | null> {
    const secret =
      process.env.REPORTING_BOOTSTRAP_SECRET?.trim() || process.env.MAIN_BACKEND_BOOTSTRAP_SECRET?.trim();
    if (!secret) return null;
    const pathRaw = MAIN_BACKEND_REPORTING_PERMISSIONS_PATH.trim();
    const path = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;
    const bootUrl = `${baseNoSlash}${path}`;
    const cfg = this.getAxiosConfig();
    try {
      const res = await axios.post(
        bootUrl,
        { user_id: userId },
        {
          ...cfg,
          headers: {
            ...(cfg.headers as Record<string, string>),
            'X-Reporting-Bootstrap-Secret': secret,
          },
          validateStatus: () => true,
        },
      );
      if (res.status !== 200 && res.status !== 201) {
        console.warn(
          `[IET] bootstrap POST ${bootUrl} status=${res.status} body=${JSON.stringify(res.data)}`,
        );
        return null;
      }
      const data = res.data as Record<string, unknown>;
      const extracted =
        extractPermissionsFromValidateBody(data) ??
        (Array.isArray(data.permissions) ? (data.permissions as unknown[]) : null);
      if (!extracted?.length) return null;
      const gn = (data.group_name ?? data.groupName) as string | undefined;
      return {
        permissions: extracted,
        groupName: typeof gn === 'string' ? gn : undefined,
        role: data.role,
        isAdmin: data.is_admin ?? data.isAdmin,
      };
    } catch (err) {
      console.warn('[IET] bootstrap permissions request failed', (err as Error)?.message ?? err);
      return null;
    }
  }

  async createTokenFromIet(iet: string, moduleId: string, _origin: string): Promise<CreateTokenFromIetResult> {
  
    
      const mainUrl = getResolvedMainBackendUrl();
      const base = mainUrl.replace(/\/+$/, '');
      const path = MAIN_BACKEND_ENTRY_VALIDATE_PATH.startsWith('/')
        ? MAIN_BACKEND_ENTRY_VALIDATE_PATH
        : `/${MAIN_BACKEND_ENTRY_VALIDATE_PATH}`;
      const url = `${base}${path}`;
  
      
   
   
    

    try {
      // POST with IET in body to avoid query-string encoding issues (no_row can be caused by mangled IET in GET)
      const res = await axios.post(
        url,
        { iet: iet, module_id: moduleId },
        this.getAxiosConfig(),
      );

      const reason = (res.data as { reason?: string })?.reason;
      const success = (res.status === 200 || res.status === 201) && res.data?.success && res.data?.user_id;

      if (!success) {
        // Always log main backend response for debugging 403 invalid_iet
        console.warn(
          `[IET] main_backend response status=${res.status} reason=${reason ?? '(none)'} body=${JSON.stringify(res.data)}`,
        );
        if (res.status === 403 && reason) {
          const fixNoRow =
            'MAIN_BACKEND_URL (here) must equal main app NEXT_PUBLIC_BASE_URL; run migration on main backend; restart main backend; open Reporting from main app (do not paste IET from another tab)';
         
        }
        return { ok: false, reason: reason ?? 'invalid_iet' };
      }

      const userId = res.data.user_id;
      let groupName = res.data.group_name ?? res.data.groupName ?? undefined;
      let role = res.data.role ?? undefined;
      let isAdmin = res.data.is_admin ?? res.data.isAdmin ?? undefined;
      let permissionsRaw = extractPermissionsFromValidateBody(res.data);
      if ((!permissionsRaw || permissionsRaw.length === 0) && userId) {
        const boot = await this.fetchPermissionsViaBootstrap(base, String(userId));
        if (boot?.permissions?.length) {
          permissionsRaw = boot.permissions;
          groupName = groupName ?? boot.groupName;
          role = role ?? boot.role;
          isAdmin = isAdmin ?? boot.isAdmin;
        }
      }
      const payload: Record<string, unknown> = {
        id: userId,
        groupName,
        role,
        isAdmin,
      };
      if (permissionsRaw && permissionsRaw.length > 0) {
        payload.permissions = permissionsRaw;
      } else {
        console.warn(
          `[IET] validate returned no usable permissions[] — reporting JWT will only have { id, iat, exp }. ` +
            `MAIN_BACKEND_URL=${mainUrl} POST ${url} response_keys=${Object.keys(res.data || {}).join(',')}. ` +
            `Fix: extend POST /entry/validate with permissions[], or deploy main POST /entry/reporting-permissions + set ` +
            `REPORTING_BOOTSTRAP_SECRET on main and reporting, then clear reporting_node_token and open Reporting again.`,
        );
      }
      const token = this.jwtService.sign(payload, { expiresIn: JWT_EXPIRES_IN });
      const expiresInSeconds = 2 * 60 * 60; // 2 hours in seconds
      return { ok: true, token, expiresIn: expiresInSeconds, userId };
    } catch (err) {
      console.warn('[IET] createTokenFromIet request failed', (err as Error)?.message ?? err);
      return { ok: false, reason: 'invalid_iet' };
    }
  }
}
