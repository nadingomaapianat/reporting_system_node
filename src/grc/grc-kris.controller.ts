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
}
