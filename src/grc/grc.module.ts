import { Module } from '@nestjs/common';
import { GrcDashboardController } from './grc-dashboard.controller';
import { GrcDashboardService } from './grc-dashboard.service';
import { DatabaseService } from '../database/database.service';

@Module({
  controllers: [GrcDashboardController],
  providers: [GrcDashboardService, DatabaseService],
  exports: [GrcDashboardService],
})
export class GrcModule {}
