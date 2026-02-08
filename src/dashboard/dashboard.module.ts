import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { DatabaseService } from '../database/database.service';

@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [DashboardController],
  providers: [DashboardService, DatabaseService],
})
export class DashboardModule {}
