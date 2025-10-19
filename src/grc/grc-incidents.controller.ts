import { Controller, Get, Query } from '@nestjs/common';
import { GrcIncidentsService } from './grc-incidents.service';

@Controller('api/grc/incidents')
export class GrcIncidentsController {
  constructor(private readonly grcIncidentsService: GrcIncidentsService) {}

  @Get()
  async getIncidentsDashboard(@Query('timeframe') timeframe?: string) {
    return this.grcIncidentsService.getIncidentsDashboard(timeframe);
  }

  @Get('export')
  async exportIncidents(
    @Query('format') format: string,
    @Query('timeframe') timeframe?: string
  ) {
    return this.grcIncidentsService.exportIncidents(format, timeframe);
  }

  @Get('total')
  async getTotalIncidents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcIncidentsService.getTotalIncidents(page, limit, startDate, endDate)
  }
}
