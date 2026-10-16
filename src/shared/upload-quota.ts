/**
 * Per-user upload quota (R-WAPT02). Same code as new_adib_backend
 * src/upload/upload-rate-limit.service.ts + upload-quota.guard.ts: both apps count in one table, dbo.upload_quota_usage, so a user has
 * one quota across the apps and every instance, and a restart does not reset it. Fixed hour and day
 * windows (UTC), so short delays (e.g. 10s) between uploads cannot get round the limits.
 *
 * Settings (.env), read on every upload, so a change applies without a rebuild:
 *   UPLOAD_LIMIT_PER_HOUR   uploads per user per hour                       (default 50)
 *   UPLOAD_LIMIT_PER_DAY    uploads per user per day                        (default 100)
 *   UPLOAD_MB_PER_HOUR      megabytes per user per hour, 0 = no size quota  (default 1024)
 *   UPLOAD_MB_PER_DAY       megabytes per user per day, 0 = no size quota   (default 2048)
 *   UPLOAD_QUOTA_STORE      db | memory (memory = this instance only)       (default db)
 *   UPLOAD_QUOTA_KEEP_DAYS  days of counter rows kept in the table          (default 2)
 * The size counted is the request's Content-Length, known before the file is read.
 * If the table cannot be used, this instance's memory is used instead (logged), so uploads stay
 * limited and never fail because of the counter.
 *
 * Also here: UPLOAD_MAX_FILE_MB (default 50), the per-file size limit, read per request too, like
 * new_adib_backend src/validateUploads/upload-file-filter.ts.
 */

import {
  CallHandler,
  CanActivate,
  ExecutionContext,
  Global,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Module,
  NestInterceptor,
  Type,
  mixin,
} from '@nestjs/common';
import { transformException } from '@nestjs/platform-express/multer/multer/multer.utils';
import multer = require('multer');
import { Observable } from 'rxjs';
import { DatabaseService } from '../database/database.service';

const MB = 1024 * 1024;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

type OverLimit = 'hour' | 'day' | 'hour_mb' | 'day_mb';

interface WindowBucket {
  count: number;
  bytes: number;
  windowStart: number;
}

interface UserBuckets {
  hour: WindowBucket;
  day: WindowBucket;
}

function intSetting(name: string, defaultValue: number, min: number): number {
  const raw = process.env[name];
  const n = raw == null || raw.trim() === '' ? NaN : Number(raw);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : defaultValue;
}

/** Current quota settings; read per call, not at load (.env.enc is decrypted after the code loads). */
export function uploadQuotaSettings() {
  return {
    perHour: intSetting('UPLOAD_LIMIT_PER_HOUR', 50, 1),
    perDay: intSetting('UPLOAD_LIMIT_PER_DAY', 100, 1),
    bytesPerHour: intSetting('UPLOAD_MB_PER_HOUR', 1024, 0) * MB,
    bytesPerDay: intSetting('UPLOAD_MB_PER_DAY', 2048, 0) * MB,
    store: (process.env.UPLOAD_QUOTA_STORE || 'db').trim().toLowerCase() === 'memory' ? 'memory' : 'db',
    keepDays: intSetting('UPLOAD_QUOTA_KEEP_DAYS', 2, 1),
  };
}

type QuotaSettings = ReturnType<typeof uploadQuotaSettings>;

/** Upload size of a request before its body is read (0 when the client sends no Content-Length). */
export function requestUploadBytes(request: any): number {
  const n = Number(request?.headers?.['content-length']);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const ENSURE_TABLE_SQL = `
IF OBJECT_ID(N'dbo.upload_quota_usage', N'U') IS NULL
CREATE TABLE dbo.upload_quota_usage (
  user_id NVARCHAR(64) NOT NULL,
  window_kind VARCHAR(4) NOT NULL,
  window_start BIGINT NOT NULL,
  requests INT NOT NULL,
  bytes BIGINT NOT NULL,
  updated_at DATETIME2 NOT NULL,
  CONSTRAINT PK_upload_quota_usage PRIMARY KEY (user_id, window_kind, window_start)
)`;

/** Check both windows and count the upload in one transaction; returns the window that is full, if any. */
const CONSUME_SQL = `
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRAN;
DECLARE @hr INT = 0, @hb BIGINT = 0, @dr INT = 0, @db BIGINT = 0, @over VARCHAR(8) = NULL;
SELECT @hr = requests, @hb = bytes FROM dbo.upload_quota_usage WITH (UPDLOCK, HOLDLOCK)
  WHERE user_id = @u AND window_kind = 'hour' AND window_start = @hw;
SELECT @dr = requests, @db = bytes FROM dbo.upload_quota_usage WITH (UPDLOCK, HOLDLOCK)
  WHERE user_id = @u AND window_kind = 'day' AND window_start = @dw;
IF @hr + 1 > @mh SET @over = 'hour'
ELSE IF @dr + 1 > @md SET @over = 'day'
ELSE IF @mbh > 0 AND @hb + @b > @mbh SET @over = 'hour_mb'
ELSE IF @mbd > 0 AND @db + @b > @mbd SET @over = 'day_mb';
IF @over IS NULL
BEGIN
  UPDATE dbo.upload_quota_usage SET requests = requests + 1, bytes = bytes + @b, updated_at = SYSUTCDATETIME()
    WHERE user_id = @u AND window_kind = 'hour' AND window_start = @hw;
  IF @@ROWCOUNT = 0
    INSERT INTO dbo.upload_quota_usage (user_id, window_kind, window_start, requests, bytes, updated_at)
    VALUES (@u, 'hour', @hw, 1, @b, SYSUTCDATETIME());
  UPDATE dbo.upload_quota_usage SET requests = requests + 1, bytes = bytes + @b, updated_at = SYSUTCDATETIME()
    WHERE user_id = @u AND window_kind = 'day' AND window_start = @dw;
  IF @@ROWCOUNT = 0
    INSERT INTO dbo.upload_quota_usage (user_id, window_kind, window_start, requests, bytes, updated_at)
    VALUES (@u, 'day', @dw, 1, @b, SYSUTCDATETIME());
END
COMMIT;
SELECT @over AS over_limit;`;

const CLEANUP_SQL = `DELETE FROM dbo.upload_quota_usage WHERE updated_at < DATEADD(DAY, -@param0, SYSUTCDATETIME())`;

@Injectable()
export class UploadRateLimitService {
  private readonly logger = new Logger(UploadRateLimitService.name);
  private readonly store = new Map<string, UserBuckets>();
  private tableReady: Promise<void> | null = null;
  private lastCleanup = 0;
  private lastFallbackLog = 0;

  constructor(private readonly db: DatabaseService) {}

  /**
   * Count one upload of `bytes` for the user. Throws 429 when an hour or day quota is full.
   */
  async checkAndIncrement(userId: string, bytes: number = 0): Promise<void> {
    const settings = uploadQuotaSettings();
    const user = String(userId).trim().toLowerCase();
    const size = Math.max(0, Math.floor(bytes || 0));
    const now = Date.now();
    const hourWindow = Math.floor(now / MS_PER_HOUR) * MS_PER_HOUR;
    const dayWindow = Math.floor(now / MS_PER_DAY) * MS_PER_DAY;

    let over: OverLimit | null;
    if (settings.store === 'memory') {
      over = this.consumeInMemory(user, size, now, hourWindow, dayWindow, settings);
    } else {
      try {
        over = await this.consumeInDb(user, size, hourWindow, dayWindow, settings);
      } catch (err) {
        if (now - this.lastFallbackLog > 5 * 60 * 1000) {
          this.lastFallbackLog = now;
          this.logger.warn(`Upload quota table unavailable, counting in memory: ${(err as Error)?.message ?? err}`);
        }
        over = this.consumeInMemory(user, size, now, hourWindow, dayWindow, settings);
      }
    }
    if (over) this.reject(over, settings);
  }

  private async consumeInDb(
    user: string, bytes: number, hourWindow: number, dayWindow: number, s: QuotaSettings,
  ): Promise<OverLimit | null> {
    await this.ensureTable();
    const rows: any[] = await this.db.query(
      `DECLARE @u NVARCHAR(64) = @param0, @hw BIGINT = @param1, @dw BIGINT = @param2, @b BIGINT = @param3,
         @mh INT = @param4, @md INT = @param5, @mbh BIGINT = @param6, @mbd BIGINT = @param7;` + CONSUME_SQL,
      [user, hourWindow, dayWindow, bytes, s.perHour, s.perDay, s.bytesPerHour, s.bytesPerDay],
      'UploadQuota.consume',
    );
    this.cleanupOldRows(s.keepDays);
    return (rows?.[rows.length - 1]?.over_limit as OverLimit) ?? null;
  }

  private ensureTable(): Promise<void> {
    if (!this.tableReady) {
      this.tableReady = this.db
        .query(ENSURE_TABLE_SQL, [], 'UploadQuota.ensureTable')
        .catch(async (err) => {
          // the other app may have created it at the same moment
          const found: any[] = await this.db.query(`SELECT OBJECT_ID(N'dbo.upload_quota_usage', N'U') AS id`);
          if (!found?.[0]?.id) throw err;
        })
        .then(() => undefined)
        .catch((err) => {
          this.tableReady = null; // retry on the next upload
          throw err;
        });
    }
    return this.tableReady;
  }

  /** At most once an hour per instance; failures are ignored (the next run retries). */
  private cleanupOldRows(keepDays: number): void {
    const now = Date.now();
    if (now - this.lastCleanup < MS_PER_HOUR) return;
    this.lastCleanup = now;
    this.db.query(CLEANUP_SQL, [keepDays], 'UploadQuota.cleanup').catch(() => undefined);
  }

  private consumeInMemory(
    user: string, bytes: number, now: number, hourWindow: number, dayWindow: number, s: QuotaSettings,
  ): OverLimit | null {
    let buckets = this.store.get(user);
    if (!buckets) {
      buckets = {
        hour: { count: 0, bytes: 0, windowStart: hourWindow },
        day: { count: 0, bytes: 0, windowStart: dayWindow },
      };
      this.store.set(user, buckets);
    }
    // Reset if we're in a new window
    if (now - buckets.hour.windowStart >= MS_PER_HOUR) buckets.hour = { count: 0, bytes: 0, windowStart: hourWindow };
    if (now - buckets.day.windowStart >= MS_PER_DAY) buckets.day = { count: 0, bytes: 0, windowStart: dayWindow };

    if (buckets.hour.count + 1 > s.perHour) return 'hour';
    if (buckets.day.count + 1 > s.perDay) return 'day';
    if (s.bytesPerHour > 0 && buckets.hour.bytes + bytes > s.bytesPerHour) return 'hour_mb';
    if (s.bytesPerDay > 0 && buckets.day.bytes + bytes > s.bytesPerDay) return 'day_mb';
    buckets.hour.count += 1;
    buckets.hour.bytes += bytes;
    buckets.day.count += 1;
    buckets.day.bytes += bytes;
    return null;
  }

  private reject(over: OverLimit, s: QuotaSettings): never {
    const messages: Record<OverLimit, string> = {
      hour: `Upload limit exceeded: maximum ${s.perHour} upload requests per hour. Try again later.`,
      day: `Upload limit exceeded: maximum ${s.perDay} upload requests per day. Try again tomorrow.`,
      hour_mb: `Upload limit exceeded: maximum ${s.bytesPerHour / MB} MB of uploads per hour. Try again later.`,
      day_mb: `Upload limit exceeded: maximum ${s.bytesPerDay / MB} MB of uploads per day. Try again tomorrow.`,
    };
    throw new HttpException(
      { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: messages[over], error: 'Too Many Requests' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/** Must run after authentication (the global JwtAuthGuard) so req.user is set. */
@Injectable()
export class UploadQuotaGuard implements CanActivate {
  constructor(private readonly uploadRateLimitService: UploadRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    if (!user?.id) return true; // the auth guard handles unauthenticated requests
    // runs before the file interceptor, so the size is the request's Content-Length
    await this.uploadRateLimitService.checkAndIncrement(String(user.id), requestUploadBytes(request));
    return true;
  }
}

/** UPLOAD_MAX_FILE_MB in bytes, read per request (missing, zero or non-numeric -> 50). */
export const uploadMaxFileBytes = (): number => {
  const mb = Number(process.env.UPLOAD_MAX_FILE_MB);
  return Math.round((Number.isFinite(mb) && mb > 0 ? mb : 50) * MB);
};

/**
 * FileInterceptor whose multer options are built per request, so limits follow .env without a
 * restart (this multer version only takes a fixed `limits` object). Errors map like Nest's own.
 */
export function PerRequestFileInterceptor(fieldName: string, options: () => multer.Options): Type<NestInterceptor> {
  @Injectable()
  class Interceptor implements NestInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
      const ctx = context.switchToHttp();
      await new Promise<void>((resolve, reject) =>
        multer(options()).single(fieldName)(ctx.getRequest(), ctx.getResponse(), (err: unknown) =>
          err ? reject(transformException(err as Error)) : resolve(),
        ),
      );
      return next.handle();
    }
  }
  return mixin(Interceptor);
}

@Global()
@Module({
  providers: [UploadRateLimitService, UploadQuotaGuard],
  exports: [UploadRateLimitService, UploadQuotaGuard],
})
export class UploadQuotaModule {}
