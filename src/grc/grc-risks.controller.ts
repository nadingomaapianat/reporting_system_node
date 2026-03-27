import { Controller, Get, Post, Query, Body, Headers, Param, Req, UseGuards } from '@nestjs/common';
import { GrcRisksService } from './grc-risks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  applyOrderByFunctionDeep,
  orderByFunctionFromRequest,
  sortPaginatedResponseIfNeeded,
} from '../shared/order-by-function';
import { parseGrcFunctionIdsFromQueries } from '../shared/grc-function-ids';

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
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const norm = (s?: string) => (typeof s === 'string' ? s.replace(/\+/g, ' ').trim().replace(/\s+/g, ' ') : undefined) || undefined;
    const ob = orderByFunctionFromRequest(req);
    const raw = await this.grcRisksService.getRisksDashboard(req.user, norm(startDate) || undefined, norm(endDate) || undefined, parseGrcFunctionIdsFromQueries(functionId, functionIds));
    return ob ? applyOrderByFunctionDeep(raw) : raw;
  }

  @Get('total')
  async getTotalRisks(
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
      await this.grcRisksService.getTotalRisks(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
  }

  @Get('card')
  async getCard(
    @Req() req: any,
    @Query('cardType') cardType: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcRisksService.getFilteredCardData(req.user, cardType, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
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
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return sortPaginatedResponseIfNeeded(
      await this.grcRisksService.getFilteredCardData(req.user, cardType, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
  }

  @Get('high-risk')
  async getHighRisks(
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
      await this.grcRisksService.getHighRisks(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
  }

  @Get('medium-risk')
  async getMediumRisks(
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
      await this.grcRisksService.getMediumRisks(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
  }

  @Get('low-risk')
  async getLowRisks(
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
      await this.grcRisksService.getLowRisks(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
  }

  @Get('reduction')
  async getRiskReduction(
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
      await this.grcRisksService.getRiskReduction(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
  }

  @Get('new-risks')
  async getNewRisks(
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
      await this.grcRisksService.getNewRisks(req.user, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
      ob,
    );
  }

  @Get('by-category')
  async getRisksByCategory(
    @Req() req: any,
    @Query('category') category: string,
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
        await this.grcRisksService.getRisksByCategory(req.user, category, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
        ob,
      );
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
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcRisksService.getRisksByEventType(req.user, eventType, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
        ob,
      );
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
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      const norm = (s?: string) => (typeof s === 'string' ? s.replace(/\+/g, ' ').trim().replace(/\s+/g, ' ') : undefined) || undefined;
      const q = norm(quarter);
      if (!q) {
        return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
      }
      return sortPaginatedResponseIfNeeded(
        await this.grcRisksService.getRisksByQuarter(
          req.user,
          q,
          page,
          limit,
          norm(startDate) || undefined,
          norm(endDate) || undefined,
          parseGrcFunctionIdsFromQueries(functionId, functionIds)
        ),
        ob,
      );
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
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcRisksService.getRisksByApprovalStatus(req.user, approvalStatus, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
        ob,
      );
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
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      const norm = (s?: string) => (typeof s === 'string' ? s.replace(/\+/g, ' ').trim().replace(/\s+/g, ' ') : undefined) || undefined;
      const impact = norm(financialImpact);
      const normalized = impact ? impact.charAt(0).toUpperCase() + impact.slice(1).toLowerCase() : '';
      const validImpact = ['Low', 'Medium', 'High', 'Unknown'].includes(normalized) ? normalized : '';
      return sortPaginatedResponseIfNeeded(
        await this.grcRisksService.getRisksByFinancialImpact(
          req.user,
          validImpact,
          page,
          limit,
          norm(startDate) || undefined,
          norm(endDate) || undefined,
          parseGrcFunctionIdsFromQueries(functionId, functionIds)
        ),
        ob,
      );
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
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcRisksService.getRisksByFunction(req.user, functionName, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
        ob,
      );
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
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcRisksService.getRisksByBusinessProcess(req.user, processName, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
        ob,
      );
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
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcRisksService.getRisksByName(req.user, riskName, page, limit, startDate, endDate),
        ob,
      );
    } catch (error) {
      console.error('Error in getRisksByName:', error);
      throw error;
    }
  }

  @Get('by-control-name')
  async getRisksByControlName(
    @Req() req: any,
    @Query('controlName') controlNameQuery: string,
    @Headers('x-control-name') controlNameHeader: string | undefined,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    // Prefer header so control names with &, ?, = are not broken by query string parsing. Decode base64 when present (UTF-8 / non-ASCII).
    let controlName = controlNameQuery;
    if (controlNameHeader != null && controlNameHeader.trim() !== '') {
      const raw = controlNameHeader.trim();
      if (raw.startsWith('base64:')) {
        try {
          controlName = Buffer.from(raw.slice(7), 'base64').toString('utf-8');
        } catch {
          controlName = raw;
        }
      } else {
        controlName = raw;
      }
    }
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcRisksService.getRisksByControlName(req.user, controlName, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
        ob,
      );
    } catch (error) {
      console.error('Error in getRisksByControlName:', error);
      throw error;
    }
  }

  /** POST variant: control name in body to avoid query-string truncation for names containing &, ?, etc. */
  @Post('by-control-name')
  async getRisksByControlNamePost(
    @Req() req: any,
    @Body() body: { controlName?: string; page?: number; limit?: number; startDate?: string; endDate?: string; functionId?: string; functionIds?: string }
  ) {
    const controlName = body?.controlName ?? (req.query?.controlName as string);
    const page = body?.page ?? (Number(req.query?.page) || 1);
    const limit = body?.limit ?? (Number(req.query?.limit) || 10);
    const startDate = body?.startDate ?? req.query?.startDate;
    const endDate = body?.endDate ?? req.query?.endDate;
    const functionId = body?.functionId ?? req.query?.functionId;
    const functionIds = body?.functionIds ?? (req.query?.functionIds as string | undefined);
    try {
      return await this.grcRisksService.getRisksByControlName(
        req.user,
        controlName,
        page,
        limit,
        startDate,
        endDate,
        parseGrcFunctionIdsFromQueries(typeof functionId === 'string' ? functionId : undefined, typeof functionIds === 'string' ? functionIds : undefined),
      );
    } catch (error) {
      console.error('Error in getRisksByControlName (POST):', error);
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
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    try {
      const ob = orderByFunctionFromRequest(req);
      return sortPaginatedResponseIfNeeded(
        await this.grcRisksService.getRisksForComparison(req.user, riskName, page, limit, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds)),
        ob,
      );
    } catch (error) {
      console.error('Error in getRisksForComparison:', error);
      throw error;
    }
  }
}
