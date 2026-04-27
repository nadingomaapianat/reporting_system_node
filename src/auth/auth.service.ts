import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { fq } from '../shared/db-config';
import axios from 'axios';
import * as https from 'https';


const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || process.env.NEXT_PUBLIC_NODE_API_URL || 'https://uat-backend.adib.co.eg';


/** Path on main backend for IET exchange (some gateways mount under `/api`). */
const MAIN_BACKEND_ENTRY_VALIDATE_PATH =
  process.env.MAIN_BACKEND_ENTRY_VALIDATE_PATH || '/entry/validate';
/** Optional second hop when validate omits permissions (requires main `POST …/entry/reporting-permissions` + shared secret). */
const MAIN_BACKEND_REPORTING_PERMISSIONS_PATH =
  process.env.MAIN_BACKEND_REPORTING_PERMISSIONS_PATH || '/entry/reporting-permissions';
/** Static origin sent to main backend – must match main backend's allowed origin (e.g. main app URL). */
const ORIGIN_FOR_MAIN_BACKEND = process.env.IFRAME_MAIN_ORIGIN || process.env.MAIN_APP_ORIGIN || 'https://grc-reporting-uat.adib.co.eg';
const JWT_EXPIRES_IN = '2h';

/** Result of IET validation: success with token, or failure with reason. */
export type CreateTokenFromIetResult =
  | { ok: true; token: string; expiresIn: number; userId: string }
  | { ok: false; reason: string };

/**
 * Validate IET with main backend and mint a reporting JWT.
 * If the main backend does not return permissions[], query the shared database
 * directly (Users → Groups) to embed the correct permissions in the token.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DatabaseService,
  ) {}

  private getAxiosConfig() {
    const config: any = {
      headers: {
        Origin: ORIGIN_FOR_MAIN_BACKEND,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
      timeout: 15000,
    };

    const allowSelfSigned =
      process.env.NODE_ENV === 'development' ||
      process.env.ALLOW_SELF_SIGNED_CERTS === 'true';
    const isHttps = MAIN_BACKEND_URL.startsWith('https://');

    if (allowSelfSigned && isHttps && https?.Agent) {
      config.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }

    return config;
  }

  /**
   * Fetch permissions from the shared MSSQL database by user_id.
   * Schema: Users.groupId → Groups.permissions (JSON array of DCC page permission rows).
   * Returns the parsed permissions array, or null if the user/group cannot be found.
   */
  private async fetchPermissionsFromDb(
    userId: string,
  ): Promise<{ permissions: unknown[]; groupName: string } | null> {
    try {
      const rows = await this.db.query(
        `SELECT g.name AS groupName, g.permissions AS permissionsJson
         FROM ${fq('Users')} u
         JOIN ${fq('Groups')} g ON g.id = u.groupId
         WHERE u.id = @param0
           AND u.deletedAt IS NULL
           AND g.deletedAt IS NULL`,
        [userId],
      );

      if (!rows || rows.length === 0) {
        this.logger.warn(
          `[Auth] DB permissions lookup: no user/group found for user_id=${userId}`,
        );
        return null;
      }

      const row = rows[0];
      const groupName: string = row.groupName ?? '';
      const raw: string = row.permissionsJson ?? '';

      if (!raw) {
        this.logger.warn(
          `[Auth] DB permissions lookup: Groups.permissions is empty for user_id=${userId} group=${groupName}`,
        );
        return { permissions: [], groupName };
      }

      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.logger.log(
            `[Auth] DB permissions loaded: user_id=${userId} group=${groupName} count=${parsed.length}`,
          );
          return { permissions: parsed, groupName };
        }
        this.logger.warn(
          `[Auth] DB permissions: parsed value is not an array for user_id=${userId}`,
        );
        return { permissions: [], groupName };
      } catch {
        this.logger.warn(
          `[Auth] DB permissions: JSON parse failed for user_id=${userId} raw_preview=${raw.slice(0, 80)}`,
        );
        return null;
      }
    } catch (err) {
      this.logger.warn(
        `[Auth] DB permissions query failed for user_id=${userId}: ${(err as Error)?.message ?? err}`,
      );
      return null;
    }
  }


  

  async createTokenFromIet(
    iet: string,
    moduleId: string,
    _origin: string,
  ): Promise<CreateTokenFromIetResult> {
    const base = MAIN_BACKEND_URL.replace(/\/+$/, '');
    const url = `${base}/entry/validate`;

    try {
      const res = await axios.post(
        url,
        { iet, module_id: moduleId },
        this.getAxiosConfig(),
      );

      const reason = (res.data as { reason?: string })?.reason;
      const success =
        (res.status === 200 || res.status === 201) &&
        res.data?.success &&
        res.data?.user_id;

      if (!success) {
        console.warn(
          `[IET] main_backend response status=${res.status} reason=${reason ?? '(none)'} body=${JSON.stringify(res.data)}`,
        );
        if (res.status === 403 && reason) {
          const fixNoRow =
            'MAIN_BACKEND_URL (here) must equal main app NEXT_PUBLIC_BASE_URL; run migration; restart; open Reporting from main app (do not paste IET from another tab)';
          
        }
        return { ok: false, reason: reason ?? 'invalid_iet' };
      }

      const userId: string = res.data.user_id;
      let groupName: string | undefined =
        res.data.group_name ?? res.data.groupName ?? undefined;
      const role: string | undefined = res.data.role ?? undefined;
      const isAdmin: boolean | undefined =
        res.data.is_admin ?? res.data.isAdmin ?? undefined;

      // Permissions from validate response (may be absent)
      let permissions: unknown[] | undefined;
      const permissionsRaw =
        res.data.permissions ??
        res.data.group_permissions ??
        res.data.user_permissions;
      if (Array.isArray(permissionsRaw) && permissionsRaw.length > 0) {
        permissions = permissionsRaw;
      }

      // If validate did not return permissions, fetch from shared database
      if (!permissions || permissions.length === 0) {
        this.logger.warn(
          `[IET] validate returned no permissions for user_id=${userId} — querying shared DB`,
        );
        const dbResult = await this.fetchPermissionsFromDb(userId);
        if (dbResult) {
          permissions = dbResult.permissions;
          // Also pick up groupName from DB if not in validate response
          if (!groupName) groupName = dbResult.groupName;
        }
      }

      const payload: Record<string, unknown> = {
        id: userId,
        groupName,
        role,
        isAdmin,
      };
      if (Array.isArray(permissions) && permissions.length > 0) {
        payload.permissions = permissions;
        this.logger.log(
          `[IET] JWT minted with ${permissions.length} permission rows for user_id=${userId}`,
        );
      } else {
        this.logger.warn(
          `[IET] JWT minted WITHOUT permissions for user_id=${userId} — check DB or validate response`,
        );
      }

      const token = this.jwtService.sign(payload, { expiresIn: JWT_EXPIRES_IN });
      const expiresInSeconds = 2 * 60 * 60;
      return { ok: true, token, expiresIn: expiresInSeconds, userId };
    } catch (err) {
      console.warn(
        '[IET] createTokenFromIet request failed',
        (err as Error)?.message ?? err,
      );
      return { ok: false, reason: 'invalid_iet' };
    }
  }
}
