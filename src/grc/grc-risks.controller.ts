import { Controller, Get, Query } from '@nestjs/common';
import { GrcRisksService } from './grc-risks.service';

@Controller('api/grc/risks')
export class GrcRisksController {
  constructor(private readonly grcRisksService: GrcRisksService) {}

  @Get()
  async getRisksDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcRisksService.getRisksDashboard(startDate, endDate);
  }

  @Get('total')
  async getTotalRisks(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcRisksService.getTotalRisks(page, limit, startDate, endDate);
  }

  @Get('high-risk')
  async getHighRisks(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcRisksService.getHighRisks(page, limit, startDate, endDate);
  }

  @Get('medium-risk')
  async getMediumRisks(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcRisksService.getMediumRisks(page, limit, startDate, endDate);
  }

  @Get('low-risk')
  async getLowRisks(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcRisksService.getLowRisks(page, limit, startDate, endDate);
  }

  @Get('reduction')
  async getRiskReduction(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcRisksService.getRiskReduction(page, limit, startDate, endDate);
  }

  @Get('new-risks')
  async getNewRisks(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcRisksService.getNewRisks(page, limit, startDate, endDate);
  }
}
