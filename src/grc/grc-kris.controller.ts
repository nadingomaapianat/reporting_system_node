import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { GrcKrisService } from './grc-kris.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  applyOrderByFunctionDeep,
  orderByFunctionFromRequest,
  sortPaginatedResponseIfNeeded,
} from '../shared/order-by-function';
import { parseGrcFunctionIdsFromQueries } from '../shared/grc-function-ids';

@Controller('api/grc/kris')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('Reporting', ['show'])
export class GrcKrisController {
  constructor(private readonly grcKrisService: GrcKrisService) {}

  @Get()
  async getKrisDashboard(
    @Req() req: any, 
    @Query('timeframe') timeframe?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('section') section?: 'cards' | 'charts' | 'tables',
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    const raw = await this.grcKrisService.getKrisDashboard(
      req.user,
      timeframe,
      startDate,
      endDate,
      parseGrcFunctionIdsFromQueries(functionId, functionIds),
      section,
    );
    return ob ? applyOrderByFunctionDeep(raw) : raw;
  }

  @Get('table')
  async getKrisDashboardTable(
    @Req() req: any,
    @Query('tableId') tableId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('timeframe') timeframe?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string,
  ) {
    const ob = orderByFunctionFromRequest(req);
    const raw = await this.grcKrisService.getKrisDashboardTablePage(
      req.user,
      tableId,
      Number(page) || 1,
      Number(limit) || 10,
      timeframe,
      startDate,
      endDate,
      parseGrcFunctionIdsFromQueries(functionId, functionIds),
    );
    return sortPaginatedResponseIfNeeded(raw, ob);
  }

  @Get('widget')
  async getKrisDashboardWidget(
    @Req() req: any,
    @Query('kind') kind: 'metric' | 'chart' | 'table',
    @Query('widgetId') widgetId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string,
  ) {
    const selectedFunctionIds = parseGrcFunctionIdsFromQueries(functionId, functionIds);

    if (kind === 'table') {
      return this.grcKrisService.getKrisDashboardTablePage(
        req.user,
        widgetId,
        Number(page) || 1,
        Number(limit) || 10,
        undefined,
        startDate,
        endDate,
        selectedFunctionIds,
      );
    }

    const section = kind === 'metric' ? 'cards' : 'charts';
    const payload: any = await this.grcKrisService.getKrisDashboard(
      req.user,
      undefined,
      startDate,
      endDate,
      selectedFunctionIds,
      section,
    );

    if (kind === 'metric') {
      const metricPayload: Record<string, any> = {
        totalKris: { totalKris: Number(payload?.totalKris || 0) },
        pendingPreparer: { pendingPreparer: Number(payload?.pendingPreparer || 0) },
        pendingChecker: { pendingChecker: Number(payload?.pendingChecker || 0) },
        pendingReviewer: { pendingReviewer: Number(payload?.pendingReviewer || 0) },
        pendingAcceptance: { pendingAcceptance: Number(payload?.pendingAcceptance || 0) },
      };
      return metricPayload[widgetId] ?? {};
    }

    const chartPayload: Record<string, any> = {
      krisByStatus: { krisByStatus: payload?.krisByStatus || [] },
      krisByLevel: { krisByLevel: payload?.krisByLevel || [] },
      breachedKRIsByDepartment: { breachedKRIsByDepartment: payload?.breachedKRIsByDepartment || [] },
      kriAssessmentCount: { kriAssessmentCount: payload?.kriAssessmentCount || [] },
      kriCountsByFrequency: { kriCountsByFrequency: payload?.kriCountsByFrequency || [] },
      kriCountsByMonthYear: { kriCountsByMonthYear: payload?.kriCountsByMonthYear || [] },
      kriRisksByKriName: { kriRisksByKriName: payload?.kriRisksByKriName || [] },
      deletedKrisPerMonth: { deletedKrisPerMonth: payload?.deletedKrisPerMonth || [] },
      kriOverdueStatusCounts: { kriOverdueStatusCounts: payload?.kriOverdueStatusCounts || [] },
      kriMonthlyAssessment: { kriMonthlyAssessment: payload?.kriMonthlyAssessment || [] },
    };
    return chartPayload[widgetId] ?? {};
  }

  @Get('export')
  async exportKris(
    @Req() req: any,
    @Query('format') format: string,
    @Query('timeframe') timeframe?: string
  ) {
    return this.grcKrisService.exportKris(req.user, format, timeframe);
  }

  @Get('total')
  async getTotalKris(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcKrisService.getTotalKris(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
  }

  @Get('pending-preparer')
  async getPendingPreparerKris(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcKrisService.getPendingPreparerKris(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
  }

  @Get('pending-checker')
  async getPendingCheckerKris(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcKrisService.getPendingCheckerKris(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
  }

  @Get('pending-reviewer')
  async getPendingReviewerKris(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcKrisService.getPendingReviewerKris(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
  }

  @Get('pending-acceptance')
  async getPendingAcceptanceKris(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcKrisService.getPendingAcceptanceKris(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
  }

  @Get('by-status')
  async getKrisByStatus(
    @Req() req: any,
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcKrisService.getKrisByStatus(req.user, status, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
        ob,
      );
    } catch (error) {
      console.error('Error fetching KRIs by status:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-level')
  async getKrisByLevel(
    @Req() req: any,
    @Query('level') level: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcKrisService.getKrisByLevel(req.user, level, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
        ob,
      );
    } catch (error) {
      console.error('Error fetching KRIs by level:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-function')
  async getKrisByFunction(
    @Req() req: any,
    @Query('functionName') functionName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('submissionStatus') submissionStatus?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcKrisService.getKrisByFunction(
          req.user,
          functionName,
          page,
          limit,
          startDate,
          endDate,
          submissionStatus,
          parseGrcFunctionIdsFromQueries(functionId, functionIds),
        ),
        ob,
      );
    } catch (error) {
      console.error('Error fetching KRIs by function:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('with-assessments-by-function')
  async getKrisWithAssessmentsByFunction(
    @Req() req: any,
    @Query('functionName') functionName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcKrisService.getKrisWithAssessmentsByFunction(
          req.user,
          functionName,
          page,
          limit,
          startDate,
          endDate,
          parseGrcFunctionIdsFromQueries(functionId, functionIds),
        ),
        ob,
      );
    } catch (error) {
      console.error('Error fetching KRIs with assessments by function:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-frequency')
  async getKrisByFrequency(
    @Req() req: any,
    @Query('frequency') frequency: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcKrisService.getKrisByFrequency(req.user, frequency, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
        ob,
      );
    } catch (error) {
      console.error('Error fetching KRIs by frequency:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('risks-by-kri-name')
  async getRisksByKriName(
    @Req() req: any,
    @Query('kriName') kriName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcKrisService.getRisksByKriName(req.user, kriName, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
        ob,
      );
    } catch (error) {
      console.error('Error fetching risks by KRI name:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-month-year')
  async getKrisByMonthYear(
    @Req() req: any,
    @Query('monthYear') monthYear: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcKrisService.getKrisByMonthYear(req.user, monthYear, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
        ob,
      );
    } catch (error) {
      console.error('Error fetching KRIs by month/year:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('assessments-by-month-level')
  async getKriAssessmentsByMonthAndLevel(
    @Req() req: any,
    @Query('monthYear') monthYear: string,
    @Query('assessmentLevel') assessmentLevel: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcKrisService.getKriAssessmentsByMonthAndLevel(
          req.user,
          monthYear,
          assessmentLevel,
          page,
          limit,
          startDate,
          endDate,
          parseGrcFunctionIdsFromQueries(functionId, functionIds),
        ),
        ob,
      );
    } catch (error) {
      console.error('Error fetching KRI assessments by month and level:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  @Get('by-overdue-status')
  async getKrisByOverdueStatus(
    @Req() req: any,
    @Query('overdueStatus') overdueStatus: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcKrisService.getKrisByOverdueStatus(
          req.user,
          overdueStatus,
          page,
          limit,
          startDate,
          endDate,
          parseGrcFunctionIdsFromQueries(functionId, functionIds),
        ),
        ob,
      );
    } catch (error) {
      console.error('Error fetching KRIs by overdue status:', error);
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }
}
