import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RealtimeModule } from './realtime/realtime.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';
import { GrcModule } from './grc/grc.module';
import { BullModule } from '@nestjs/bull';
import { SimpleChartController } from './shared/simple-chart.controller';
import { AutoDashboardService } from './shared/auto-dashboard.service';
import { ChartRegistryService } from './shared/chart-registry.service';
import { DatabaseService } from './database/database.service';
import { CsrfModule } from './csrf/csrf.module';
import { CsrfMiddleware } from './middleware/csrf.middleware';
import { JwtAuthMiddleware } from './auth/jwt-auth.middleware';
import * as cookieParser from 'cookie-parser';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    RealtimeModule,
    DashboardModule,
    AuthModule,
    GrcModule,
    CsrfModule,
  ],
  controllers: [SimpleChartController],
  providers: [AutoDashboardService, ChartRegistryService, DatabaseService, JwtAuthMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply JWT auth first, then CSRF
    consumer
      .apply(JwtAuthMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    
    consumer
      .apply(cookieParser(), CsrfMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
