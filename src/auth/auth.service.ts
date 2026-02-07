import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';

const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || process.env.NEXT_PUBLIC_NODE_API_URL || 'http://localhost:5040';
/** Static origin sent to main backend – must match main backend's allowed origin (e.g. main app URL). */
const ORIGIN_FOR_MAIN_BACKEND = 'http://localhost:5050';
const JWT_EXPIRES_IN = '2h';

/**
 * Validate IET with main backend and create a JWT for reporting_system_node so the frontend can call our APIs.
 * Sends Origin = main app (IFRAME_MAIN_ORIGIN), not the reporting frontend origin, so main backend allows the request.
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async createTokenFromIet(iet: string, moduleId: string, _origin: string): Promise<{ token: string; expiresIn: number; userId: string } | null> {
    const base = MAIN_BACKEND_URL.replace(/\/+$/, '');
    const url = `${base}/entry/validate`;

    // console.log('iet', iet);
    // console.log('moduleId', moduleId);
    // console.log('origin', _origin);

    // console.log('url', url);

    try {
      // POST with IET in body to avoid query-string encoding issues (no_row can be caused by mangled IET in GET)
      const res = await axios.post(
        url,
        { iet: iet, module_id: moduleId },
        {
          headers: {
            Origin: ORIGIN_FOR_MAIN_BACKEND,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        },
      );
    
      if (res.status === 403) {
        const reason = (res.data as { reason?: string })?.reason;
        if (reason) {
          const fixNoRow = 'MAIN_BACKEND_URL (here) must equal main app NEXT_PUBLIC_BASE_URL; run migration on main backend; restart main backend; open Reporting from main app (do not paste IET from another tab)';
          console.warn(`[IET] CASE=${reason} (from main backend) | FIX: ${reason === 'invalid_origin' ? 'Match origin (e.g. http://localhost:5050)' : reason === 'expired' ? 'Open Reporting again (< 90s)' : reason === 'already_used' ? 'Fresh IET, avoid double submit' : reason === 'no_row' ? fixNoRow : 'See main backend terminal'}`);
        } else {
          console.warn(
            '[IET] Main backend returned 403 (no reason in body). Check MAIN BACKEND terminal for [IET] CASE=...',
          );
        }
      }

      if ((res.status !== 200 && res.status !== 201) || !res.data?.success || !res.data?.user_id) {
        return null;
      }

      const userId = res.data.user_id;
      const token = this.jwtService.sign(
        { id: userId },
        { expiresIn: JWT_EXPIRES_IN },
      );
      const expiresInSeconds = 2 * 60 * 60; // 2 hours in seconds

      // console.log('userId', userId);
      // console.log('token', token);
      // console.log('expiresInSeconds', expiresInSeconds);
     
      return { token, expiresIn: expiresInSeconds, userId };
    } catch {
      return null;
    }
  }
}
