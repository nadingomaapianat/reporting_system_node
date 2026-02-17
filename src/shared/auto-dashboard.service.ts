import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ChartRegistryService, SimpleChartConfig } from './chart-registry.service';
import { UserFunctionAccessService, UserFunctionAccess } from './user-function-access.service';

@Injectable()
export class AutoDashboardService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly userFunctionAccess?: UserFunctionAccessService,
  ) {}

  // Get dashboard data with ALL registered charts automatically
  async getDashboardData(user: any, startDate?: string, endDate?: string, functionId?: string) {
    const charts = ChartRegistryService.getChartsForDashboard('main');
    const results: any = {};

    // Get function filter if user is provided and service is available
    let functionFilter = '';
    if (user && this.userFunctionAccess) {
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      functionFilter = this.userFunctionAccess.buildControlFunctionFilter('c', access, functionId);
    }

    // Execute all chart queries in parallel
    const chartPromises = charts.map(async (chart) => {
      try {
        const query = this.buildQuery(chart.sql, startDate, endDate, functionFilter);
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
  async getChartData(user: any, chartId: string, startDate?: string, endDate?: string, functionId?: string) {
    const chart = ChartRegistryService.getChart(chartId);
    if (!chart) {
      throw new Error(`Chart ${chartId} not found`);
    }

    // Get function filter if user is provided and service is available
    let functionFilter = '';
    if (user && this.userFunctionAccess) {
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      functionFilter = this.userFunctionAccess.buildControlFunctionFilter('c', access, functionId);
    }

    const query = this.buildQuery(chart.sql, startDate, endDate, functionFilter);
    const data = await this.databaseService.query(query);
    
    return data.map(row => ({
      name: row[chart.xField!],
      value: row[chart.yField!],
      label: row[chart.labelField!] || row[chart.xField!]
    }));
  }

  private buildQuery(sql: string, startDate?: string, endDate?: string, functionFilter: string = ''): string {
    let dateFilter = '';
    
    if (startDate) {
      dateFilter += ` AND created_at >= '${startDate}'`;
    }
    if (endDate) {
      dateFilter += ` AND created_at <= '${endDate} 23:59:59'`;
    }
    
    let query = sql.replace('{dateFilter}', dateFilter);
    
    // Replace functionFilter placeholder if it exists
    if (functionFilter && query.includes('{functionFilter}')) {
      query = query.replace('{functionFilter}', functionFilter);
    } else if (functionFilter && query.includes('FROM') && (query.includes('Controls') || query.includes('[Controls]'))) {
      // Auto-inject function filter for Control queries
      const hasAliasC = /\bFROM\s+.*Controls.*\s+c\b/i.test(query) || /\bFROM\s+.*\s+c\s+.*Controls/i.test(query);
      let filterToInject = functionFilter;
      
      if (!hasAliasC) {
        const aliasMatch = query.match(/FROM\s+(?:dbo\.)?\[?Controls\]?\s+(\w+)/i);
        if (aliasMatch && aliasMatch[1]) {
          filterToInject = functionFilter.replace(/c\./g, `${aliasMatch[1]}.`);
        } else {
          query = query.replace(/(FROM\s+(?:dbo\.)?\[?Controls\]?)(\s|$)/i, '$1 c$2');
        }
      }
      
      const whereIndex = query.toUpperCase().indexOf(' WHERE ');
      if (whereIndex > -1) {
        const beforeWhere = query.substring(0, whereIndex + 7);
        const afterWhere = query.substring(whereIndex + 7);
        query = beforeWhere + filterToInject + ' ' + afterWhere;
      } else {
        const fromIndex = query.toUpperCase().lastIndexOf(' FROM ');
        if (fromIndex > -1) {
          const beforeFrom = query.substring(0, fromIndex);
          const fromClause = query.substring(fromIndex);
          const groupByIndex = fromClause.toUpperCase().indexOf(' GROUP BY ');
          const orderByIndex = fromClause.toUpperCase().indexOf(' ORDER BY ');
          const endIndex = groupByIndex > -1 ? groupByIndex : (orderByIndex > -1 ? orderByIndex : fromClause.length);
          const fromPart = fromClause.substring(0, endIndex);
          const restPart = fromClause.substring(endIndex);
          query = beforeFrom + fromPart + ' WHERE 1=1 ' + filterToInject + restPart;
        }
      }
    }
    
    return query;
  }
}
