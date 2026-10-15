import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { fq } from '../shared/db-config';

/** How long a user's group permissions are reused before re-reading `Groups`. */
const CACHE_TTL_MS = Number(process.env.REPORTING_PERMISSIONS_CACHE_MS) || 60_000;

type CacheEntry = { permissions: unknown[]; expires: number };

/**
 * The caller's DCC page permissions, read live from the main app's `Users → Groups.permissions`
 * (the rows the main backend's group service edits), instead of the copy frozen into the
 * reporting JWT at entry. A change in the permission matrix reaches reporting within one TTL.
 *
 * Returns:
 *   - the group's rows (possibly empty) when the user/group was found,
 *   - `[]` when the user or group no longer exists (deleted users get nothing),
 *   - `null` only when the lookup itself failed — the caller keeps the token's rows then.
 */
@Injectable()
export class LivePermissionsService {
  private readonly logger = new Logger(LivePermissionsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly db: DatabaseService) {}

  async forUser(userId: string): Promise<unknown[] | null> {
    const now = Date.now();
    const hit = this.cache.get(userId);
    if (hit && hit.expires > now) return hit.permissions;

    let permissions: unknown[];
    try {
      const rows = await this.db.query(
        `SELECT g.permissions AS permissionsJson
         FROM ${fq('Users')} u
         JOIN ${fq('Groups')} g ON g.id = u.groupId
         WHERE u.id = @param0
           AND u.deletedAt IS NULL
           AND g.deletedAt IS NULL`,
        [userId],
      );
      const raw = rows?.[0]?.permissionsJson;
      if (!raw) {
        permissions = [];
      } else {
        const parsed = JSON.parse(raw);
        permissions = Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      this.logger.warn(
        `[LivePermissions] lookup failed for user_id=${userId}: ${(err as Error)?.message ?? err}`,
      );
      return null;
    }

    this.cache.set(userId, { permissions, expires: now + CACHE_TTL_MS });
    return permissions;
  }
}
