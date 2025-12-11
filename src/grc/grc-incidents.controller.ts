import { Controller, Get, Query, Req } from '@nestjs/common';
import { GrcIncidentsService } from './grc-incidents.service';

@Controller('api/grc/incidents')
export class GrcIncidentsController {
  constructor(private readonly grcIncidentsService: GrcIncidentsService) {}

  @Get()
  async getIncidentsDashboard(
    @Req() req: any, 
    @Query('timeframe') timeframe?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcIncidentsService.getIncidentsDashboard(req.user, timeframe, startDate, endDate, functionId);
  }

  @Get('export')
  async exportIncidents(
    @Req() req: any,
    @Query('format') format: string,
    @Query('timeframe') timeframe?: string
  ) {
    return this.grcIncidentsService.exportIncidents(req.user, format, timeframe);
  }

  @Get('total')
  async getTotalIncidents(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcIncidentsService.getTotalIncidents(req.user, page, limit, startDate, endDate, functionId)
  }

  @Get('pending-preparer')
  async getPendingPreparerIncidents(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcIncidentsService.getPendingPreparerIncidents(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('pending-checker')
  async getPendingCheckerIncidents(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcIncidentsService.getPendingCheckerIncidents(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('pending-reviewer')
  async getPendingReviewerIncidents(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcIncidentsService.getPendingReviewerIncidents(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('pending-acceptance')
  async getPendingAcceptanceIncidents(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcIncidentsService.getPendingAcceptanceIncidents(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('by-category')
  async getIncidentsByCategory(
    @Req() req: any,
    @Query('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!category) {
      throw new Error('category parameter is required');
    }
    return this.grcIncidentsService.getIncidentsByCategory(req.user, category, page, limit, startDate, endDate, functionId);
  }

  @Get('by-event-type')
  async getIncidentsByEventType(
    @Req() req: any,
    @Query('eventType') eventType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!eventType) {
      throw new Error('eventType parameter is required');
    }
    return this.grcIncidentsService.getIncidentsByEventType(req.user, eventType, page, limit, startDate, endDate, functionId);
  }

  @Get('by-financial-impact')
  async getIncidentsByFinancialImpact(
    @Req() req: any,
    @Query('financialImpact') financialImpact: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!financialImpact) {
      throw new Error('financialImpact parameter is required');
    }
    return this.grcIncidentsService.getIncidentsByFinancialImpact(req.user, financialImpact, page, limit, startDate, endDate, functionId);
  }

  @Get('by-status')
  async getIncidentsByStatus(
    @Req() req: any,
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!status) {
      throw new Error('status parameter is required');
    }
    return this.grcIncidentsService.getIncidentsByStatus(req.user, status, page, limit, startDate, endDate, functionId);
  }

  @Get('by-month-year')
  async getIncidentsByMonthYear(
    @Req() req: any,
    @Query('monthYear') monthYear: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!monthYear) {
      throw new Error('monthYear parameter is required')
    }
    return this.grcIncidentsService.getIncidentsByMonthYear(req.user, monthYear, page, limit, startDate, endDate, functionId)
  }

  @Get('by-sub-category')
  async getIncidentsBySubCategory(
    @Req() req: any,
    @Query('subCategory') subCategory: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!subCategory) {
      throw new Error('subCategory parameter is required');
    }
    return this.grcIncidentsService.getIncidentsBySubCategory(req.user, subCategory, page, limit, startDate, endDate, functionId);
  }

  @Get('by-period')
  async getIncidentsByPeriod(
    @Req() req: any,
    @Query('period') period: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!period) {
      throw new Error('period parameter is required. Expected format: MM/YYYY');
    }
    return this.grcIncidentsService.getIncidentsByPeriod(req.user, period, page, limit, startDate, endDate, functionId);
  }

  @Get('by-internal-fraud')
  async getIncidentsByInternalFraud(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcIncidentsService.getIncidentsByEventType(req.user, 'Internal Fraud', page, limit, startDate, endDate, functionId);
  }

  @Get('by-external-fraud')
  async getIncidentsByExternalFraud(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcIncidentsService.getIncidentsByEventType(req.user, 'External Fraud', page, limit, startDate, endDate, functionId);
  }

  @Get('by-physical-asset-damage')
  async getIncidentsByPhysicalAssetDamage(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcIncidentsService.getIncidentsByEventType(req.user, 'Damage to Physical Assets', page, limit, startDate, endDate, functionId);
  }

  @Get('by-atm-issue')
  async getIncidentsByATMIssue(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcIncidentsService.getIncidentsBySubCategory(req.user, 'ATM issue', page, limit, startDate, endDate, functionId);
  }

  @Get('by-people-error')
  async getIncidentsByPeopleError(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcIncidentsService.getIncidentsBySubCategory(req.user, 'Human Mistake', page, limit, startDate, endDate, functionId);
  }

  @Get('recognition-time')
  async getIncidentsWithRecognitionTime(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcIncidentsService.getIncidentsWithRecognitionTime(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('by-period-and-type')
  async getIncidentsByPeriodAndType(
    @Req() req: any,
    @Query('period') period: string,
    @Query('incidentType') incidentType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!period) {
      throw new Error('period parameter is required. Expected format: YYYY-MM or MM/YYYY');
    }
    if (!incidentType) {
      throw new Error('incidentType parameter is required');
    }
    return this.grcIncidentsService.getIncidentsByPeriodAndType(req.user, period, incidentType, page, limit, startDate, endDate, functionId);
  }

  @Get('by-comprehensive-metric')
  async getIncidentsByComprehensiveMetric(
    @Req() req: any,
    @Query('metric') metric: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!metric) {
      throw new Error('metric parameter is required');
    }
    return this.grcIncidentsService.getIncidentsByComprehensiveMetric(req.user, metric, page, limit, startDate, endDate, functionId);
  }
}
