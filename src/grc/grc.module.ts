import { Module } from '@nestjs/common';
import { GrcDashboardController } from './grc-dashboard.controller';
import { GrcDashboardService } from './grc-dashboard.service';
import { GrcRisksController } from './grc-risks.controller';
import { GrcRisksService } from './grc-risks.service';
import { DatabaseService } from '../database/database.service';

@Module({
  controllers: [GrcDashboardController, GrcRisksController],
  providers: [GrcDashboardService, GrcRisksService, DatabaseService],
  exports: [GrcDashboardService, GrcRisksService],
})
export class GrcModule {}
