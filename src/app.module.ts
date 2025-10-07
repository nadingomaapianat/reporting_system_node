import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
  ],
  controllers: [SimpleChartController],
  providers: [AutoDashboardService, ChartRegistryService, DatabaseService],
})
export class AppModule {}
