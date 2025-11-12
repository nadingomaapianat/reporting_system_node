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
    try {
      return await this.grcDashboardService.getControlsDashboard(startDate, endDate);
    } catch (error: any) {
      console.error('Error in getControlsDashboard:', error);
      throw error;
    }
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

  @Get('by-quarter')
  async getControlsByQuarter(
    @Query('quarter') quarter: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!quarter) {
      throw new Error('quarter parameter is required (e.g., "Q1 2024")');
    }
    return this.grcDashboardService.getControlsByQuarter(quarter, page, limit, startDate, endDate);
  }

  @Get('by-department')
  async getControlsByDepartment(
    @Query('department') department: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!department) {
      throw new Error('department parameter is required');
    }
    return this.grcDashboardService.getControlsByDepartment(department, page, limit, startDate, endDate);
  }

  @Get('by-type')
  async getControlsByType(
    @Query('type') type: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!type) {
      throw new Error('type parameter is required');
    }
    return this.grcDashboardService.getControlsByType(type, page, limit, startDate, endDate);
  }

  @Get('by-level')
  async getControlsByLevel(
    @Query('level') level: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!level) {
      throw new Error('level parameter is required');
    }
    return this.grcDashboardService.getControlsByLevel(level, page, limit, startDate, endDate);
  }

  @Get('by-frequency')
  async getControlsByFrequency(
    @Query('frequency') frequency: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!frequency) {
      throw new Error('frequency parameter is required');
    }
    return this.grcDashboardService.getControlsByFrequency(frequency, page, limit, startDate, endDate);
  }

  @Get('by-risk-response')
  async getControlsByRiskResponse(
    @Query('riskResponse') riskResponse: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!riskResponse) {
      throw new Error('riskResponse parameter is required');
    }
    return this.grcDashboardService.getControlsByRiskResponse(riskResponse, page, limit, startDate, endDate);
  }

  @Get('by-anti-fraud')
  async getControlsByAntiFraud(
    @Query('antiFraud') antiFraud: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!antiFraud) {
      throw new Error('antiFraud parameter is required (Anti-Fraud or Non-Anti-Fraud)');
    }
    return this.grcDashboardService.getControlsByAntiFraud(antiFraud, page, limit, startDate, endDate);
  }

  @Get('by-icofr-status')
  async getControlsByIcofrStatus(
    @Query('icofrStatus') icofrStatus: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!icofrStatus) {
      throw new Error('icofrStatus parameter is required (ICOFR or Non-ICOFR)');
    }
    return this.grcDashboardService.getControlsByIcofrStatus(icofrStatus, page, limit, startDate, endDate);
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
    @Query('component') component: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!component) {
      throw new Error('component parameter is required');
    }
    return this.grcDashboardService.getControlsByComponent(component, page, limit, startDate, endDate);
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
    return this.grcDashboardService.getControlsByDepartmentAndKeyControl(department, keyControl, page, limit, startDate, endDate);
  }

  @Get('by-process-and-key-control')
  async getControlsByProcessAndKeyControl(
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
    return this.grcDashboardService.getControlsByProcessAndKeyControl(process, keyControl, page, limit, startDate, endDate);
  }

  @Get('by-business-unit-and-key-control')
  async getControlsByBusinessUnitAndKeyControl(
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
    return this.grcDashboardService.getControlsByBusinessUnitAndKeyControl(businessUnit, keyControl, page, limit, startDate, endDate);
  }

  @Get('by-assertion')
  async getControlsByAssertion(
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
      return await this.grcDashboardService.getControlsByAssertion(assertionName, page, limit, startDate, endDate);
    } catch (error: any) {
      console.error('Error in getControlsByAssertion:', error);
      throw error;
    }
  }

  @Get('by-component-and-icofr-status')
  async getControlsByComponentAndIcofrStatus(
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
      return await this.grcDashboardService.getControlsByComponentAndIcofrStatus(component, icofrStatus, page, limit, startDate, endDate);
    } catch (error: any) {
      console.error('Error in getControlsByComponentAndIcofrStatus:', error);
      throw error;
    }
  }

  @Get('by-function-quarter-year')
  async getControlsByFunctionQuarterYear(
    @Query('functionName') functionName: string,
    @Query('quarter') quarter: number,
    @Query('year') year: number,
    @Query('columnType') columnType?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      if (!functionName || quarter === undefined || year === undefined) {
        throw new Error('functionName, quarter, and year parameters are required');
      }
      return await this.grcDashboardService.getControlsByFunctionQuarterYear(functionName, Number(quarter), Number(year), columnType, page, limit, startDate, endDate);
    } catch (error: any) {
      console.error('Error in getControlsByFunctionQuarterYear:', error);
      throw error;
    }
  }
}
