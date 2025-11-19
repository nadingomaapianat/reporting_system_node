import { Injectable } from '@nestjs/common';
import { fq } from './db-config';
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
  type: 'text' | 'number' | 'date' | 'status' | 'currency'|'boolean';
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

  protected buildDateFilter(startDate?: string, endDate?: string, dateField?: string) {
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
        return `${Number(value || 0).toLocaleString()}`;
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
        dataQuery = `SELECT id, name, code FROM ${fq('Controls')} WHERE isDeleted = 0 AND deletedAt IS NULL ${dateFilter} ORDER BY createdAt DESC`;
        // Use the same count query as the metric
        countQuery = metric.query.replace('{dateFilter}', dateFilter);
      } else if (cardType === 'unmapped') {
        dataQuery = `SELECT c.id, c.name, c.code FROM ${fq('Controls')} c WHERE c.isDeleted = 0 ${dateFilter} AND NOT EXISTS (SELECT 1 FROM ${fq('ControlCosos')} ccx WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL) ORDER BY c.createdAt DESC`;
        // Use the same count query as the metric
        countQuery = metric.query.replace('{dateFilter}', dateFilter);
      } else if (cardType.startsWith('pending') && !cardType.startsWith('testsPending')) {
        // Handle Controls pending status cards - use standardized staged workflow pattern
        let whereClause = '';
        if (cardType === 'pendingPreparer') {
          whereClause = "(ISNULL(preparerStatus, '') <> 'sent')";
        } else if (cardType === 'pendingChecker') {
          whereClause = "(ISNULL(preparerStatus, '') = 'sent' AND ISNULL(checkerStatus, '') <> 'approved' AND ISNULL(acceptanceStatus, '') <> 'approved')";
        } else if (cardType === 'pendingReviewer') {
          whereClause = "(ISNULL(checkerStatus, '') = 'approved' AND ISNULL(reviewerStatus, '') <> 'sent' AND ISNULL(acceptanceStatus, '') <> 'approved')";
        } else if (cardType === 'pendingAcceptance') {
          whereClause = "(ISNULL(reviewerStatus, '') = 'sent' AND ISNULL(acceptanceStatus, '') <> 'approved')";
        } else {
          // Fallback for other pending types
          const statusField = cardType.replace('pending', '').toLowerCase() + 'Status';
          whereClause = `${statusField} != 'approved'`;
        }
        
        dataQuery = `SELECT id, name, code FROM ${fq('Controls')} WHERE ${whereClause} AND deletedAt IS NULL AND isDeleted = 0 ${dateFilter} ORDER BY createdAt DESC`;
        
        // Use the same count query as the metric - match metric query exactly
        countQuery = metric.query.replace('{dateFilter}', dateFilter);
      } else if (cardType.startsWith('testsPending')) {
        // Map to control tests joins for details - use standardized staged workflow pattern
        let whereClause = '';
        if (cardType === 'testsPendingPreparer') {
          whereClause = "(ISNULL(t.preparerStatus, '') <> 'sent')";
        } else if (cardType === 'testsPendingChecker') {
          whereClause = "(ISNULL(t.preparerStatus, '') = 'sent' AND ISNULL(t.checkerStatus, '') <> 'approved' AND ISNULL(t.acceptanceStatus, '') <> 'approved')";
        } else if (cardType === 'testsPendingReviewer') {
          whereClause = "(ISNULL(t.checkerStatus, '') = 'approved' AND ISNULL(t.reviewerStatus, '') <> 'sent' AND ISNULL(t.acceptanceStatus, '') <> 'approved')";
        } else if (cardType === 'testsPendingAcceptance') {
          whereClause = "(ISNULL(t.reviewerStatus, '') = 'sent' AND ISNULL(t.acceptanceStatus, '') <> 'approved')";
        }
        
        const statusField =
          cardType === 'testsPendingPreparer' ? 'preparerStatus' :
          cardType === 'testsPendingChecker' ? 'checkerStatus' :
          cardType === 'testsPendingReviewer' ? 'reviewerStatus' :
          'acceptanceStatus';

        dataQuery = `SELECT DISTINCT t.id, c.id as control_id, c.name, c.code, c.createdAt, t.${statusField} AS preparerStatus
          FROM ${fq('ControlDesignTests')} AS t
          INNER JOIN ${fq('Controls')} AS c ON c.id = t.control_id
          WHERE ${whereClause} AND c.isDeleted = 0 AND c.deletedAt IS NULL AND t.function_id IS NOT NULL ${dateFilter}
          ORDER BY c.createdAt DESC`;

        // Use the same count query as the metric (count test records, not control records) - match metric query exactly
        countQuery = metric.query.replace('{dateFilter}', dateFilter);
      } else if (cardType === 'unmappedIcofrControls') {
        dataQuery = `SELECT c.id, c.name, c.code, a.name as assertion_name, a.account_type as assertion_type,
          'Not Mapped' as coso_component,
          'Not Mapped' as coso_point
          FROM ${fq('Controls')} c 
          JOIN ${fq('Assertions')} a ON c.icof_id = a.id 
          WHERE c.isDeleted = 0 AND c.icof_id IS NOT NULL 
          AND NOT EXISTS (SELECT 1 FROM ${fq('ControlCosos')} ccx WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL) 
          AND ((a.C = 1 OR a.E = 1 OR a.A = 1 OR a.V = 1 OR a.O = 1 OR a.P = 1) 
               AND a.account_type IN ('Balance Sheet', 'Income Statement')) 
          AND a.isDeleted = 0 ${dateFilter.replace('createdAt', 'c.createdAt')}
          ORDER BY c.createdAt DESC`;
        // Use the same count query as the metric
        countQuery = metric.query.replace('{dateFilter}', dateFilter);
      } else if (cardType === 'unmappedNonIcofrControls') {
        dataQuery = `SELECT c.id, c.name, c.code, a.name as assertion_name, a.account_type as assertion_type,
          'Not Mapped' as coso_component,
          'Not Mapped' as coso_point
          FROM ${fq('Controls')} c 
          LEFT JOIN ${fq('Assertions')} a ON c.icof_id = a.id 
          WHERE c.isDeleted = 0 
          AND NOT EXISTS (SELECT 1 FROM ${fq('ControlCosos')} ccx WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL) 
          AND (c.icof_id IS NULL OR ((a.C IS NULL OR a.C = 0) AND (a.E IS NULL OR a.E = 0) AND (a.A IS NULL OR a.A = 0) 
               AND (a.V IS NULL OR a.V = 0) AND (a.O IS NULL OR a.O = 0) AND (a.P IS NULL OR a.P = 0) 
               OR a.account_type NOT IN ('Balance Sheet', 'Income Statement'))) 
          AND (a.isDeleted = 0 OR a.id IS NULL) ${dateFilter.replace('createdAt', 'c.createdAt')}
          ORDER BY c.createdAt DESC`;
        // Use the same count query as the metric
        countQuery = metric.query.replace('{dateFilter}', dateFilter);
      } else {
        // Fallback to generic query
        dataQuery = `SELECT id, name, code FROM dbo.[Controls] WHERE 1=1 ${dateFilter} ORDER BY createdAt DESC`;
      }
      
      // Add pagination (ensure ORDER BY exists for SQL Server OFFSET)
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      const hasOrderBy = /\border\s+by\b/i.test(dataQuery);
      const orderClause = hasOrderBy ? '' : ' ORDER BY createdAt DESC';
      const paginatedQuery = `${dataQuery}${orderClause} OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY`;
      
      const [data, countResult] = await Promise.all([
        this.databaseService.query(paginatedQuery),
        this.databaseService.query(countQuery)
      ]);
      
      const total = countResult[0]?.total || countResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limitInt);
      
      return {
        data: data.map((row, index) => ({
          control_code: row.code || `CTRL-${row.control_id}`,
          control_name: row.name || `Control ${row.control_id}`,
          ...row
        })),
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages,
          hasNext: pageInt < totalPages,
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error(`Error fetching card data for ${cardType}:`, error);
      throw error;
    }
  }
}
