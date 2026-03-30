import { Controller, Get, Query, Req, Param, UseGuards } from '@nestjs/common';
import { GrcComplyService, GrcComplyReportKey } from './grc-comply.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  applyOrderByFunctionDeep,
  orderByFunctionFromRequest,
  sortPaginatedResponseIfNeeded,
} from '../shared/order-by-function';

@Controller('api/grc/comply')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('Reporting', ['show'])
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
    @Query('section') section?: 'cards' | 'charts' | 'tables',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    // Log received query parameters
    // console.log('[GrcComplyController.getDashboardOrReport] Query params received:', { 
    //   report, 
    //   startDate, 
    //   endDate, 
    //   functionId,
    //   allQueryParams: req.query 
    // });
    
    // If report query param is provided, return single report (backward compatibility)
    if (report) {
      const reportKey = report as GrcComplyReportKey;
      const ob = orderByFunctionFromRequest(req);
      const raw = await this.grcComplyService.runReport(reportKey, startDate, endDate, functionId);
      return ob ? applyOrderByFunctionDeep(raw) : raw;
    }

    const ob = orderByFunctionFromRequest(req);
    if (section) {
      const raw = await this.grcComplyService.runDashboardSection(section, startDate, endDate, functionId);
      return ob ? applyOrderByFunctionDeep(raw) : raw;
    }

    const raw = await this.grcComplyService.getComplyDashboard(req.user, startDate, endDate, functionId);
    return ob ? applyOrderByFunctionDeep(raw) : raw;
  }

  @Get('table')
  async getDashboardTable(
    @Req() req: any,
    @Query('tableId') tableId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
  ) {
    const norm = (s?: string) => (typeof s === 'string' ? s.replace(/\+/g, ' ').trim().replace(/\s+/g, ' ') : undefined) || undefined;
    const start = norm(startDate);
    const end = norm(endDate);
    const id = norm(functionId);
    const ob = orderByFunctionFromRequest(req);
    const raw = await this.grcComplyService.getDashboardTablePage(
      tableId,
      Number(page) || 1,
      Number(limit) || 10,
      start && /^\d{4}-\d{2}-\d{2}/.test(start) ? start : undefined,
      end && /^\d{4}-\d{2}-\d{2}/.test(end) ? end : undefined,
      id,
    );
    return sortPaginatedResponseIfNeeded(raw, ob);
  }

  @Get('widget')
  async getDashboardWidget(
    @Req() req: any,
    @Query('kind') kind: 'metric' | 'chart' | 'table',
    @Query('widgetId') widgetId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
  ) {
    const norm = (s?: string) => (typeof s === 'string' ? s.replace(/\+/g, ' ').trim().replace(/\s+/g, ' ') : undefined) || undefined;
    const start = norm(startDate);
    const end = norm(endDate);
    const id = norm(functionId);

    if (kind === 'table') {
      return this.grcComplyService.getDashboardTablePage(
        widgetId,
        Number(page) || 1,
        Number(limit) || 10,
        start && /^\d{4}-\d{2}-\d{2}/.test(start) ? start : undefined,
        end && /^\d{4}-\d{2}-\d{2}/.test(end) ? end : undefined,
        id,
      );
    }

    const section = kind === 'metric' ? 'cards' : 'charts';
    const payload = await this.grcComplyService.runDashboardSection(
      section,
      start && /^\d{4}-\d{2}-\d{2}/.test(start) ? start : undefined,
      end && /^\d{4}-\d{2}-\d{2}/.test(end) ? end : undefined,
      id,
    ) as Record<string, any>;

    const widgetPayload: Record<string, any> = {
      totalSurveys: { 'Surveys by Status': payload['Surveys by Status'] || [] },
      totalCompliance: { 'Compliance Details': payload['Compliance Details'] || [] },
      avgCompletionRate: { 'Survey Completion Rate': payload['Survey Completion Rate'] || [] },
      complianceWithoutEvidence: { 'Compliance controls without evidence': payload['Compliance controls without evidence'] || [] },
      surveysByStatus: { 'Surveys by Status': payload['Surveys by Status'] || [] },
      complianceByStatus: { 'Compliance per complianceStatus': payload['Compliance per complianceStatus'] || [] },
      complianceByProgress: { 'Compliance per progressStatus': payload['Compliance per progressStatus'] || [] },
      avgScorePerSurvey: { 'Average Score Per Survey': payload['Average Score Per Survey'] || [] },
      complianceByControlCategory: { 'Compliance by Control Category': payload['Compliance by Control Category'] || [] },
      topFailedControls: { 'Top Failed Controls': payload['Top Failed Controls'] || [] },
      controlsPerCategory: { 'Controls no. per category': payload['Controls no. per category'] || [] },
      risksPerCategory: { 'Risks no. per category': payload['Risks no. per category'] || [] },
      impactedAreasTrend: { 'Impacted Areas Trend Over Time': payload['Impacted Areas Trend Over Time'] || [] },
    };
    return widgetPayload[widgetId] ?? {};
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
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const norm = (s?: string) => (typeof s === 'string' ? s.replace(/\+/g, ' ').trim().replace(/\s+/g, ' ') : undefined) || undefined;
    const start = norm(startDate);
    const end = norm(endDate);
    const id = norm(functionId);
    const ob = orderByFunctionFromRequest(req);
    const raw = await this.grcComplyService.runAllReports(
      start && /^\d{4}-\d{2}-\d{2}/.test(start) ? start : undefined,
      end && /^\d{4}-\d{2}-\d{2}/.test(end) ? end : undefined,
      id && id.length > 0 ? id : undefined
    );
    return ob ? applyOrderByFunctionDeep(raw) : raw;
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
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getSurveys(req.user, page, limit, startDate, endDate, functionId),
      ob,
    );
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
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getComplianceDetails(req.user, page, limit, startDate, endDate, functionId),
      ob,
    );
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
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getSurveyCompletionRate(req.user, page, limit, startDate, endDate, functionId),
      ob,
    );
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
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getComplianceWithoutEvidence(req.user, page, limit, startDate, endDate, functionId),
      ob,
    );
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
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getPaginatedReport(
        reportId as GrcComplyReportKey,
        req.user,
        page || 1,
        limit || 10,
        startDate,
        endDate,
        functionId
      ),
      ob,
    );
  }

  /**
   * Detail endpoints for chart drill-downs
   */
  @Get('surveys-by-status')
  async getSurveysByStatus(
    @Req() req: any,
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getSurveysByStatus(req.user, status, page, limit, startDate, endDate, functionId),
      ob,
    );
  }

  @Get('compliance-by-status')
  async getComplianceByStatus(
    @Req() req: any,
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getComplianceByStatus(req.user, status, page, limit, startDate, endDate, functionId),
      ob,
    );
  }

  @Get('compliance-by-progress')
  async getComplianceByProgress(
    @Req() req: any,
    @Query('progressStatus') progressStatus: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcComplyService.getComplianceByProgress(req.user, progressStatus, page, limit, startDate, endDate, functionId);
  }

  @Get('compliance-by-approval')
  async getComplianceByApproval(
    @Req() req: any,
    @Query('approvalStatus') approvalStatus: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getComplianceByApproval(req.user, approvalStatus, page, limit, startDate, endDate, functionId),
      ob,
    );
  }

  @Get('avg-score-by-survey')
  async getAvgScoreBySurvey(
    @Req() req: any,
    @Query('surveyName') surveyName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getAvgScoreBySurvey(req.user, surveyName, page, limit, startDate, endDate, functionId),
      ob,
    );
  }

  @Get('compliance-by-category')
  async getComplianceByCategory(
    @Req() req: any,
    @Query('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getComplianceByCategory(req.user, category, page, limit, startDate, endDate, functionId),
      ob,
    );
  }

  @Get('top-failed-controls')
  async getTopFailedControls(
    @Req() req: any,
    @Query('controlName') controlName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getTopFailedControls(req.user, controlName, page, limit, startDate, endDate, functionId),
      ob,
    );
  }

  @Get('controls-by-category')
  async getControlsByCategory(
    @Req() req: any,
    @Query('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcComplyService.getControlsByCategory(req.user, category, page, limit, startDate, endDate, functionId);
  }

  @Get('risks-by-category')
  async getRisksByCategory(
    @Req() req: any,
    @Query('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getRisksByCategory(req.user, category, page, limit, startDate, endDate, functionId),
      ob,
    );
  }

  @Get('impacted-areas-by-month')
  async getImpactedAreasByMonth(
    @Req() req: any,
    @Query('month') month: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getImpactedAreasByMonth(req.user, month, page, limit, startDate, endDate, functionId),
      ob,
    );
  }

  @Get('questions-by-type')
  async getQuestionsByType(
    @Req() req: any,
    @Query('questionType') questionType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getQuestionsByType(req.user, questionType, page, limit, startDate, endDate, functionId),
      ob,
    );
  }

  @Get('questions-by-reference')
  async getQuestionsByReference(
    @Req() req: any,
    @Query('referenceName') referenceName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getQuestionsByReference(req.user, referenceName, page, limit, startDate, endDate, functionId),
      ob,
    );
  }

  @Get('controls-by-domain')
  async getControlsByDomain(
    @Req() req: any,
    @Query('domain') domain: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcComplyService.getControlsByDomain(req.user, domain, page, limit, startDate, endDate, functionId);
  }

  @Get('answers-by-function')
  async getAnswersByFunction(
    @Req() req: any,
    @Query('functionName') functionName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getAnswersByFunction(req.user, functionName, page, limit, startDate, endDate, functionId),
      ob,
    );
  }

  @Get('questions-by-survey-category')
  async getQuestionsBySurveyAndCategory(
    @Req() req: any,
    @Query('surveyName') surveyName: string,
    @Query('categoryName') categoryName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getQuestionsBySurveyAndCategory(
        req.user,
        surveyName,
        categoryName,
        page,
        limit,
        startDate,
        endDate,
        functionId,
      ),
      ob,
    );
  }

  @Get('questions-by-category-only')
  async getQuestionsByCategory(
    @Req() req: any,
    @Query('categoryName') categoryName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    return this.grcComplyService.getQuestionsByCategory(req.user, categoryName, page, limit, startDate, endDate, functionId);
  }

  @Get('controls-by-impacted-area')
  async getControlsByImpactedArea(
    @Req() req: any,
    @Query('impactedAreaName') impactedAreaName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcComplyService.getControlsByImpactedArea(
        req.user,
        impactedAreaName,
        page,
        limit,
        startDate,
        endDate,
        functionId,
      ),
      ob,
    );
  }
}


