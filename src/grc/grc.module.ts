import { Module } from '@nestjs/common';
import { GrcDashboardController } from './grc-dashboard.controller';
import { GrcDashboardService } from './grc-dashboard.service';
import { GrcRisksController } from './grc-risks.controller';
import { GrcRisksService } from './grc-risks.service';
import { GrcIncidentsController } from './grc-incidents.controller';
import { GrcIncidentsService } from './grc-incidents.service';
import { GrcKrisController } from './grc-kris.controller';
import { GrcKrisService } from './grc-kris.service';
import { DatabaseService } from '../database/database.service';

@Module({
  controllers: [GrcDashboardController, GrcRisksController, GrcIncidentsController, GrcKrisController],
  providers: [GrcDashboardService, GrcRisksService, GrcIncidentsService, GrcKrisService, DatabaseService],
  exports: [GrcDashboardService, GrcRisksService, GrcIncidentsService, GrcKrisService],
})
export class GrcModule {}
