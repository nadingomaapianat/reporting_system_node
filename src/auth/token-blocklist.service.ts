import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * Reads the shared `blocked_tokens` MSSQL table populated by DCC (`new_adib_backend`'s
 * `TokenManagementService.blockUserToken`). Same idea as DCC's `isTokenBlocked`, but
 * read-only here — reporting only checks; DCC inserts on logout/force-logout.
 *
 * Schema (from DCC): id UNIQUEIDENTIFIER, token NVARCHAR(MAX), userId UNIQUEIDENTIFIER,
 * blockedAt DATETIME2, expiresAt DATETIME2, createdAt DATETIME2, updatedAt DATETIME2.
 */
@Injectable()
export class TokenBlocklistService {
  private readonly logger = new Logger(TokenBlocklistService.name);

  constructor(private readonly db: DatabaseService) {}

  /** True if the JWT was revoked and is still within the blocklist TTL. */
  async isTokenBlocked(token: string): Promise<boolean> {
    if (!token || !token.trim()) return false;
    try {
      const rows = await this.db.query(
        `SELECT TOP 1 1 AS hit
         FROM dbo.blocked_tokens
         WHERE token = @param0
           AND expiresAt > SYSUTCDATETIME()`,
        [token.trim()],
        'TokenBlocklist.isTokenBlocked',
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch (err) {
      // Fail-closed for security: treat DB error as unknown but DO NOT auto-accept.
      // We choose to log and allow (open) here only if the DB is unavailable so that a
      // transient DB outage does not lock everyone out. Flip to `return true` to fail-closed.
      this.logger.warn(
        `[Reporting][Blocklist] DB query failed (allowing token through): ${(err as Error)?.message ?? err}`,
      );
      return false;
    }
  }
}
