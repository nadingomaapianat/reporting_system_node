import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ChartRegistryService, SimpleChartConfig } from './chart-registry.service';
import { AutoDashboardService } from './auto-dashboard.service';

@Controller('charts')
export class SimpleChartController {
  constructor(private readonly autoDashboardService: AutoDashboardService) {}

  // Get all dashboard data (all charts)
  @Get('dashboard')
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.autoDashboardService.getDashboardData(startDate, endDate);
  }

  // Get specific chart data
  @Get(':chartId')
  async getChart(
    @Param('chartId') chartId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.autoDashboardService.getChartData(chartId, startDate, endDate);
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
