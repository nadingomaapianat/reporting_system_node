import { Controller, Get, Query, Req, UseGuards, All } from '@nestjs/common';
import { GrcDashboardService } from './grc-dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('api/grc/controls')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('Reporting', ['show'])
export class GrcDashboardController {
  constructor(private readonly grcDashboardService: GrcDashboardService) {}

  @Get()
  async getControlsDashboard(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      return await this.grcDashboardService.getControlsDashboard(req.user, startDate, endDate, functionId);
    } catch (error: any) {
      console.error('Error in getControlsDashboard:', error);
      throw error;
    }
  }

  @Get('total')
  async getTotalControls(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcDashboardService.getTotalControls(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('unmapped')
  async getUnmappedControls(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcDashboardService.getUnmappedControls(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('pending-preparer')
  async getPendingPreparerControls(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcDashboardService.getPendingPreparerControls(req.user, page, limit, startDate, endDate);
  }

  @Get('pending-checker')
  async getPendingCheckerControls(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcDashboardService.getPendingCheckerControls(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('pending-reviewer')
  async getPendingReviewerControls(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcDashboardService.getPendingReviewerControls(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('pending-acceptance')
  async getPendingAcceptanceControls(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcDashboardService.getPendingAcceptanceControls(req.user, page, limit, startDate, endDate, functionId);
  }

  // Control Tests pending endpoints
  @Get('tests/pending-preparer')
  async getTestsPendingPreparer(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcDashboardService.getTestsPendingPreparer(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('tests/pending-checker')
  async getTestsPendingChecker(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcDashboardService.getTestsPendingChecker(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('tests/pending-reviewer')
  async getTestsPendingReviewer(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcDashboardService.getTestsPendingReviewer(req.user, page, limit, startDate, endDate);
  }

  @Get('tests/pending-acceptance')
  async getTestsPendingAcceptance(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcDashboardService.getTestsPendingAcceptance(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('unmapped-icofr')
  async getUnmappedIcofrControls(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcDashboardService.getUnmappedIcofrControls(req.user, page, limit, startDate, endDate);
  }

  @Get('unmapped-non-icofr')
  async getUnmappedNonIcofrControls(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcDashboardService.getUnmappedNonIcofrControls(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('by-quarter')
  async getControlsByQuarter(
    @Req() req: any,
    @Query('quarter') quarter: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!quarter) {
      throw new Error('quarter parameter is required (e.g., "Q1 2024")');
    }
    return this.grcDashboardService.getControlsByQuarter(req.user, quarter, page, limit, startDate, endDate, functionId);
  }

  @Get('by-department')
  async getControlsByDepartment(
    @Req() req: any,
    @Query('department') department: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!department) {
      throw new Error('department parameter is required');
    }
    return this.grcDashboardService.getControlsByDepartment(req.user, department, page, limit, startDate, endDate, functionId);
  }

  @Get('by-type')
  async getControlsByType(
    @Req() req: any,
    @Query('type') type: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!type) {
      throw new Error('type parameter is required');
    }
    return this.grcDashboardService.getControlsByType(req.user, type, page, limit, startDate, endDate, functionId);
  }

  @Get('by-level')
  async getControlsByLevel(
    @Req() req: any,
    @Query('level') level: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!level) {
      throw new Error('level parameter is required');
    }
    return this.grcDashboardService.getControlsByLevel(req.user, level, page, limit, startDate, endDate, functionId);
  }

  @Get('by-frequency')
  async getControlsByFrequency(
    @Req() req: any,
    @Query('frequency') frequency: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!frequency) {
      throw new Error('frequency parameter is required');
    }
    return this.grcDashboardService.getControlsByFrequency(req.user, frequency, page, limit, startDate, endDate, functionId);
  }

  @Get('by-risk-response')
  async getControlsByRiskResponse(
    @Req() req: any,
    @Query('riskResponse') riskResponse: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!riskResponse) {
      throw new Error('riskResponse parameter is required');
    }
    return this.grcDashboardService.getControlsByRiskResponse(req.user, riskResponse, page, limit, startDate, endDate, functionId);
  }

  @Get('by-anti-fraud')
  async getControlsByAntiFraud(
    @Req() req: any,
    @Query('antiFraud') antiFraud: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!antiFraud) {
      throw new Error('antiFraud parameter is required (Anti-Fraud or Non-Anti-Fraud)');
    }
    return this.grcDashboardService.getControlsByAntiFraud(req.user, antiFraud, page, limit, startDate, endDate, functionId);
  }

  @Get('by-icofr-status')
  async getControlsByIcofrStatus(
    @Req() req: any,
    @Query('icofrStatus') icofrStatus: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!icofrStatus) {
      throw new Error('icofrStatus parameter is required (ICOFR or Non-ICOFR)');
    }
    return this.grcDashboardService.getControlsByIcofrStatus(req.user, icofrStatus, page, limit, startDate, endDate, functionId);
  }

  @Get('focus-points/by-principle')
  async getFocusPointsByPrinciple(
    @Query('principle') principle: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!principle) {
      throw new Error('principle parameter is required');
    }
    return this.grcDashboardService.getFocusPointsByPrinciple(principle, page, limit, startDate, endDate);
  }

  @Get('by-component')
  async getControlsByComponent(
    @Req() req: any,
    @Query('component') component: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    if (!component) {
      throw new Error('component parameter is required');
    }
    return this.grcDashboardService.getControlsByComponent(req.user, component, page, limit, startDate, endDate, functionId);
  }

  @Get('focus-points/by-component')
  async getFocusPointsByComponent(
    @Query('component') component: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!component) {
      throw new Error('component parameter is required');
    }
    return this.grcDashboardService.getFocusPointsByComponent(component, page, limit, startDate, endDate);
  }

  @Get('action-plans/by-status')
  async getActionPlansByStatus(
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!status) {
      throw new Error('status parameter is required (Overdue or Not Overdue)');
    }
    return this.grcDashboardService.getActionPlansByStatus(status, page, limit, startDate, endDate);
  }

  @Get('by-department-and-key-control')
  async getControlsByDepartmentAndKeyControl(
    @Req() req: any,
    @Query('department') department: string,
    @Query('keyControl') keyControl: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!department || !keyControl) {
      throw new Error('department and keyControl parameters are required (keyControl: "Key Controls" or "Non-Key Controls")');
    }
    return this.grcDashboardService.getControlsByDepartmentAndKeyControl(req.user, department, keyControl, page, limit, startDate, endDate);
  }

  @Get('by-process-and-key-control')
  async getControlsByProcessAndKeyControl(
    @Req() req: any,
    @Query('process') process: string,
    @Query('keyControl') keyControl: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!process || !keyControl) {
      throw new Error('process and keyControl parameters are required (keyControl: "Key Controls" or "Non-Key Controls")');
    }
    return this.grcDashboardService.getControlsByProcessAndKeyControl(req.user, process, keyControl, page, limit, startDate, endDate);
  }

  @Get('by-business-unit-and-key-control')
  async getControlsByBusinessUnitAndKeyControl(
    @Req() req: any,
    @Query('businessUnit') businessUnit: string,
    @Query('keyControl') keyControl: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!businessUnit || !keyControl) {
      throw new Error('businessUnit and keyControl parameters are required (keyControl: "Key Controls" or "Non-Key Controls")');
    }
    return this.grcDashboardService.getControlsByBusinessUnitAndKeyControl(req.user, businessUnit, keyControl, page, limit, startDate, endDate);
  }

  @Get('by-assertion')
  async getControlsByAssertion(
    @Req() req: any,
    @Query('assertionName') assertionName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      if (!assertionName) {
        throw new Error('assertionName parameter is required');
      }
      return await this.grcDashboardService.getControlsByAssertion(req.user, assertionName, page, limit, startDate, endDate);
    } catch (error: any) {
      console.error('Error in getControlsByAssertion:', error);
      throw error;
    }
  }

  @Get('by-component-and-icofr-status')
  async getControlsByComponentAndIcofrStatus(
    @Req() req: any,
    @Query('component') component: string,
    @Query('icofrStatus') icofrStatus: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      if (!component || !icofrStatus) {
        throw new Error('component and icofrStatus parameters are required');
      }
      return await this.grcDashboardService.getControlsByComponentAndIcofrStatus(req.user, component, icofrStatus, page, limit, startDate, endDate);
    } catch (error: any) {
      console.error('Error in getControlsByComponentAndIcofrStatus:', error);
      throw error;
    }
  }

  @Get('by-function-quarter-year')
  async getControlsByFunctionQuarterYear(
    @Req() req: any,
    @Query('functionName') functionName: string,
    @Query('quarter') quarter: number,
    @Query('year') year: number,
    @Query('columnType') columnType?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    try {
      if (!functionName || quarter === undefined || year === undefined) {
        throw new Error('functionName, quarter, and year parameters are required');
      }
      return await this.grcDashboardService.getControlsByFunctionQuarterYear(req.user, functionName, Number(quarter), Number(year), columnType, page, limit, startDate, endDate, functionId);
    } catch (error: any) {
      console.error('Error in getControlsByFunctionQuarterYear:', error);
      throw error;
    }
  }
}
