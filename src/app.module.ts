import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RealtimeModule } from './realtime/realtime.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';
import { GrcModule } from './grc/grc.module';
import { SimpleChartController } from './shared/simple-chart.controller';
import { AutoDashboardService } from './shared/auto-dashboard.service';
import { ChartRegistryService } from './shared/chart-registry.service';
import { DatabaseModule } from './database/database.module';
import { UserFunctionAccessService } from './shared/user-function-access.service';
import { UserFunctionsController } from './shared/user-functions.controller';
import { CsrfModule } from './csrf/csrf.module';
import { GroupPermissionsModule } from './group-permissions/group-permissions.module';
import { IcrModule } from './icr/icr.module';
import { CsrfMiddleware } from './middleware/csrf.middleware';
import { FrameAncestorsMiddleware } from './middleware/frame-ancestors.middleware';
import { RateLimitMiddleware } from './middleware/limitter.middleware';
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
  ],
  controllers: [SimpleChartController, UserFunctionsController],
  providers: [
    AutoDashboardService,
    ChartRegistryService,
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
  }
}
