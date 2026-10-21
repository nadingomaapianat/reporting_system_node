import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { fq } from '../shared/db-config';

/**
 * How long a user's session-active status is reused before re-reading `Users`.
 * Short (10s) so a logout / admin force-logout in the main app (DCC) reaches reporting
 * within seconds — the way the main front and compliance follow a logout almost instantly.
 * Override with REPORTING_SESSION_CACHE_MS.
 */
const SESSION_CACHE_TTL_MS = Number(process.env.REPORTING_SESSION_CACHE_MS) || 10_000;

type CacheEntry = { active: boolean; expires: number };

/**
 * Ties a reporting request to the MAIN app's single server-side session.
 *
 * The main backend (new_adib_backend) sets `Users.isSessionActive = true` on login and clears
 * `isSessionActive` + `currentToken` TOGETHER on logout, admin force-logout, force-logout-all,
 * and the expired-session cleanup. Reporting mints its OWN 2h JWT from the entry token (IET),
 * which the main app cannot individually revoke on the admin paths. So instead of trying to
 * blocklist the reporting token, reporting checks the shared session flag here: once the main
 * session ends, reporting stops accepting the user's token on its next request
 * (within SESSION_CACHE_TTL_MS). This is what makes reporting follow a logout like the other
 * two apps.
 *
 * Both columns are required: `isSessionActive` can be left stale-true in the row when a JWT
 * simply expires (see DCC TokenManagementService), but `currentToken` is always nulled on a
 * real logout, so `isSessionActive = 1 AND currentToken IS NOT NULL` is the reliable test.
 */
@Injectable()
export class UserSessionService {
  private readonly logger = new Logger(UserSessionService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly db: DatabaseService) {}

  /** True if the user's main-app session is still active. Fail-closed on DB error. */
  async isActive(userId: string): Promise<boolean> {
    if (!userId || !String(userId).trim()) return false;
    const id = String(userId).trim();

    const now = Date.now();
    const hit = this.cache.get(id);
    if (hit && hit.expires > now) return hit.active;

    let active: boolean;
    try {
      const rows = await this.db.query(
        `SELECT TOP 1 1 AS hit
         FROM ${fq('Users')} u
         WHERE u.id = @param0
           AND u.deletedAt IS NULL
           AND u.isSessionActive = 1
           AND u.currentToken IS NOT NULL`,
        [id],
        'UserSession.isActive',
      );
      active = Array.isArray(rows) && rows.length > 0;
    } catch (err) {
      // Fail-closed, consistent with TokenBlocklistService: a session that cannot be checked is
      // not accepted. Not cached, so the next request re-checks as soon as the DB is back.
      this.logger.error(
        `[Reporting][UserSession] DB check failed (denying): ${(err as Error)?.message ?? err}`,
      );
      return false;
    }

    this.cache.set(id, { active, expires: now + SESSION_CACHE_TTL_MS });
    return active;
  }
}
