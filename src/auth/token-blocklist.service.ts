import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * The shared `blocked_tokens` MSSQL table populated by DCC (`new_adib_backend`'s
 * `TokenManagementService.blockUserToken`). Same idea as DCC's `isTokenBlocked`; reporting
 * also inserts its own token on logout (`blockToken`), so a logged-out token stays refused
 * here and in the Python service until it expires.
 *
 * Schema (from DCC): id UNIQUEIDENTIFIER, token NVARCHAR(MAX), userId UNIQUEIDENTIFIER,
 * blockedAt DATETIME2, expiresAt DATETIME2, createdAt DATETIME2, updatedAt DATETIME2.
 */
@Injectable()
export class TokenBlocklistService {
  private readonly logger = new Logger(TokenBlocklistService.name);

  constructor(private readonly db: DatabaseService) {}

  /** True if the JWT was revoked and is still within the blocklist TTL. A failed lookup counts as revoked. */
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
      // Fail-closed: if revocation cannot be checked, the token is not accepted.
      this.logger.error(
        `[Reporting][Blocklist] DB query failed (denying token): ${(err as Error)?.message ?? err}`,
      );
      return true;
    }
  }

  /**
   * Revoke a token (logout), the way DCC's `blockUserToken` does: one `blocked_tokens` row kept
   * until the token's own expiry. Throws on DB error; the caller logs it.
   */
  async blockToken(token: string, userId: string, expiresAt: Date): Promise<void> {
    if (!token || !token.trim() || !userId) return;
    await this.db.query(
      `IF NOT EXISTS (SELECT 1 FROM dbo.blocked_tokens WHERE token = @param0)
         INSERT INTO dbo.blocked_tokens (id, token, userId, blockedAt, expiresAt, createdAt, updatedAt)
         VALUES (NEWID(), @param0, @param1, SYSUTCDATETIME(), @param2, SYSUTCDATETIME(), SYSUTCDATETIME())`,
      [token.trim(), userId, expiresAt],
      'TokenBlocklist.blockToken',
    );
  }
}
