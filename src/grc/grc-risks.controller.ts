import { Controller, Get, Query, Param, Req, UseGuards } from '@nestjs/common';
import { GrcRisksService } from './grc-risks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('api/grc/risks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('Reporting', ['show'])
export class GrcRisksController {
  constructor(private readonly grcRisksService: GrcRisksService) {}

  @Get()
  async getRisksDashboard(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const norm = (s?: string) => (typeof s === 'string' ? s.replace(/\+/g, ' ').trim().replace(/\s+/g, ' ') : undefined) || undefined;
    const id = norm(functionId);
    return this.grcRisksService.getRisksDashboard(req.user, norm(startDate) || undefined, norm(endDate) || undefined, id && id.length > 0 ? id : undefined);
  }

  @Get('total')
  async getTotalRisks(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcRisksService.getTotalRisks(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('card')
  async getCard(
    @Req() req: any,
    @Query('cardType') cardType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcRisksService.getFilteredCardData(req.user, cardType, page, limit, startDate, endDate);
  }

  // Path-param variant for frontend compatibility: /api/grc/risks/card/high
  @Get('card/:cardType')
  async getCardByParam(
    @Req() req: any,
    @Param('cardType') cardType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcRisksService.getFilteredCardData(req.user, cardType, page, limit, startDate, endDate);
  }

  @Get('high-risk')
  async getHighRisks(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcRisksService.getHighRisks(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('medium-risk')
  async getMediumRisks(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcRisksService.getMediumRisks(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('low-risk')
  async getLowRisks(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcRisksService.getLowRisks(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('reduction')
  async getRiskReduction(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcRisksService.getRiskReduction(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('new-risks')
  async getNewRisks(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcRisksService.getNewRisks(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('by-category')
  async getRisksByCategory(
    @Req() req: any,
    @Query('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByCategory(req.user, category, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error in getRisksByCategory:', error);
      throw error;
    }
  }

  @Get('by-event-type')
  async getRisksByEventType(
    @Req() req: any,
    @Query('eventType') eventType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByEventType(req.user, eventType, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error in getRisksByEventType:', error);
      throw error;
    }
  }

  @Get('by-quarter')
  async getRisksByQuarter(
    @Req() req: any,
    @Query('quarter') quarter: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByQuarter(req.user, quarter, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error in getRisksByQuarter:', error);
      throw error;
    }
  }

  @Get('by-approval-status')
  async getRisksByApprovalStatus(
    @Req() req: any,
    @Query('approvalStatus') approvalStatus: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByApprovalStatus(req.user, approvalStatus, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error in getRisksByApprovalStatus:', error);
      throw error;
    }
  }

  @Get('by-financial-impact')
  async getRisksByFinancialImpact(
    @Req() req: any,
    @Query('financialImpact') financialImpact: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByFinancialImpact(req.user, financialImpact, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error in getRisksByFinancialImpact:', error);
      throw error;
    }
  }

  @Get('by-function')
  async getRisksByFunction(
    @Req() req: any,
    @Query('functionName') functionName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByFunction(req.user, functionName, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error in getRisksByFunction:', error);
      throw error;
    }
  }

  @Get('by-business-process')
  async getRisksByBusinessProcess(
    @Req() req: any,
    @Query('processName') processName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByBusinessProcess(req.user, processName, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error in getRisksByBusinessProcess:', error);
      throw error;
    }
  }

  @Get('by-name')
  async getRisksByName(
    @Req() req: any,
    @Query('riskName') riskName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByName(req.user, riskName, page, limit, startDate, endDate);
    } catch (error) {
      console.error('Error in getRisksByName:', error);
      throw error;
    }
  }

  @Get('by-control-name')
  async getRisksByControlName(
    @Req() req: any,
    @Query('controlName') controlName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcRisksService.getRisksByControlName(req.user, controlName, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error in getRisksByControlName:', error);
      throw error;
    }
  }

  @Get('for-comparison')
  async getRisksForComparison(
    @Req() req: any,
    @Query('riskName') riskName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcRisksService.getRisksForComparison(req.user, riskName, page, limit, startDate, endDate, functionId);
    } catch (error) {
      console.error('Error in getRisksForComparison:', error);
      throw error;
    }
  }
}
