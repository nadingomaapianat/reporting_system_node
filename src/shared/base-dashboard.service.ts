import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface DashboardConfig {
  name: string;
  tableName: string;
  dateField?: string;
  metrics: MetricConfig[];
  charts: ChartConfig[];
  tables: TableConfig[];
}

export interface MetricConfig {
  id: string;
  name: string;
  query: string;
  color: string;
  icon: string;
  changeQuery?: string;
}

export interface ChartConfig {
  id: string;
  name: string;
  type: 'bar' | 'pie' | 'line' | 'area' | 'scatter';
  query: string;
  xField: string;
  yField: string;
  labelField?: string;
}

export interface TableConfig {
  id: string;
  name: string;
  query: string;
  columns: ColumnConfig[];
  pagination?: boolean;
}

export interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'status' | 'currency';
  render?: (value: any) => any;
}

@Injectable()
export abstract class BaseDashboardService {
  constructor(protected readonly databaseService: DatabaseService) {}

  abstract getConfig(): DashboardConfig;

  async getDashboardData(startDate?: string, endDate?: string) {
    const config = this.getConfig();
    const dateFilter = this.buildDateFilter(startDate, endDate, config.dateField);

    try {
      // Execute all queries in parallel
      const [
        metricsResults,
        chartsResults,
        tablesResults
      ] = await Promise.all([
        this.getMetricsData(config.metrics, dateFilter),
        this.getChartsData(config.charts, dateFilter),
        this.getTablesData(config.tables, dateFilter)
      ]);

      return {
        ...metricsResults,
        ...chartsResults,
        ...tablesResults
      };
    } catch (error) {
      console.error(`Error fetching ${config.name} dashboard data:`, error);
      throw error;
    }
  }

  private async getMetricsData(metrics: MetricConfig[], dateFilter: string) {
    const results: any = {};
    
    for (const metric of metrics) {
      try {
        const query = metric.query.replace('{dateFilter}', dateFilter);
        const result = await this.databaseService.query(query);
        results[metric.id] = result[0]?.total || result[0]?.count || 0;
        
        // Get change data if changeQuery is provided
        if (metric.changeQuery) {
          const changeQuery = metric.changeQuery.replace('{dateFilter}', dateFilter);
          const changeResult = await this.databaseService.query(changeQuery);
          results[`${metric.id}Change`] = this.calculateChange(
            results[metric.id], 
            changeResult[0]?.total || changeResult[0]?.count || 0
          );
        }
      } catch (error) {
        console.error(`Error fetching metric ${metric.id}:`, error);
        results[metric.id] = 0;
        results[`${metric.id}Change`] = '+0%';
      }
    }
    
    return results;
  }

  private async getChartsData(charts: ChartConfig[], dateFilter: string) {
    const results: any = {};
    
    for (const chart of charts) {
      try {
        const query = chart.query.replace('{dateFilter}', dateFilter);
        const result = await this.databaseService.query(query);
        
        results[chart.id] = result.map(row => ({
          name: row[chart.xField],
          value: row[chart.yField],
          label: chart.labelField ? row[chart.labelField] : row[chart.xField]
        }));
      } catch (error) {
        console.error(`Error fetching chart ${chart.id}:`, error);
        results[chart.id] = [];
      }
    }
    
    return results;
  }

  private async getTablesData(tables: TableConfig[], dateFilter: string) {
    const results: any = {};
    
    for (const table of tables) {
      try {
        const query = table.query.replace('{dateFilter}', dateFilter);
        const result = await this.databaseService.query(query);
        
        results[table.id] = result.map(row => {
          const processedRow: any = {};
          for (const column of table.columns) {
            let value = row[column.key];
            
            if (column.render) {
              value = column.render(value);
            } else {
              value = this.formatValue(value, column.type);
            }
            
            processedRow[column.key] = value;
          }
          return processedRow;
        });
      } catch (error) {
        console.error(`Error fetching table ${table.id}:`, error);
        results[table.id] = [];
      }
    }
    
    return results;
  }

  private buildDateFilter(startDate?: string, endDate?: string, dateField?: string) {
    if (!startDate && !endDate) return '';
    
    const field = dateField || 'createdAt';
    let filter = '';
    
    if (startDate) {
      filter += ` AND ${field} >= '${startDate}'`;
    }
    if (endDate) {
      filter += ` AND ${field} <= '${endDate} 23:59:59'`;
    }
    
    return filter;
  }

  private calculateChange(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  private formatValue(value: any, type: string): any {
    switch (type) {
      case 'number':
        return Number(value) || 0;
      case 'currency':
        return `$${Number(value || 0).toLocaleString()}`;
      case 'date':
        return value ? new Date(value).toLocaleDateString() : 'N/A';
      case 'status':
        return value || 'N/A';
      default:
        return value || 'N/A';
    }
  }

  // Card-specific data methods for modals
  async getCardData(cardType: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    const config = this.getConfig();
    const dateFilter = this.buildDateFilter(startDate, endDate, config.dateField);
    
    // Find the metric configuration
    const metric = config.metrics.find(m => m.id === cardType);
    if (!metric) {
      throw new Error(`Card type ${cardType} not found`);
    }

    try {
      // Create a proper data query based on the metric type
      let dataQuery: string;
      let countQuery = metric.query.replace('{dateFilter}', dateFilter);
      
      if (cardType === 'total') {
        dataQuery = `SELECT id, name, code FROM dbo.[Controls] WHERE 1=1 ${dateFilter}`;
      } else if (cardType === 'unmapped') {
        dataQuery = `SELECT c.id, c.name, c.code FROM GRCDB2.dbo.Controls c WHERE c.isDeleted = 0 ${dateFilter} AND NOT EXISTS (SELECT 1 FROM GRCDB2.dbo.ControlCosos ccx WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL)`;
      } else if (cardType.startsWith('pending')) {
        const statusField = cardType.replace('pending', '').toLowerCase() + 'Status';
        dataQuery = `SELECT id, name, code FROM dbo.[Controls] WHERE ${statusField} != 'approved' AND 1=1 ${dateFilter}`;
      } else {
        // Fallback to generic query
        dataQuery = `SELECT id, name, code FROM dbo.[Controls] WHERE 1=1 ${dateFilter}`;
      }
      
      // Add pagination
      const offset = (page - 1) * limit;
      const paginatedQuery = `${dataQuery} ORDER BY id OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
      
      const [data, countResult] = await Promise.all([
        this.databaseService.query(paginatedQuery),
        this.databaseService.query(countQuery)
      ]);
      
      const total = countResult[0]?.total || countResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: data.map((row, index) => ({
          control_code: row.code || `CTRL-${row.id}`,
          control_name: row.name || `Control ${row.id}`,
          ...row
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error(`Error fetching card data for ${cardType}:`, error);
      throw error;
    }
  }
}
