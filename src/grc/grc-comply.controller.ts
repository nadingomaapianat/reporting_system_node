import { Controller, Get, Query, Req, Param } from '@nestjs/common';
import { GrcComplyService, GrcComplyReportKey } from './grc-comply.service';

@Controller('api/grc/comply')
export class GrcComplyController {
  constructor(private readonly grcComplyService: GrcComplyService) {}

  /**
   * Dashboard endpoint - returns aggregated comply data
   * If report query param is provided, returns single report (backward compatibility)
   */
  @Get()
  async getDashboardOrReport(
    @Req() req: any,
    @Query('report') report?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    // Log received query parameters
    console.log('[GrcComplyController.getDashboardOrReport] Query params received:', { 
      report, 
      startDate, 
      endDate, 
      functionId,
      allQueryParams: req.query 
    });
    
    // If report query param is provided, return single report (backward compatibility)
    if (report) {
      const reportKey = report as GrcComplyReportKey;
      return this.grcComplyService.runReport(reportKey, startDate, endDate, functionId);
    }
    
    // Otherwise, return dashboard data
    console.log('[GrcComplyController.getDashboardOrReport] Calling getComplyDashboard with filters:', { startDate, endDate, functionId });
    return this.grcComplyService.getComplyDashboard(req.user, startDate, endDate, functionId);
  }

  /**
   * Fetch all 26 reports in one call.
   *
   * Each key in the response is the descriptive name of the query.
   *
   * Usage:
   *   GET /api/grc/comply/all
   *   GET /api/grc/comply/all?startDate=2024-01-01&endDate=2024-12-31&functionId=123
   */
  @Get('all')
  async getAllReports(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcComplyService.runAllReports(startDate, endDate, functionId);
  }

  /**
   * Detail endpoints for cards with pagination
   */
  @Get('surveys')
  async getSurveys(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcComplyService.getSurveys(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('compliance-details')
  async getComplianceDetails(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcComplyService.getComplianceDetails(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('survey-completion-rate')
  async getSurveyCompletionRate(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcComplyService.getSurveyCompletionRate(req.user, page, limit, startDate, endDate, functionId);
  }

  @Get('compliance-without-evidence')
  async getComplianceWithoutEvidence(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcComplyService.getComplianceWithoutEvidence(req.user, page, limit, startDate, endDate, functionId);
  }

  /**
   * Get paginated report data
   * Usage: GET /api/grc/comply/report/:reportId?page=1&limit=10&startDate=...&endDate=...&functionId=...
   */
  @Get('report/:reportId')
  async getPaginatedReport(
    @Req() req: any,
    @Param('reportId') reportId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcComplyService.getPaginatedReport(
      reportId as GrcComplyReportKey,
      req.user,
      page || 1,
      limit || 10,
      startDate,
      endDate,
      functionId
    );
  }
}


