import { Injectable } from '@nestjs/common';
import { fq } from './db-config';
import { DatabaseService } from '../database/database.service';
import { UserFunctionAccessService, UserFunctionAccess } from './user-function-access.service';

const DASHBOARD_DEFAULT_LIMIT =
  (Number(process.env.DASHBOARD_DEFAULT_LIMIT) && Number(process.env.DASHBOARD_DEFAULT_LIMIT) > 0
    ? Number(process.env.DASHBOARD_DEFAULT_LIMIT)
    : 10);

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
  constructor(
    protected readonly databaseService: DatabaseService,
    protected readonly userFunctionAccess?: UserFunctionAccessService,
  ) {}

  abstract getConfig(): DashboardConfig;

  async getDashboardData(user: any, startDate?: string, endDate?: string, functionId?: string) {
    console.log('[BaseDashboardService.getDashboardData] Received parameters:', { startDate, endDate, functionId, userId: user?.id, groupName: user?.groupName });
    
    const config = this.getConfig();
    const dateFilter = this.buildDateFilter(startDate, endDate, config.dateField);
    console.log('[BaseDashboardService.getDashboardData] Date filter:', dateFilter);
    
    // Get function filter if user is provided and service is available
    let functionFilter = '';
    if (user && this.userFunctionAccess) {
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
        user.id,
        user.groupName,
      );
      console.log('[BaseDashboardService.getDashboardData] User access:', { isSuperAdmin: access.isSuperAdmin, functionIds: access.functionIds, selectedFunctionId: functionId });
      
      // Apply appropriate function filter based on dashboard type
      if (config.tableName) {
        const tableNameLower = config.tableName.toLowerCase();
        if (tableNameLower.includes('controls')) {
          functionFilter = this.userFunctionAccess.buildControlFunctionFilter('c', access, functionId);
        } else if (tableNameLower.includes('risks')) {
          functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, functionId);
        } else if (tableNameLower.includes('incidents')) {
          functionFilter = this.userFunctionAccess.buildDirectFunctionFilter('i', 'function_id', access, functionId);
        } else if (tableNameLower.includes('kris')) {
          functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        }
      }
      console.log('[BaseDashboardService.getDashboardData] Function filter:', functionFilter);
    }

    try {
      // Execute all queries in parallel
      const [
        metricsResults,
        chartsResults,
        tablesResults
      ] = await Promise.all([
        this.getMetricsData(config.metrics, dateFilter, functionFilter),
        this.getChartsData(config.charts, dateFilter, functionFilter),
        this.getTablesData(config.tables, dateFilter, functionFilter)
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

  private async getMetricsData(metrics: MetricConfig[], dateFilter: string, functionFilter: string) {
    const results: any = {};
    
    for (const metric of metrics) {
      try {
        let query = metric.query.replace('{dateFilter}', dateFilter || '');
        console.log(`[getMetricsData] Processing metric ${metric.id}, functionFilter:`, functionFilter);
        console.log(`[getMetricsData] Original query:`, query);
        
        // Replace functionFilter placeholder if it exists (even if empty, to remove the placeholder)
        if (query.includes('{functionFilter}')) {
          const replacedFilter = functionFilter || '';
          query = query.replace('{functionFilter}', replacedFilter);
          // Clean up any double spaces that might result from empty replacements
          query = query.replace(/\s{2,}/g, ' ').trim();
          console.log(`[getMetricsData] Metric ${metric.id} - Replaced {functionFilter} placeholder with:`, replacedFilter || '(empty)', 'Filter length:', replacedFilter.length);
        } else if (functionFilter && functionFilter.trim() !== '' && query.includes('FROM') && (query.includes('Controls') || query.includes('[Controls]'))) {
          // Auto-inject function filter for Control queries
          // Check if query uses alias 'c' for Controls (in FROM or JOIN)
          const hasAliasC = /\bFROM\s+.*Controls.*\s+(?:AS\s+)?c\b/i.test(query) || 
                          /\bFROM\s+.*\s+(?:AS\s+)?c\s+.*Controls/i.test(query) ||
                          /\b(?:INNER|LEFT|RIGHT|FULL)?\s+JOIN\s+.*Controls.*\s+(?:AS\s+)?c\b/i.test(query) ||
                          /\b(?:INNER|LEFT|RIGHT|FULL)?\s+JOIN\s+.*\s+(?:AS\s+)?c\s+.*Controls/i.test(query);
          let filterToInject = functionFilter;
          
          // If query doesn't use 'c' alias, we need to adapt the filter
          if (!hasAliasC) {
            // Check if query has any alias for Controls table in FROM clause
            let aliasMatch = query.match(/FROM\s+(?:dbo\.)?\[?Controls\]?\s+(?:AS\s+)?(\w+)/i);
            if (!aliasMatch) {
              // Check if Controls is in a JOIN clause
              aliasMatch = query.match(/\b(?:INNER|LEFT|RIGHT|FULL)?\s+JOIN\s+(?:dbo\.)?\[?Controls\]?\s+(?:AS\s+)?(\w+)/i);
            }
            if (aliasMatch && aliasMatch[1]) {
              // Use the existing alias
              filterToInject = functionFilter.replace(/c\./g, `${aliasMatch[1]}.`);
            } else {
              // Try to find Controls with alias 'c' in JOIN
              if (query.includes('JOIN') && query.includes('Controls') && (query.includes(' AS c') || query.includes(' c '))) {
                // Already has 'c' alias in JOIN, use it
                filterToInject = functionFilter;
              } else {
                // No alias found, try to add alias 'c' to Controls
                query = query.replace(/(FROM\s+(?:dbo\.)?\[?Controls\]?)(\s|$)/i, '$1 c$2');
                if (!query.includes(' c ') && !query.includes(' AS c')) {
                  // If still no 'c' alias, try to add it to JOIN
                  query = query.replace(/(\b(?:INNER|LEFT|RIGHT|FULL)?\s+JOIN\s+(?:dbo\.)?\[?Controls\]?)(\s|$)/i, '$1 c$2');
                }
              }
            }
          }
          
          // Find WHERE clause and inject filter
          const whereIndex = query.toUpperCase().indexOf(' WHERE ');
          if (whereIndex > -1) {
            const beforeWhere = query.substring(0, whereIndex + 7); // includes "WHERE "
            const afterWhere = query.substring(whereIndex + 7);      // existing predicates
            // Keep the leading AND in filterToInject and wrap existing predicates
            // Result: WHERE (existing predicates) AND EXISTS(...)
            query = `${beforeWhere}(${afterWhere}) ${filterToInject}`;
          } else {
            // No WHERE clause, add one
            const fromIndex = query.toUpperCase().lastIndexOf(' FROM ');
            if (fromIndex > -1) {
              const beforeFrom = query.substring(0, fromIndex);
              const fromClause = query.substring(fromIndex);
              // Find end of FROM clause (before GROUP BY, ORDER BY, etc.)
              const groupByIndex = fromClause.toUpperCase().indexOf(' GROUP BY ');
              const orderByIndex = fromClause.toUpperCase().indexOf(' ORDER BY ');
              const endIndex = groupByIndex > -1 ? groupByIndex : (orderByIndex > -1 ? orderByIndex : fromClause.length);
              const fromPart = fromClause.substring(0, endIndex);
              const restPart = fromClause.substring(endIndex);
              query = beforeFrom + fromPart + ' WHERE 1=1 ' + filterToInject + restPart;
            }
          }
        }
        console.log(`[getMetricsData] Final query for ${metric.id}:`, query);
        const result = await this.databaseService.query(query);
        results[metric.id] = result[0]?.total || result[0]?.count || 0;
        console.log(`[getMetricsData] Result for ${metric.id}:`, results[metric.id]);
        
        // Get change data if changeQuery is provided
        if (metric.changeQuery) {
          let changeQuery = metric.changeQuery.replace('{dateFilter}', dateFilter || '');
          // Replace functionFilter placeholder if it exists (even if empty, to remove the placeholder)
          if (changeQuery.includes('{functionFilter}')) {
            changeQuery = changeQuery.replace('{functionFilter}', functionFilter || '');
            // Clean up any double spaces that might result from empty replacements
            changeQuery = changeQuery.replace(/\s{2,}/g, ' ').trim();
          } else if (functionFilter && functionFilter.trim() !== '' && changeQuery.includes('FROM') && (changeQuery.includes('Controls') || changeQuery.includes('[Controls]'))) {
            // Check if query uses alias 'c' for Controls (in FROM or JOIN)
            const hasAliasC = /\bFROM\s+.*Controls.*\s+(?:AS\s+)?c\b/i.test(changeQuery) || 
                            /\bFROM\s+.*\s+(?:AS\s+)?c\s+.*Controls/i.test(changeQuery) ||
                            /\b(?:INNER|LEFT|RIGHT|FULL)?\s+JOIN\s+.*Controls.*\s+(?:AS\s+)?c\b/i.test(changeQuery) ||
                            /\b(?:INNER|LEFT|RIGHT|FULL)?\s+JOIN\s+.*\s+(?:AS\s+)?c\s+.*Controls/i.test(changeQuery);
            let filterToInject = functionFilter;
            
            if (!hasAliasC) {
              // Check if query has any alias for Controls table in FROM clause
              let aliasMatch = changeQuery.match(/FROM\s+(?:dbo\.)?\[?Controls\]?\s+(?:AS\s+)?(\w+)/i);
              if (!aliasMatch) {
                // Check if Controls is in a JOIN clause
                aliasMatch = changeQuery.match(/\b(?:INNER|LEFT|RIGHT|FULL)?\s+JOIN\s+(?:dbo\.)?\[?Controls\]?\s+(?:AS\s+)?(\w+)/i);
              }
              if (aliasMatch && aliasMatch[1]) {
                filterToInject = functionFilter.replace(/c\./g, `${aliasMatch[1]}.`);
              } else {
                // Try to find Controls with alias 'c' in JOIN
                if (changeQuery.includes('JOIN') && changeQuery.includes('Controls') && (changeQuery.includes(' AS c') || changeQuery.includes(' c '))) {
                  // Already has 'c' alias in JOIN, use it
                  filterToInject = functionFilter;
                } else {
                  // No alias found, try to add alias 'c' to Controls
                  changeQuery = changeQuery.replace(/(FROM\s+(?:dbo\.)?\[?Controls\]?)(\s|$)/i, '$1 c$2');
                  if (!changeQuery.includes(' c ') && !changeQuery.includes(' AS c')) {
                    // If still no 'c' alias, try to add it to JOIN
                    changeQuery = changeQuery.replace(/(\b(?:INNER|LEFT|RIGHT|FULL)?\s+JOIN\s+(?:dbo\.)?\[?Controls\]?)(\s|$)/i, '$1 c$2');
                  }
                }
              }
            }
            
            const whereIndex = changeQuery.toUpperCase().indexOf(' WHERE ');
            if (whereIndex > -1) {
              const beforeWhere = changeQuery.substring(0, whereIndex + 7);
              const afterWhere = changeQuery.substring(whereIndex + 7);
              // Wrap existing predicates and append filter (with leading AND)
              changeQuery = `${beforeWhere}(${afterWhere}) ${filterToInject}`;
            } else {
              const fromIndex = changeQuery.toUpperCase().lastIndexOf(' FROM ');
              if (fromIndex > -1) {
                const beforeFrom = changeQuery.substring(0, fromIndex);
                const fromClause = changeQuery.substring(fromIndex);
                const groupByIndex = fromClause.toUpperCase().indexOf(' GROUP BY ');
                const orderByIndex = fromClause.toUpperCase().indexOf(' ORDER BY ');
                const endIndex = groupByIndex > -1 ? groupByIndex : (orderByIndex > -1 ? orderByIndex : fromClause.length);
                const fromPart = fromClause.substring(0, endIndex);
                const restPart = fromClause.substring(endIndex);
                changeQuery = beforeFrom + fromPart + ' WHERE 1=1 ' + filterToInject + restPart;
              }
            }
          }
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

  private async getChartsData(charts: ChartConfig[], dateFilter: string, functionFilter: string) {
    const results: any = {};
    
    for (const chart of charts) {
      try {
        let query = chart.query.replace('{dateFilter}', dateFilter || '');
        // Replace functionFilter placeholder if it exists (even if empty, to remove the placeholder)
        if (query.includes('{functionFilter}')) {
          query = query.replace('{functionFilter}', functionFilter || '');
          // Clean up any double spaces that might result from empty replacements
          query = query.replace(/\s{2,}/g, ' ').trim();
        }
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

  private async getTablesData(tables: TableConfig[], dateFilter: string, functionFilter: string) {
    const results: any = {};
    
    for (const table of tables) {
      try {
        let query = table.query.replace('{dateFilter}', dateFilter || '');
        // Replace functionFilter placeholder if it exists (even if empty, to remove the placeholder)
        if (query.includes('{functionFilter}')) {
          query = query.replace('{functionFilter}', functionFilter || '');
          // Clean up any double spaces that might result from empty replacements
          query = query.replace(/\s{2,}/g, ' ').trim();
        }
        const result = await this.databaseService.query(query);
        const tableLimit = this.getDefaultLimit();
        const limitedResult = result.slice(0, tableLimit);
        
        results[table.id] = limitedResult.map(row => {
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
  async getCardData(user: any, cardType: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    const config = this.getConfig();
    const dateFilter = this.buildDateFilter(startDate, endDate, config.dateField);
    
    // Get function filter if user is provided and service is available
    let functionFilter = '';
    if (user && this.userFunctionAccess) {
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
        user.id,
        user.groupName,
      );
      // Only apply Control function filter if this is Controls dashboard
      if (config.tableName && config.tableName.includes('Controls')) {
        functionFilter = this.userFunctionAccess.buildControlFunctionFilter('c', access, functionId);
      }
    }
    
    // Find the metric configuration
    const metric = config.metrics.find(m => m.id === cardType);
    if (!metric) {
      throw new Error(`Card type ${cardType} not found`);
    }

    try {
      // Create a proper data query based on the metric type
      let dataQuery: string;
      let countQuery = metric.query.replace('{dateFilter}', dateFilter);
      if (functionFilter && countQuery.includes('{functionFilter}')) {
        countQuery = countQuery.replace('{functionFilter}', functionFilter);
      } else if (functionFilter && countQuery.includes('FROM') && countQuery.includes('Controls')) {
        const whereIndex = countQuery.toUpperCase().indexOf(' WHERE ');
        if (whereIndex > -1) {
          const beforeWhere = countQuery.substring(0, whereIndex + 7);
          const afterWhere = countQuery.substring(whereIndex + 7);
          countQuery = beforeWhere + functionFilter + ' ' + afterWhere;
        }
      }
      
      if (cardType === 'total') {
        dataQuery = `SELECT c.id, c.name, c.code FROM ${fq('Controls')} c WHERE c.isDeleted = 0 AND c.deletedAt IS NULL ${dateFilter} ${functionFilter} ORDER BY c.createdAt DESC`;
      } else if (cardType === 'unmapped') {
        dataQuery = `SELECT c.id, c.name, c.code FROM ${fq('Controls')} c WHERE c.isDeleted = 0 ${dateFilter} ${functionFilter} AND NOT EXISTS (SELECT 1 FROM ${fq('ControlCosos')} ccx WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL) ORDER BY c.createdAt DESC`;
      } else if (cardType.startsWith('pending') && !cardType.startsWith('testsPending')) {
        // Handle Controls pending status cards - use standardized staged workflow pattern
        let whereClause = '';
        if (cardType === 'pendingPreparer') {
          whereClause = "(ISNULL(c.preparerStatus, '') <> 'sent')";
        } else if (cardType === 'pendingChecker') {
          whereClause = "(ISNULL(c.preparerStatus, '') = 'sent' AND ISNULL(c.checkerStatus, '') <> 'approved' AND ISNULL(c.acceptanceStatus, '') <> 'approved')";
        } else if (cardType === 'pendingReviewer') {
          whereClause = "(ISNULL(c.checkerStatus, '') = 'approved' AND ISNULL(c.reviewerStatus, '') <> 'sent' AND ISNULL(c.acceptanceStatus, '') <> 'approved')";
        } else if (cardType === 'pendingAcceptance') {
          whereClause = "(ISNULL(c.reviewerStatus, '') = 'sent' AND ISNULL(c.acceptanceStatus, '') <> 'approved')";
        } else {
          // Fallback for other pending types
          const statusField = cardType.replace('pending', '').toLowerCase() + 'Status';
          whereClause = `c.${statusField} != 'approved'`;
        }
        
        dataQuery = `SELECT c.id, c.name, c.code FROM ${fq('Controls')} c WHERE ${whereClause} AND c.deletedAt IS NULL AND c.isDeleted = 0 ${dateFilter} ${functionFilter} ORDER BY c.createdAt DESC`;
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
          WHERE ${whereClause} AND c.isDeleted = 0 AND c.deletedAt IS NULL AND t.function_id IS NOT NULL ${dateFilter} ${functionFilter}
          ORDER BY c.createdAt DESC`;
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
          AND a.isDeleted = 0 ${dateFilter.replace('createdAt', 'c.createdAt')} ${functionFilter}
          ORDER BY c.createdAt DESC`;
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
          AND (a.isDeleted = 0 OR a.id IS NULL) ${dateFilter.replace('createdAt', 'c.createdAt')} ${functionFilter}
          ORDER BY c.createdAt DESC`;
      } else {
        // Fallback to generic query
        dataQuery = `SELECT c.id, c.name, c.code FROM ${fq('Controls')} c WHERE c.isDeleted = 0 ${dateFilter} ${functionFilter} ORDER BY c.createdAt DESC`;
      }
      
      // Apply function filter to count query if needed
      if (functionFilter && countQuery.includes('FROM') && (countQuery.includes('Controls') || countQuery.includes('[Controls]'))) {
        const hasAliasC = /\bFROM\s+.*Controls.*\s+c\b/i.test(countQuery) || /\bFROM\s+.*\s+c\s+.*Controls/i.test(countQuery);
        let filterToInject = functionFilter;
        
        if (!hasAliasC) {
          const aliasMatch = countQuery.match(/FROM\s+(?:dbo\.)?\[?Controls\]?\s+(\w+)/i);
          if (aliasMatch && aliasMatch[1]) {
            filterToInject = functionFilter.replace(/c\./g, `${aliasMatch[1]}.`);
          } else {
            countQuery = countQuery.replace(/(FROM\s+(?:dbo\.)?\[?Controls\]?)(\s|$)/i, '$1 c$2');
          }
        }
        
        const whereIndex = countQuery.toUpperCase().indexOf(' WHERE ');
        if (whereIndex > -1) {
          const beforeWhere = countQuery.substring(0, whereIndex + 7);
          const afterWhere = countQuery.substring(whereIndex + 7);
          countQuery = beforeWhere + filterToInject + ' ' + afterWhere;
        } else {
          const fromIndex = countQuery.toUpperCase().lastIndexOf(' FROM ');
          if (fromIndex > -1) {
            const beforeFrom = countQuery.substring(0, fromIndex);
            const fromClause = countQuery.substring(fromIndex);
            const groupByIndex = fromClause.toUpperCase().indexOf(' GROUP BY ');
            const orderByIndex = fromClause.toUpperCase().indexOf(' ORDER BY ');
            const endIndex = groupByIndex > -1 ? groupByIndex : (orderByIndex > -1 ? orderByIndex : fromClause.length);
            const fromPart = fromClause.substring(0, endIndex);
            const restPart = fromClause.substring(endIndex);
            countQuery = beforeFrom + fromPart + ' WHERE 1=1 ' + filterToInject + restPart;
          }
        }
      }
      
      // Add pagination (ensure ORDER BY exists for SQL Server OFFSET)
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = this.clampLimit(limit);
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

  protected getDefaultLimit(): number {
    return DASHBOARD_DEFAULT_LIMIT;
  }

  protected clampLimit(limit?: number): number {
    const fallback = this.getDefaultLimit();
    const parsed = Math.floor(Number(limit));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.min(parsed, fallback);
  }
}
