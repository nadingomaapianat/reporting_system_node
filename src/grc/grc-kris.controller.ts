import { Controller, Get, Query, Req } from '@nestjs/common';
import { GrcKrisService } from './grc-kris.service';

@Controller('api/grc/kris')
export class GrcKrisController {
  constructor(private readonly grcKrisService: GrcKrisService) {}

  @Get()
  async getKrisDashboard(
    @Req() req: any, 
    @Query('timeframe') timeframe?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcKrisService.getKrisDashboard(req.user, timeframe, startDate, endDate, functionId);
  }

  @Get('export')
  async exportKris(
    @Req() req: any,
    @Query('format') format: string,
    @Query('timeframe') timeframe?: string
  ) {
    return this.grcKrisService.exportKris(req.user, format, timeframe);
  }

  @Get('total')
  async getTotalKris(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcKrisService.getTotalKris(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('pending-preparer')
  async getPendingPreparerKris(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcKrisService.getPendingPreparerKris(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('pending-checker')
  async getPendingCheckerKris(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcKrisService.getPendingCheckerKris(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('pending-reviewer')
  async getPendingReviewerKris(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcKrisService.getPendingReviewerKris(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('pending-acceptance')
  async getPendingAcceptanceKris(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcKrisService.getPendingAcceptanceKris(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('by-status')
  async getKrisByStatus(
    @Req() req: any,
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcKrisService.getKrisByStatus(req.user, status, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error fetching KRIs by status:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-level')
  async getKrisByLevel(
    @Req() req: any,
    @Query('level') level: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcKrisService.getKrisByLevel(req.user, level, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error fetching KRIs by level:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-function')
  async getKrisByFunction(
    @Req() req: any,
    @Query('functionName') functionName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('submissionStatus') submissionStatus?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcKrisService.getKrisByFunction(req.user, functionName, page, limit, startDate, endDate, submissionStatus, functionId);
    } catch (error) {
      console.error('Error fetching KRIs by function:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('with-assessments-by-function')
  async getKrisWithAssessmentsByFunction(
    @Req() req: any,
    @Query('functionName') functionName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcKrisService.getKrisWithAssessmentsByFunction(req.user, functionName, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error fetching KRIs with assessments by function:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-frequency')
  async getKrisByFrequency(
    @Req() req: any,
    @Query('frequency') frequency: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcKrisService.getKrisByFrequency(req.user, frequency, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error fetching KRIs by frequency:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('risks-by-kri-name')
  async getRisksByKriName(
    @Req() req: any,
    @Query('kriName') kriName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcKrisService.getRisksByKriName(req.user, kriName, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error fetching risks by KRI name:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-month-year')
  async getKrisByMonthYear(
    @Req() req: any,
    @Query('monthYear') monthYear: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcKrisService.getKrisByMonthYear(req.user, monthYear, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error fetching KRIs by month/year:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('assessments-by-month-level')
  async getKriAssessmentsByMonthAndLevel(
    @Req() req: any,
    @Query('monthYear') monthYear: string,
    @Query('assessmentLevel') assessmentLevel: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcKrisService.getKriAssessmentsByMonthAndLevel(req.user, monthYear, assessmentLevel, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error fetching KRI assessments by month and level:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-overdue-status')
  async getKrisByOverdueStatus(
    @Req() req: any,
    @Query('overdueStatus') overdueStatus: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcKrisService.getKrisByOverdueStatus(req.user, overdueStatus, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error fetching KRIs by overdue status:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }
}
