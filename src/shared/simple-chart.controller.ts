import { Controller, Get, Post, Body, Query, Param, Req, UseGuards } from '@nestjs/common';
import { ChartRegistryService, SimpleChartConfig } from './chart-registry.service';
import { AutoDashboardService } from './auto-dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { orderByFunctionFromRequest } from './order-by-function';
import { parseGrcFunctionIdsFromQueries } from './grc-function-ids';

@Controller('charts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('Reporting', ['show'])
export class SimpleChartController {
  constructor(private readonly autoDashboardService: AutoDashboardService) {}

  // Get all dashboard data (all charts)
  @Get('dashboard')
  async getDashboard(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    const ob = orderByFunctionFromRequest(req);
    return this.autoDashboardService.getDashboardData(req.user, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds), ob);
  }

  // Get specific chart data
  @Get(':chartId')
  async getChart(
    @Req() req: any,
    @Param('chartId') chartId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('functionId') functionId?: string,
    @Query('functionIds') functionIds?: string
  ) {
    return this.autoDashboardService.getChartData(req.user, chartId, startDate, endDate, parseGrcFunctionIdsFromQueries(functionId, functionIds));
  }

  // Add new chart (for admin/development)
  @Post('add')
  async addChart(@Body() chartConfig: SimpleChartConfig) {
    ChartRegistryService.addChart(chartConfig);
    return { 
      success: true, 
      message: `Chart '${chartConfig.name}' added successfully`,
      chartId: chartConfig.id
    };
  }

  // List all charts
  @Get('list')
  async listCharts() {
    return ChartRegistryService.listCharts();
  }

  // Remove chart
  @Post('remove/:chartId')
  async removeChart(@Param('chartId') chartId: string) {
    ChartRegistryService.removeChart(chartId);
    return { 
      success: true, 
      message: `Chart '${chartId}' removed successfully`
    };
  }
}
