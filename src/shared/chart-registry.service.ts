import { Injectable } from '@nestjs/common';

export interface SimpleChartConfig {
  id: string;
  name: string;
  type: 'bar' | 'pie' | 'line' | 'area' | 'scatter';
  sql: string;
  xField?: string;
  yField?: string;
  labelField?: string;
}

@Injectable()
export class ChartRegistryService {
  private static charts: Map<string, SimpleChartConfig> = new Map();

  // Add a new chart with just SQL - SUPER SIMPLE!
  static addChart(config: SimpleChartConfig) {
    this.charts.set(config.id, {
      ...config,
      xField: config.xField || 'name',
      yField: config.yField || 'value',
      labelField: config.labelField || 'name'
    });
  }

  // Get all charts for a dashboard
  static getChartsForDashboard(dashboardId: string): SimpleChartConfig[] {
    return Array.from(this.charts.values());
  }

  // Get specific chart
  static getChart(chartId: string): SimpleChartConfig | undefined {
    return this.charts.get(chartId);
  }

  // Remove chart
  static removeChart(chartId: string) {
    this.charts.delete(chartId);
  }

  // List all charts
  static listCharts() {
    return Array.from(this.charts.entries()).map(([id, config]) => ({
      id,
      name: config.name,
      type: config.type
    }));
  }
}
