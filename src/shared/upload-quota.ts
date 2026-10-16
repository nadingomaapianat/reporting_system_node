/**
 * Per-user upload quota (R-WAPT02) — same rules and settings as new_adib_backend
 * (src/upload/upload-rate-limit.service.ts, upload-quota.guard.ts): fixed hour and day windows,
 * UPLOAD_LIMIT_PER_HOUR (default 50) and UPLOAD_LIMIT_PER_DAY (default 100), so short delays
 * between uploads cannot get round it. Global module: one quota for every upload route.
 */
import {
  CanActivate,
  ExecutionContext,
  Global,
  HttpException,
  HttpStatus,
  Injectable,
  Module,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

interface WindowBucket {
  count: number;
  windowStart: number;
}

@Injectable()
export class UploadRateLimitService {
  private static readonly MS_PER_HOUR = 60 * 60 * 1000;
  private static readonly MS_PER_DAY = 24 * UploadRateLimitService.MS_PER_HOUR;
  private readonly limitPerHour: number;
  private readonly limitPerDay: number;
  private readonly store = new Map<string, { hour: WindowBucket; day: WindowBucket }>();

  constructor(configService: ConfigService) {
    const hour = parseInt(configService.get<string>('UPLOAD_LIMIT_PER_HOUR') ?? '', 10);
    const day = parseInt(configService.get<string>('UPLOAD_LIMIT_PER_DAY') ?? '', 10);
    this.limitPerHour = Number.isNaN(hour) || hour < 1 ? 50 : hour;
    this.limitPerDay = Number.isNaN(day) || day < 1 ? 100 : day;
  }

  /** Count one upload request for the user; 429 when over the hour or day quota. */
  checkAndIncrement(userId: string, requestCount = 1): void {
    const now = Date.now();
    const hourWindow = Math.floor(now / UploadRateLimitService.MS_PER_HOUR) * UploadRateLimitService.MS_PER_HOUR;
    const dayWindow = Math.floor(now / UploadRateLimitService.MS_PER_DAY) * UploadRateLimitService.MS_PER_DAY;
    let buckets = this.store.get(userId);
    if (!buckets) {
      buckets = { hour: { count: 0, windowStart: hourWindow }, day: { count: 0, windowStart: dayWindow } };
      this.store.set(userId, buckets);
    }
    if (now - buckets.hour.windowStart >= UploadRateLimitService.MS_PER_HOUR) {
      buckets.hour = { count: 0, windowStart: hourWindow };
    }
    if (now - buckets.day.windowStart >= UploadRateLimitService.MS_PER_DAY) {
      buckets.day = { count: 0, windowStart: dayWindow };
    }
    const nextHour = buckets.hour.count + requestCount;
    const nextDay = buckets.day.count + requestCount;
    if (nextHour > this.limitPerHour) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Upload limit exceeded: maximum ${this.limitPerHour} upload requests per hour. Try again later.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (nextDay > this.limitPerDay) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Upload limit exceeded: maximum ${this.limitPerDay} upload requests per day. Try again tomorrow.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    buckets.hour.count = nextHour;
    buckets.day.count = nextDay;
  }
}

/** Must run after authentication (the global JwtAuthGuard) so req.user is set. */
@Injectable()
export class UploadQuotaGuard implements CanActivate {
  constructor(private readonly uploadRateLimitService: UploadRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest()?.user;
    if (!user?.id) return true; // the auth guard handles unauthenticated requests
    this.uploadRateLimitService.checkAndIncrement(String(user.id), 1);
    return true;
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [UploadRateLimitService, UploadQuotaGuard],
  exports: [UploadRateLimitService, UploadQuotaGuard],
})
export class UploadQuotaModule {}
