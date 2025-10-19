import { Controller, Get, Query } from '@nestjs/common';
import { GrcDashboardService } from './grc-dashboard.service';

@Controller('api/grc/controls')
export class GrcDashboardController {
  constructor(private readonly grcDashboardService: GrcDashboardService) {}

  @Get()
  async getControlsDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getControlsDashboard(startDate, endDate);
  }

  @Get('total')
  async getTotalControls(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getTotalControls(page, limit, startDate, endDate);
  }

  @Get('unmapped')
  async getUnmappedControls(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getUnmappedControls(page, limit, startDate, endDate);
  }

  @Get('pending-preparer')
  async getPendingPreparerControls(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getPendingPreparerControls(page, limit, startDate, endDate);
  }

  @Get('pending-checker')
  async getPendingCheckerControls(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getPendingCheckerControls(page, limit, startDate, endDate);
  }

  @Get('pending-reviewer')
  async getPendingReviewerControls(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getPendingReviewerControls(page, limit, startDate, endDate);
  }

  @Get('pending-acceptance')
  async getPendingAcceptanceControls(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getPendingAcceptanceControls(page, limit, startDate, endDate);
  }

  // Control Tests pending endpoints
  @Get('tests/pending-preparer')
  async getTestsPendingPreparer(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getTestsPendingPreparer(page, limit, startDate, endDate);
  }

  @Get('tests/pending-checker')
  async getTestsPendingChecker(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getTestsPendingChecker(page, limit, startDate, endDate);
  }

  @Get('tests/pending-reviewer')
  async getTestsPendingReviewer(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getTestsPendingReviewer(page, limit, startDate, endDate);
  }

  @Get('tests/pending-acceptance')
  async getTestsPendingAcceptance(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getTestsPendingAcceptance(page, limit, startDate, endDate);
  }

  @Get('unmapped-icofr')
  async getUnmappedIcofrControls(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getUnmappedIcofrControls(page, limit, startDate, endDate);
  }

  @Get('unmapped-non-icofr')
  async getUnmappedNonIcofrControls(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcDashboardService.getUnmappedNonIcofrControls(page, limit, startDate, endDate);
  }
}
