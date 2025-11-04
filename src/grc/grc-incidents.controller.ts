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

  @Get('by-status')
  async getIncidentsByStatus(
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!status) {
      throw new Error('status parameter is required');
    }
    return this.grcIncidentsService.getIncidentsByStatus(status, page, limit, startDate, endDate);
  }

  @Get('by-month-year')
  async getIncidentsByMonthYear(
    @Query('monthYear') monthYear: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!monthYear) {
      throw new Error('monthYear parameter is required')
    }
    return this.grcIncidentsService.getIncidentsByMonthYear(monthYear, page, limit, startDate, endDate)
  }

  @Get('by-sub-category')
  async getIncidentsBySubCategory(
    @Query('subCategory') subCategory: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!subCategory) {
      throw new Error('subCategory parameter is required');
    }
    return this.grcIncidentsService.getIncidentsBySubCategory(subCategory, page, limit, startDate, endDate);
  }

  @Get('by-period')
  async getIncidentsByPeriod(
    @Query('period') period: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!period) {
      throw new Error('period parameter is required. Expected format: MM/YYYY');
    }
    return this.grcIncidentsService.getIncidentsByPeriod(period, page, limit, startDate, endDate);
  }

  @Get('by-internal-fraud')
  async getIncidentsByInternalFraud(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcIncidentsService.getIncidentsByEventType('Internal Fraud', page, limit, startDate, endDate);
  }

  @Get('by-external-fraud')
  async getIncidentsByExternalFraud(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcIncidentsService.getIncidentsByEventType('External Fraud', page, limit, startDate, endDate);
  }

  @Get('by-physical-asset-damage')
  async getIncidentsByPhysicalAssetDamage(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcIncidentsService.getIncidentsByEventType('Damage to Physical Assets', page, limit, startDate, endDate);
  }

  @Get('by-atm-issue')
  async getIncidentsByATMIssue(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcIncidentsService.getIncidentsBySubCategory('ATM issue', page, limit, startDate, endDate);
  }

  @Get('by-people-error')
  async getIncidentsByPeopleError(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcIncidentsService.getIncidentsBySubCategory('Human Mistake', page, limit, startDate, endDate);
  }

  @Get('recognition-time')
  async getIncidentsWithRecognitionTime(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcIncidentsService.getIncidentsWithRecognitionTime(page, limit, startDate, endDate);
  }

  @Get('by-period-and-type')
  async getIncidentsByPeriodAndType(
    @Query('period') period: string,
    @Query('incidentType') incidentType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!period) {
      throw new Error('period parameter is required. Expected format: YYYY-MM or MM/YYYY');
    }
    if (!incidentType) {
      throw new Error('incidentType parameter is required');
    }
    return this.grcIncidentsService.getIncidentsByPeriodAndType(period, incidentType, page, limit, startDate, endDate);
  }

  @Get('by-comprehensive-metric')
  async getIncidentsByComprehensiveMetric(
    @Query('metric') metric: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!metric) {
      throw new Error('metric parameter is required');
    }
    return this.grcIncidentsService.getIncidentsByComprehensiveMetric(metric, page, limit, startDate, endDate);
  }
}
