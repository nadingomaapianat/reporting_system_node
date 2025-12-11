import { Controller, Get, Query, Req } from '@nestjs/common';
import { BaseDashboardService } from './base-dashboard.service';

@Controller()
export abstract class BaseDashboardController {
  constructor(protected readonly dashboardService: BaseDashboardService) {}

  @Get()
  async getDashboard(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.dashboardService.getDashboardData(req.user, startDate, endDate, functionId);
  }

  @Get('card/:cardType')
  async getCardData(
    @Req() req: any,
    @Query('cardType') cardType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.dashboardService.getCardData(req.user, cardType, page, limit, startDate, endDate, functionId);
  }
}
