import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { GrcIncidentsService } from './grc-incidents.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  applyOrderByFunctionDeep,
  orderByFunctionFromRequest,
  sortPaginatedResponseIfNeeded,
} from '../shared/order-by-function';
import { parseGrcFunctionIdsFromQueries } from '../shared/grc-function-ids';

@Controller('api/grc/incidents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('Dashboard', ['show'])
export class GrcIncidentsController {
  constructor(private readonly grcIncidentsService: GrcIncidentsService) {}

  @Get('export-pdf')
  async proxyExportPdf(
    @Req() req: any,
    @Query() query: Record<string, any>,
    @Res() res: Response,
  ) {
    return this.grcIncidentsService.proxyExportToPython(req.user, 'pdf', query, res);
  }

  @Get('export-excel')
  async proxyExportExcel(
    @Req() req: any,
    @Query() query: Record<string, any>,
    @Res() res: Response,
  ) {
    return this.grcIncidentsService.proxyExportToPython(req.user, 'excel', query, res);
  }

  @Get()
  async getIncidentsDashboard(
    @Req() req: any,
    @Query('timeframe') timeframe?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('section') section?: 'cards' | 'charts' | 'tables',
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    const raw = await this.grcIncidentsService.getIncidentsDashboard(
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
  async getIncidentsDashboardTable(
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
    const raw = await this.grcIncidentsService.getIncidentsDashboardTablePage(
      req.user,
      tableId,
      Number(page) || 1,
      Number(limit) || 10,
      timeframe,
      startDate,
      endDate,
      parseGrcFunctionIdsFromQueries(functionId, functionIds),
      ob,
    );
    return raw;
  }

  @Get('widget')
  async getIncidentsDashboardWidget(
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
      const ob = orderByFunctionFromRequest(req);
      return this.grcIncidentsService.getIncidentsDashboardTablePage(
        req.user,
        widgetId,
        Number(page) || 1,
        Number(limit) || 10,
        undefined,
        startDate,
        endDate,
        selectedFunctionIds,
        ob,
      );
    }

    const section = kind === 'metric' ? 'cards' : 'charts';
    const payload: any = await this.grcIncidentsService.getIncidentsDashboard(
      req.user,
      undefined,
      startDate,
      endDate,
      selectedFunctionIds,
      section,
    );

    if (kind === 'metric') {
      const metricPayload: Record<string, any> = {
        totalIncidents: { total: Number((payload?.total ?? payload?.totalIncidents) || 0) },
        pendingPreparer: { pendingPreparer: Number(payload?.pendingPreparer || 0) },
        pendingChecker: { pendingChecker: Number(payload?.pendingChecker || 0) },
        pendingReviewer: { pendingReviewer: Number(payload?.pendingReviewer || 0) },
        pendingAcceptance: { pendingAcceptance: Number(payload?.pendingAcceptance || 0) },
        atmTheftCount: { atmTheftCount: Number(payload?.atmTheftCount || 0) },
        avgRecognitionTime: { avgRecognitionTime: Number(payload?.avgRecognitionTime || 0) },
        internalFraudCount: { internalFraudCount: Number(payload?.internalFraudCount || 0) },
        externalFraudCount: { externalFraudCount: Number(payload?.externalFraudCount || 0) },
        physicalAssetDamageCount: { physicalAssetDamageCount: Number(payload?.physicalAssetDamageCount || 0) },
        peopleErrorCount: { peopleErrorCount: Number(payload?.peopleErrorCount || 0) },
        internalFraudLoss: { internalFraudLoss: Number(payload?.internalFraudLoss || 0) },
        externalFraudLoss: { externalFraudLoss: Number(payload?.externalFraudLoss || 0) },
        physicalAssetLoss: { physicalAssetLoss: Number(payload?.physicalAssetLoss || 0) },
        peopleErrorLoss: { peopleErrorLoss: Number(payload?.peopleErrorLoss || 0) },
      };
      return metricPayload[widgetId] ?? {};
    }

    const chartPayload: Record<string, any> = {
      byCategory: { incidentsByCategory: payload?.incidentsByCategory || [], categoryDistribution: payload?.categoryDistribution || [] },
      byStatus: { incidentsByStatus: payload?.incidentsByStatus || [], incidentsByStatusDistribution: payload?.incidentsByStatusDistribution || [] },
      monthlyTrend: { monthlyTrend: payload?.monthlyTrend || [] },
      incidentsTimeSeries: { incidentsTimeSeries: payload?.incidentsTimeSeries || [] },
      topFinancialImpacts: { topFinancialImpacts: payload?.topFinancialImpacts || [] },
      incidentsByEventType: { incidentsByEventType: payload?.incidentsByEventType || [] },
      incidentsByFinancialImpact: { incidentsByFinancialImpact: payload?.incidentsByFinancialImpact || [] },
      operationalLossValue: { operationalLossValue: payload?.operationalLossValue || [] },
      monthlyTrendByType: { monthlyTrendByType: payload?.monthlyTrendByType || [] },
      incidentActionPlanByStatus: { incidentActionPlanByStatus: payload?.incidentActionPlanByStatus || [] },
    };
    return chartPayload[widgetId] ?? {};
  }

  @Get('export')
  async exportIncidents(
    @Req() req: any,
    @Query('format') format: string,
    @Query('timeframe') timeframe?: string
  ) {
    return this.grcIncidentsService.exportIncidents(req.user, format, timeframe);
  }

  @Get('list')
  async getIncidentsList(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10000,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return this.grcIncidentsService.getTotalIncidents(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds), ob);
  }

  @Get('total')
  async getTotalIncidents(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return this.grcIncidentsService.getTotalIncidents(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds), ob);
  }

  @Get('pending-preparer')
  async getPendingPreparerIncidents(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return this.grcIncidentsService.getPendingPreparerIncidents(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds), ob);
  }

  @Get('pending-checker')
  async getPendingCheckerIncidents(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return this.grcIncidentsService.getPendingCheckerIncidents(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds), ob);
  }

  @Get('pending-reviewer')
  async getPendingReviewerIncidents(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return this.grcIncidentsService.getPendingReviewerIncidents(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds), ob);
  }

  @Get('pending-acceptance')
  async getPendingAcceptanceIncidents(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return this.grcIncidentsService.getPendingAcceptanceIncidents(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds), ob);
  }

  @Get('by-category')
  async getIncidentsByCategory(
    @Req() req: any,
    @Query('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    if (!category) {
      throw new Error('category parameter is required');
    }
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcIncidentsService.getIncidentsByCategory(req.user, category, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('by-event-type')
  async getIncidentsByEventType(
    @Req() req: any,
    @Query('eventType') eventType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    if (!eventType) {
      throw new Error('eventType parameter is required');
    }
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcIncidentsService.getIncidentsByEventType(req.user, eventType, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('by-financial-impact')
  async getIncidentsByFinancialImpact(
    @Req() req: any,
    @Query('financialImpact') financialImpact: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    if (!financialImpact) {
      throw new Error('financialImpact parameter is required');
    }
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcIncidentsService.getIncidentsByFinancialImpact(req.user, financialImpact, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('by-status')
  async getIncidentsByStatus(
    @Req() req: any,
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    if (!status) {
      throw new Error('status parameter is required');
    }
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcIncidentsService.getIncidentsByStatus(req.user, status, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('action-plans')
  async getIncidentActionPlans(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string,
    @Query('businessUnit') businessUnit?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcIncidentsService.getIncidentActionPlans(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds), businessUnit),
      ob
    );
  }

  @Get('by-month-year')
  async getIncidentsByMonthYear(
    @Req() req: any,
    @Query('monthYear') monthYear: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    if (!monthYear) {
      throw new Error('monthYear parameter is required')
    }
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcIncidentsService.getIncidentsByMonthYear(req.user, monthYear, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('by-sub-category')
  async getIncidentsBySubCategory(
    @Req() req: any,
    @Query('subCategory') subCategory: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    if (!subCategory) {
      throw new Error('subCategory parameter is required');
    }
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcIncidentsService.getIncidentsBySubCategory(req.user, subCategory, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('by-period')
  async getIncidentsByPeriod(
    @Req() req: any,
    @Query('period') period: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    if (!period) {
      throw new Error('period parameter is required. Expected format: MM/YYYY');
    }
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcIncidentsService.getIncidentsByPeriod(req.user, period, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('by-internal-fraud')
  async getIncidentsByInternalFraud(
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
      await this.grcIncidentsService.getIncidentsByEventType(req.user, 'Internal Fraud', page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('by-external-fraud')
  async getIncidentsByExternalFraud(
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
      await this.grcIncidentsService.getIncidentsByEventType(req.user, 'External Fraud', page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('by-physical-asset-damage')
  async getIncidentsByPhysicalAssetDamage(
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
      await this.grcIncidentsService.getIncidentsByEventType(req.user, 'Damage to Physical Assets', page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('by-atm-issue')
  async getIncidentsByATMIssue(
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
      await this.grcIncidentsService.getIncidentsBySubCategory(req.user, 'ATM issue', page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('by-people-error')
  async getIncidentsByPeopleError(
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
      await this.grcIncidentsService.getIncidentsBySubCategory(req.user, 'Human Mistake', page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('recognition-time')
  async getIncidentsWithRecognitionTime(
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
      await this.grcIncidentsService.getIncidentsWithRecognitionTime(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('by-period-and-type')
  async getIncidentsByPeriodAndType(
    @Req() req: any,
    @Query('period') period: string,
    @Query('incidentType') incidentType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    if (!period) {
      throw new Error('period parameter is required. Expected format: YYYY-MM or MM/YYYY');
    }
    if (!incidentType) {
      throw new Error('incidentType parameter is required');
    }
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcIncidentsService.getIncidentsByPeriodAndType(req.user, period, incidentType, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }

  @Get('by-comprehensive-metric')
  async getIncidentsByComprehensiveMetric(
    @Req() req: any,
    @Query('metric') metric: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    if (!metric) {
      throw new Error('metric parameter is required');
    }
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcIncidentsService.getIncidentsByComprehensiveMetric(req.user, metric, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob
    );
  }
}
