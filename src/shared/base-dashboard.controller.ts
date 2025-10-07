import { Controller, Get, Query } from '@nestjs/common';
import { BaseDashboardService } from './base-dashboard.service';

@Controller()
export abstract class BaseDashboardController {
  constructor(protected readonly dashboardService: BaseDashboardService) {}

  @Get()
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.dashboardService.getDashboardData(startDate, endDate);
  }

  @Get('card/:cardType')
  async getCardData(
    @Query('cardType') cardType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.dashboardService.getCardData(cardType, page, limit, startDate, endDate);
  }
}
