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
}
