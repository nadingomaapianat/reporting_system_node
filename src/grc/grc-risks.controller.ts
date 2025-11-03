import { Controller, Get, Query, Param } from '@nestjs/common';
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

  @Get('card')
  async getCard(
    @Query('cardType') cardType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcRisksService.getCardData(cardType, page, limit, startDate, endDate);
  }

  // Path-param variant for frontend compatibility: /api/grc/risks/card/high
  @Get('card/:cardType')
  async getCardByParam(
    @Param('cardType') cardType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.grcRisksService.getCardData(cardType, page, limit, startDate, endDate);
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

  @Get('by-category')
  async getRisksByCategory(
    @Query('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByCategory(category, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error in getRisksByCategory:', error);
      throw error;
    }
  }

  @Get('by-event-type')
  async getRisksByEventType(
    @Query('eventType') eventType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByEventType(eventType, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error in getRisksByEventType:', error);
      throw error;
    }
  }

  @Get('by-quarter')
  async getRisksByQuarter(
    @Query('quarter') quarter: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByQuarter(quarter, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error in getRisksByQuarter:', error);
      throw error;
    }
  }

  @Get('by-approval-status')
  async getRisksByApprovalStatus(
    @Query('approvalStatus') approvalStatus: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByApprovalStatus(approvalStatus, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error in getRisksByApprovalStatus:', error);
      throw error;
    }
  }

  @Get('by-financial-impact')
  async getRisksByFinancialImpact(
    @Query('financialImpact') financialImpact: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByFinancialImpact(financialImpact, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error in getRisksByFinancialImpact:', error);
      throw error;
    }
  }

  @Get('by-function')
  async getRisksByFunction(
    @Query('functionName') functionName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByFunction(functionName, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error in getRisksByFunction:', error);
      throw error;
    }
  }

  @Get('by-business-process')
  async getRisksByBusinessProcess(
    @Query('processName') processName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByBusinessProcess(processName, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error in getRisksByBusinessProcess:', error);
      throw error;
    }
  }

  @Get('by-name')
  async getRisksByName(
    @Query('riskName') riskName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByName(riskName, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error in getRisksByName:', error);
      throw error;
    }
  }

  @Get('by-control-name')
  async getRisksByControlName(
    @Query('controlName') controlName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByControlName(controlName, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error in getRisksByControlName:', error);
      throw error;
    }
  }

  @Get('for-comparison')
  async getRisksForComparison(
    @Query('riskName') riskName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcRisksService.getRisksForComparison(riskName, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error in getRisksForComparison:', error);
      throw error;
    }
  }
}
