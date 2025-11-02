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

  @Get('pending-preparer')
  async getPendingPreparerIncidents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcIncidentsService.getPendingPreparerIncidents(page, limit, startDate, endDate);
  }

  @Get('pending-checker')
  async getPendingCheckerIncidents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcIncidentsService.getPendingCheckerIncidents(page, limit, startDate, endDate);
  }

  @Get('pending-reviewer')
  async getPendingReviewerIncidents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcIncidentsService.getPendingReviewerIncidents(page, limit, startDate, endDate);
  }

  @Get('pending-acceptance')
  async getPendingAcceptanceIncidents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcIncidentsService.getPendingAcceptanceIncidents(page, limit, startDate, endDate);
  }

  @Get('by-category')
  async getIncidentsByCategory(
    @Query('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!category) {
      throw new Error('category parameter is required');
    }
    return this.grcIncidentsService.getIncidentsByCategory(category, page, limit, startDate, endDate);
  }

  @Get('by-event-type')
  async getIncidentsByEventType(
    @Query('eventType') eventType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!eventType) {
      throw new Error('eventType parameter is required');
    }
    return this.grcIncidentsService.getIncidentsByEventType(eventType, page, limit, startDate, endDate);
  }

  @Get('by-financial-impact')
  async getIncidentsByFinancialImpact(
    @Query('financialImpact') financialImpact: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!financialImpact) {
      throw new Error('financialImpact parameter is required');
    }
    return this.grcIncidentsService.getIncidentsByFinancialImpact(financialImpact, page, limit, startDate, endDate);
  }
}
