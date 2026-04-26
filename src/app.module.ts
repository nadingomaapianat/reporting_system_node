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
import { DatabaseService } from './database/database.service';
import { UserFunctionAccessService } from './shared/user-function-access.service';
import { UserFunctionsController } from './shared/user-functions.controller';
import { CsrfModule } from './csrf/csrf.module';
import { IcrModule } from './icr/icr.module';
import { MainBackendModule } from './main-backend/main-backend.module';
import { CsrfMiddleware } from './middleware/csrf.middleware';
import { FrameAncestorsMiddleware } from './middleware/frame-ancestors.middleware';
import { JwtAuthMiddleware } from './auth/jwt-auth.middleware';
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
    RealtimeModule,
    DashboardModule,
    AuthModule,
    GrcModule,
    CsrfModule,
    IcrModule,
    MainBackendModule,
  ],
  controllers: [SimpleChartController, UserFunctionsController],
  providers: [
    AutoDashboardService,
    ChartRegistryService,
    DatabaseService,
    JwtAuthMiddleware,
    FrameAncestorsMiddleware,
    UserFunctionAccessService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Rate limiting first (bank requirement)
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // Cookie parser so JwtAuthMiddleware can read token from cookies (reporting_node_token, iframe_d_c_c_t_p_*)
    consumer
      .apply(cookieParser())
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // Clickjacking protection: frame-ancestors so module is only embeddable by main app
    consumer
      .apply(FrameAncestorsMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    consumer
      .apply(JwtAuthMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    consumer
      .apply(CsrfMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
