import { Controller, Get, Query } from '@nestjs/common';
import { GrcKrisService } from './grc-kris.service';

@Controller('api/grc/kris')
export class GrcKrisController {
  constructor(private readonly grcKrisService: GrcKrisService) {}

  @Get()
  async getKrisDashboard(@Query('timeframe') timeframe?: string) {
    return this.grcKrisService.getKrisDashboard(timeframe);
  }

  @Get('export')
  async exportKris(
    @Query('format') format: string,
    @Query('timeframe') timeframe?: string
  ) {
    return this.grcKrisService.exportKris(format, timeframe);
  }

  @Get('total')
  async getTotalKris(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcKrisService.getTotalKris(page, limit, startDate, endDate);
  }

  @Get('pending-preparer')
  async getPendingPreparerKris(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcKrisService.getPendingPreparerKris(page, limit, startDate, endDate);
  }

  @Get('pending-checker')
  async getPendingCheckerKris(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcKrisService.getPendingCheckerKris(page, limit, startDate, endDate);
  }

  @Get('pending-reviewer')
  async getPendingReviewerKris(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcKrisService.getPendingReviewerKris(page, limit, startDate, endDate);
  }

  @Get('pending-acceptance')
  async getPendingAcceptanceKris(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcKrisService.getPendingAcceptanceKris(page, limit, startDate, endDate);
  }

  @Get('by-status')
  async getKrisByStatus(
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcKrisService.getKrisByStatus(status, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error fetching KRIs by status:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-level')
  async getKrisByLevel(
    @Query('level') level: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcKrisService.getKrisByLevel(level, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error fetching KRIs by level:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-function')
  async getKrisByFunction(
    @Query('functionName') functionName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('submissionStatus') submissionStatus?: string
  ) {
    try {
      return await this.grcKrisService.getKrisByFunction(functionName, page, limit, startDate, endDate, submissionStatus);
    } catch (error) {
      console.error('Error fetching KRIs by function:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('with-assessments-by-function')
  async getKrisWithAssessmentsByFunction(
    @Query('functionName') functionName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcKrisService.getKrisWithAssessmentsByFunction(functionName, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error fetching KRIs with assessments by function:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-frequency')
  async getKrisByFrequency(
    @Query('frequency') frequency: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcKrisService.getKrisByFrequency(frequency, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error fetching KRIs by frequency:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('risks-by-kri-name')
  async getRisksByKriName(
    @Query('kriName') kriName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcKrisService.getRisksByKriName(kriName, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error fetching risks by KRI name:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-month-year')
  async getKrisByMonthYear(
    @Query('monthYear') monthYear: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcKrisService.getKrisByMonthYear(monthYear, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error fetching KRIs by month/year:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('assessments-by-month-level')
  async getKriAssessmentsByMonthAndLevel(
    @Query('monthYear') monthYear: string,
    @Query('assessmentLevel') assessmentLevel: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcKrisService.getKriAssessmentsByMonthAndLevel(monthYear, assessmentLevel, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error fetching KRI assessments by month and level:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-overdue-status')
  async getKrisByOverdueStatus(
    @Query('overdueStatus') overdueStatus: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcKrisService.getKrisByOverdueStatus(overdueStatus, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error fetching KRIs by overdue status:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }
}
