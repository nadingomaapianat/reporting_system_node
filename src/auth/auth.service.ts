import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as https from 'https';

const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || process.env.NEXT_PUBLIC_NODE_API_URL || 'https://uat-backend.adib.co.eg';
/** Static origin sent to main backend – must match main backend's allowed origin (e.g. main app URL). */
const ORIGIN_FOR_MAIN_BACKEND = process.env.IFRAME_MAIN_ORIGIN || process.env.MAIN_APP_ORIGIN || 'https://grc-reporting-uat.adib.co.eg';
const JWT_EXPIRES_IN = '2h';

/** Result of IET validation: success with token, or failure with reason from main backend. */
export type CreateTokenFromIetResult =
  | { ok: true; token: string; expiresIn: number; userId: string }
  | { ok: false; reason: string };

/**
 * Validate IET with main backend and create a JWT for reporting_system_node so the frontend can call our APIs.
 * Sends Origin = main app (IFRAME_MAIN_ORIGIN), not the reporting frontend origin, so main backend allows the request.
 */
function nonEmptyPermissionsArray(v: unknown): unknown[] | undefined {
  return Array.isArray(v) && v.length > 0 ? v : undefined;
}

/** Compare DCC group names tolerating trailing underscores / spacing. */
function normalizeGroupName(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/_+$/g, '');
}

/**
 * When `data` is a catalog of groups `[{ id, name, permissions: [...] }, ...]`, pick the row
 * for the current user using `group_id` / `groupId` or `group_name` / `groupName` (or nested `group`).
 */
function pickPermissionsFromGroupCatalog(body: Record<string, unknown>, catalog: unknown[]): unknown[] | undefined {
  const nestedGroup = body.group;
  let nestedGroupRec: Record<string, unknown> | undefined;
  if (nestedGroup && typeof nestedGroup === 'object' && !Array.isArray(nestedGroup)) {
    nestedGroupRec = nestedGroup as Record<string, unknown>;
  }

  const groupId =
    body.group_id ??
    body.groupId ??
    body.permission_group_id ??
    body.permissionGroupId ??
    nestedGroupRec?.id;

  if (groupId != null && String(groupId).length > 0) {
    const idStr = String(groupId);
    for (const item of catalog) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      if (row.id != null && String(row.id) === idStr) {
        const perms = nonEmptyPermissionsArray(row.permissions);
        if (perms) return perms;
      }
    }
  }

  const nameCandidates = [
    body.group_name,
    body.groupName,
    body.role_name,
    body.roleName,
    nestedGroupRec?.name,
  ].filter((x) => x != null && String(x).trim() !== '');

  for (const nameRaw of nameCandidates) {
    const target = normalizeGroupName(nameRaw);
    if (!target) continue;
    for (const item of catalog) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const perms = nonEmptyPermissionsArray(row.permissions);
      if (!perms) continue;
      if (normalizeGroupName(row.name) === target) return perms;
    }
  }

  return undefined;
}

/**
 * DCC page rows from main `POST /entry/validate` body. Main apps vary:
 * top-level `permissions`, nested `group.permissions` / `user.permissions`, `data.permissions`,
 * or `data` as an array of groups (resolved by group id / name).
 */
function extractPermissionsFromValidateBody(body: Record<string, unknown>): unknown[] | undefined {
  if (body.result && typeof body.result === 'object' && !Array.isArray(body.result)) {
    const merged = { ...body, ...(body.result as Record<string, unknown>) } as Record<string, unknown>;
    delete merged.result;
    const fromWrapped = extractPermissionsFromValidateBody(merged);
    if (fromWrapped) return fromWrapped;
  }

  const direct =
    nonEmptyPermissionsArray(body.permissions) ??
    nonEmptyPermissionsArray(body.group_permissions) ??
    nonEmptyPermissionsArray(body.user_permissions);
  if (direct) return direct;

  const group = body.group;
  if (group && typeof group === 'object' && !Array.isArray(group)) {
    const inner = nonEmptyPermissionsArray((group as Record<string, unknown>).permissions);
    if (inner) return inner;
  }

  const user = body.user;
  if (user && typeof user === 'object' && !Array.isArray(user)) {
    const u = user as Record<string, unknown>;
    const inner = nonEmptyPermissionsArray(u.permissions);
    if (inner) return inner;
    if (Array.isArray(u.data) && u.data.length > 0) {
      const fromUserCatalog = pickPermissionsFromGroupCatalog({ ...body, ...u }, u.data as unknown[]);
      if (fromUserCatalog) return fromUserCatalog;
    }
  }

  const data = body.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const inner = nonEmptyPermissionsArray((data as Record<string, unknown>).permissions);
    if (inner) return inner;
  }

  if (Array.isArray(data) && data.length > 0) {
    const userPlain = body.user;
    const mergedForCatalog =
      userPlain && typeof userPlain === 'object' && !Array.isArray(userPlain)
        ? ({ ...body, ...(userPlain as Record<string, unknown>) } as Record<string, unknown>)
        : body;
    const fromCatalog = pickPermissionsFromGroupCatalog(mergedForCatalog, data);
    if (fromCatalog) return fromCatalog;
  }

  return undefined;
}

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
            `[IET] CASE=${reason} | FIX: ${reason === 'invalid_origin' ? 'Match origin (e.g. https://grc-dcc-uat.adib.co.eg)' : reason === 'expired' ? 'Open Reporting again (IET TTL may be 30s – consider increasing on main backend)' : reason === 'already_used' ? 'Fresh IET, avoid double submit or second tab' : reason === 'no_row' ? fixNoRow : 'See main backend'}`,
          );
        }
        return { ok: false, reason: reason ?? 'invalid_iet' };
      }

      const userId = res.data.user_id;
      const groupName = res.data.group_name ?? res.data.groupName ?? undefined;
      const role = res.data.role ?? undefined;
      const isAdmin = res.data.is_admin ?? res.data.isAdmin ?? undefined;
      const permissionsRaw = extractPermissionsFromValidateBody(res.data as Record<string, unknown>);
      const payload: Record<string, unknown> = {
        id: userId,
        groupName,
        role,
        isAdmin,
      };
      if (permissionsRaw?.length) {
        payload.permissions = permissionsRaw;
      } else {
        console.warn(
          `[IET] validate success but no permissions[] for JWT; reporting APIs will 403 on @Permissions routes. ` +
            `Ensure /entry/validate returns flat permissions, nested group.permissions, or data[] catalog + group_id/group_name. ` +
            `response_keys=${Object.keys(res.data as object).join(',')}`,
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
