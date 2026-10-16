import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RealtimeModule } from './realtime/realtime.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';
import { GrcModule } from './grc/grc.module';
import { DatabaseModule } from './database/database.module';
import { UserFunctionAccessService } from './shared/user-function-access.service';
import { UserFunctionsController } from './shared/user-functions.controller';
import { CsrfModule } from './csrf/csrf.module';
import { GroupPermissionsModule } from './group-permissions/group-permissions.module';
import { IcrModule } from './icr/icr.module';
import { CsrfMiddleware } from './middleware/csrf.middleware';
import { FrameAncestorsMiddleware } from './middleware/frame-ancestors.middleware';
import { RateLimitMiddleware } from './middleware/limitter.middleware';
import { DateParamsMiddleware } from './middleware/date-params.middleware';
import { UploadQuotaModule } from './shared/upload-quota';
import * as cookieParser from 'cookie-parser';
import 'dotenv/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RealtimeModule,
    DashboardModule,
    AuthModule,
    GrcModule,
    CsrfModule,
    GroupPermissionsModule,
    IcrModule,
    UploadQuotaModule, // per-user upload quota (R-WAPT02)
  ],
  controllers: [UserFunctionsController],
  providers: [
    FrameAncestorsMiddleware,
    UserFunctionAccessService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    consumer
      .apply(cookieParser())
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    consumer
      .apply(FrameAncestorsMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    consumer
      .apply(CsrfMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // startDate / endDate reach SQL text in many GRC queries: refuse anything but a date.
    consumer
      .apply(DateParamsMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

