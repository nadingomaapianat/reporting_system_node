import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ChartRegistryService, SimpleChartConfig } from './chart-registry.service';

@Injectable()
export class AutoDashboardService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Get dashboard data with ALL registered charts automatically
  async getDashboardData(startDate?: string, endDate?: string) {
    const charts = ChartRegistryService.getChartsForDashboard('main');
    const results: any = {};

    // Execute all chart queries in parallel
    const chartPromises = charts.map(async (chart) => {
      try {
        const query = this.buildQuery(chart.sql, startDate, endDate);
        const data = await this.databaseService.query(query);
        
        return {
          id: chart.id,
          data: data.map(row => ({
            name: row[chart.xField!],
            value: row[chart.yField!],
            label: row[chart.labelField!] || row[chart.xField!]
          }))
        };
      } catch (error) {
        console.error(`Error fetching chart ${chart.id}:`, error);
        return {
          id: chart.id,
          data: []
        };
      }
    });

    const chartResults = await Promise.all(chartPromises);
    
    // Convert to the format expected by frontend
    chartResults.forEach(result => {
      results[result.id] = result.data;
    });

    return results;
  }

  // Get specific chart data
  async getChartData(chartId: string, startDate?: string, endDate?: string) {
    const chart = ChartRegistryService.getChart(chartId);
    if (!chart) {
      throw new Error(`Chart ${chartId} not found`);
    }

    const query = this.buildQuery(chart.sql, startDate, endDate);
    const data = await this.databaseService.query(query);
    
    return data.map(row => ({
      name: row[chart.xField!],
      value: row[chart.yField!],
      label: row[chart.labelField!] || row[chart.xField!]
    }));
  }

  private buildQuery(sql: string, startDate?: string, endDate?: string): string {
    let dateFilter = '';
    
    if (startDate) {
      dateFilter += ` AND created_at >= '${startDate}'`;
    }
    if (endDate) {
      dateFilter += ` AND created_at <= '${endDate} 23:59:59'`;
    }
    
    return sql.replace('{dateFilter}', dateFilter);
  }
}
