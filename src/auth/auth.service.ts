import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as https from 'https';

const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || process.env.NEXT_PUBLIC_NODE_API_URL || 'https://apidemo.pianat.ai';
/** Static origin sent to main backend – must match main backend's allowed origin (e.g. main app URL). */
const ORIGIN_FOR_MAIN_BACKEND = process.env.IFRAME_MAIN_ORIGIN || process.env.MAIN_APP_ORIGIN || 'https://reporting-demo-system-frontend.pianat.ai';
const JWT_EXPIRES_IN = '2h';

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
    const isHttps = MAIN_BACKEND_URL.startsWith('https://');
    
    if (allowSelfSigned && isHttps && https && https.Agent) {
      config.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
    }

    return config;
  }

  async createTokenFromIet(iet: string, moduleId: string, _origin: string): Promise<CreateTokenFromIetResult> {
  
    
      const base = MAIN_BACKEND_URL.replace(/\/+$/, '');
      const url = `${base}/entry/validate`;
  
      
   
   
    

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
          console.warn(
            `[IET] CASE=${reason} | FIX: ${reason === 'invalid_origin' ? 'Match origin (e.g. https://demo.pianat.ai)' : reason === 'expired' ? 'Open Reporting again (IET TTL may be 30s – consider increasing on main backend)' : reason === 'already_used' ? 'Fresh IET, avoid double submit or second tab' : reason === 'no_row' ? fixNoRow : 'See main backend'}`,
          );
        }
        return { ok: false, reason: reason ?? 'invalid_iet' };
      }

      const userId = res.data.user_id;
      const groupName = res.data.group_name ?? res.data.groupName ?? undefined;
      const role = res.data.role ?? undefined;
      const isAdmin = res.data.is_admin ?? res.data.isAdmin ?? undefined;
      const token = this.jwtService.sign(
        { id: userId, groupName, role, isAdmin },
        { expiresIn: JWT_EXPIRES_IN },
      );
      const expiresInSeconds = 2 * 60 * 60; // 2 hours in seconds
      return { ok: true, token, expiresIn: expiresInSeconds, userId };
    } catch (err) {
      console.warn('[IET] createTokenFromIet request failed', (err as Error)?.message ?? err);
      return { ok: false, reason: 'invalid_iet' };
    }
  }
}
