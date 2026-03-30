import { Injectable } from '@nestjs/common';
import { fq } from './db-config';
import { applyOrderByFunctionDeep } from './order-by-function';
import { DatabaseService } from '../database/database.service';
import { UserFunctionAccessService, UserFunctionAccess } from './user-function-access.service';

const DASHBOARD_DEFAULT_LIMIT =
  (Number(process.env.DASHBOARD_DEFAULT_LIMIT) && Number(process.env.DASHBOARD_DEFAULT_LIMIT) > 0
    ? Number(process.env.DASHBOARD_DEFAULT_LIMIT)
    : 10);

/** Named date filter tokens for SQL templates ({dateFilter}, {dateFilterC}, …). */
export type DashboardDateFilters = {
  dateFilter: string;
  dateFilterC: string;
  dateFilterA: string;
  dateFilterAp: string;
  dateFilterCdt: string;
  dateFilterT: string;
};

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

  async getDashboardData(
    user: any,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc?: boolean,
  ) {
    // By default: no date filter (all data). Date filter is applied only when both startDate and endDate are provided.
    const config = this.getConfig();
    const dateFilters: DashboardDateFilters = {
      dateFilter: this.buildDateFilter(startDate, endDate, config.dateField),
      dateFilterC: this.buildDateFilter(startDate, endDate, 'c.createdAt'),
      dateFilterA: this.buildDateFilter(startDate, endDate, 'a.createdAt'),
      dateFilterAp: this.buildDateFilter(startDate, endDate, 'ap.createdAt'),
      dateFilterCdt: this.buildDateFilter(startDate, endDate, 'cdt.createdAt'),
      dateFilterT: this.buildDateFilter(startDate, endDate, 't.createdAt'),
    };
    
    // Get function filter if user is provided and service is available
    let functionFilter = '';
    /** For ControlDesignTests rows: filter by test's function_id (alias t), not ControlFunctions on control */
    let functionFilterControlDesignTest = '';
    /** Same for queries that alias tests as cdt */
    let functionFilterCdt = '';
    /** Restrict outer ControlFunctions join (cf) for GROUP BY department charts */
    let functionJoinFilter = '';
    if (user && this.userFunctionAccess) {
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      // console.log('[BaseDashboardService.getDashboardData] User access:', { isSuperAdmin: access.isSuperAdmin, functionIds: access.functionIds, selectedFunctionIds });
      
      // Apply appropriate function filter based on dashboard type
      if (config.tableName) {
        const tableNameLower = config.tableName.toLowerCase();
        if (tableNameLower.includes('controls')) {
          functionFilter = this.userFunctionAccess.buildControlFunctionFilter('c', access, selectedFunctionIds);
          functionFilterControlDesignTest = this.userFunctionAccess.buildDirectFunctionFilter('t', 'function_id', access, selectedFunctionIds);
          functionFilterCdt = this.userFunctionAccess.buildDirectFunctionFilter('cdt', 'function_id', access, selectedFunctionIds);
          functionJoinFilter = this.userFunctionAccess.buildControlFunctionJoinFilter('cf', access, selectedFunctionIds);
        } else if (tableNameLower.includes('risks')) {
          functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);
        } else if (tableNameLower.includes('incidents')) {
          functionFilter = this.userFunctionAccess.buildDirectFunctionFilter('i', 'function_id', access, selectedFunctionIds);
        } else if (tableNameLower.includes('kris')) {
          functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);
        }
      }
      // console.log('[BaseDashboardService.getDashboardData] Function filter:', functionFilter);
    }

    try {
      // Execute all queries in parallel
      const [
        metricsResults,
        chartsResults,
        tablesResults
      ] = await Promise.all([
        this.getMetricsData(
          config.metrics,
          dateFilters,
          functionFilter,
          functionFilterControlDesignTest,
          functionFilterCdt,
          functionJoinFilter,
          config.tableName?.toLowerCase().includes('controls') ?? false,
        ),
        this.getChartsData(
          config.charts,
          dateFilters,
          functionFilter,
          functionFilterControlDesignTest,
          functionFilterCdt,
          functionJoinFilter,
          config.tableName?.toLowerCase().includes('controls') ?? false,
        ),
        this.getTablesData(
          config.tables,
          dateFilters,
          functionFilter,
          functionFilterControlDesignTest,
          functionFilterCdt,
          functionJoinFilter,
          config.tableName?.toLowerCase().includes('controls') ?? false,
        ),
      ]);

      const payload = {
        ...metricsResults,
        ...chartsResults,
        ...tablesResults
      };
      return orderByFunctionAsc ? applyOrderByFunctionDeep(payload) : payload;
    } catch (error) {
      console.error(`Error fetching ${config.name} dashboard data:`, error);
      throw error;
    }
  }

  protected applyDateFilterPlaceholders(query: string, df: DashboardDateFilters): string {
    return query
      .replace(/\{dateFilterCdt\}/g, df.dateFilterCdt || '')
      .replace(/\{dateFilterAp\}/g, df.dateFilterAp || '')
      .replace(/\{dateFilterC\}/g, df.dateFilterC || '')
      .replace(/\{dateFilterA\}/g, df.dateFilterA || '')
      .replace(/\{dateFilterT\}/g, df.dateFilterT || '')
      .replace(/\{dateFilter\}/g, df.dateFilter || '');
  }

  /**
   * Replace function filter placeholders. Order matters: longer tokens first.
   * Use {functionFilterControlDesignTest} for ControlDesignTests alias t.function_id;
   * {functionFilterCdt} for alias cdt; {functionFilter} for control-scoped EXISTS (ControlFunctions).
   * {functionJoinFilter} restricts outer ControlFunctions alias cf (department-by-function charts).
   */
  protected applyFunctionFilterPlaceholders(
    query: string,
    functionFilter: string,
    functionFilterControlDesignTest: string,
    functionFilterCdt: string,
    functionJoinFilter: string,
  ): string {
    return query
      .replace(/\{functionFilterControlDesignTest\}/g, functionFilterControlDesignTest || '')
      .replace(/\{functionFilterCdt\}/g, functionFilterCdt || '')
      .replace(/\{functionJoinFilter\}/g, functionJoinFilter || '')
      .replace(/\{functionFilter\}/g, functionFilter || '');
  }

  private async getMetricsData(
    metrics: MetricConfig[],
    dateFilters: DashboardDateFilters,
    functionFilter: string,
    functionFilterControlDesignTest: string,
    functionFilterCdt: string,
    functionJoinFilter: string,
    applyControlsFunctionFallback: boolean,
  ) {
    const results: any = {};

    const runOneMetric = async (metric: MetricConfig): Promise<{ id: string; total: number; change?: string }> => {
      try {
        let query = this.applyDateFilterPlaceholders(metric.query, dateFilters);
        const hasExplicitFunctionTokens =
          /\{functionJoinFilter\}|\{functionFilter(ControlDesignTest|Cdt)?\}/.test(metric.query);
        if (hasExplicitFunctionTokens) {
          query = this.applyFunctionFilterPlaceholders(
            query,
            functionFilter,
            functionFilterControlDesignTest,
            functionFilterCdt,
            functionJoinFilter,
          ).replace(/\s{2,}/g, ' ').trim();
        } else if (applyControlsFunctionFallback) {
          query = this.injectControlsFunctionFilterIntoQuery(query, functionFilter);
        }
        const result = await this.databaseService.query(query);
        const total = result[0]?.total ?? result[0]?.count ?? 0;

        if (!metric.changeQuery) return { id: metric.id, total };

        let changeQuery = this.applyDateFilterPlaceholders(metric.changeQuery, dateFilters);
        const hasExplicitChange =
          /\{functionJoinFilter\}|\{functionFilter(ControlDesignTest|Cdt)?\}/.test(metric.changeQuery);
        if (hasExplicitChange) {
          changeQuery = this.applyFunctionFilterPlaceholders(
            changeQuery,
            functionFilter,
            functionFilterControlDesignTest,
            functionFilterCdt,
            functionJoinFilter,
          ).replace(/\s{2,}/g, ' ').trim();
        } else if (applyControlsFunctionFallback) {
          changeQuery = this.injectControlsFunctionFilterIntoQuery(changeQuery, functionFilter);
        }
        const changeResult = await this.databaseService.query(changeQuery);
        const previous = changeResult[0]?.total ?? changeResult[0]?.count ?? 0;
        const change = this.calculateChange(total, previous);
        return { id: metric.id, total, change };
      } catch (error) {
        console.error(`Error fetching metric ${metric.id}:`, error);
        return { id: metric.id, total: 0, change: '+0%' };
      }
    };

    const settled = await Promise.all(metrics.map((m) => runOneMetric(m)));
    for (const { id, total, change } of settled) {
      results[id] = total;
      if (change !== undefined) results[`${id}Change`] = change;
    }
    return results;
  }

  private async getChartsData(
    charts: ChartConfig[],
    dateFilters: DashboardDateFilters,
    functionFilter: string,
    functionFilterControlDesignTest: string,
    functionFilterCdt: string,
    functionJoinFilter: string,
    applyControlsFunctionFallback: boolean,
  ) {
    const results: any = {};

    const runOneChart = async (chart: ChartConfig): Promise<{ id: string; data: any[] }> => {
      try {
        let query = this.applyDateFilterPlaceholders(chart.query, dateFilters);
        const hasExplicitFunctionTokens =
          /\{functionJoinFilter\}|\{functionFilter(ControlDesignTest|Cdt)?\}/.test(chart.query);
        if (hasExplicitFunctionTokens) {
          query = this.applyFunctionFilterPlaceholders(
            query,
            functionFilter,
            functionFilterControlDesignTest,
            functionFilterCdt,
            functionJoinFilter,
          ).replace(/\s{2,}/g, ' ').trim();
        } else if (applyControlsFunctionFallback) {
          query = this.injectControlsFunctionFilterIntoQuery(query, functionFilter);
        }
        const result = await this.databaseService.query(query);
        const data = result.map((row: any) => ({
          name: row[chart.xField],
          value: row[chart.yField],
          label: chart.labelField ? row[chart.labelField] : row[chart.xField]
        }));
        return { id: chart.id, data };
      } catch (error) {
        console.error(`Error fetching chart ${chart.id}:`, error);
        return { id: chart.id, data: [] };
      }
    };

    const settled = await Promise.all(charts.map((c) => runOneChart(c)));
    for (const { id, data } of settled) results[id] = data;
    return results;
  }

  private async getTablesData(
    tables: TableConfig[],
    dateFilters: DashboardDateFilters,
    functionFilter: string,
    functionFilterControlDesignTest: string,
    functionFilterCdt: string,
    functionJoinFilter: string,
    applyControlsFunctionFallback: boolean,
  ) {
    const results: any = {};
    const tableLimit = this.getDefaultLimit();

    const runOneTable = async (table: TableConfig): Promise<{ id: string; data: any[] }> => {
      try {
        let query = this.applyDateFilterPlaceholders(table.query, dateFilters);
        const hasExplicitFunctionTokens =
          /\{functionJoinFilter\}|\{functionFilter(ControlDesignTest|Cdt)?\}/.test(table.query);
        if (hasExplicitFunctionTokens) {
          query = this.applyFunctionFilterPlaceholders(
            query,
            functionFilter,
            functionFilterControlDesignTest,
            functionFilterCdt,
            functionJoinFilter,
          ).replace(/\s{2,}/g, ' ').trim();
        } else if (applyControlsFunctionFallback) {
          query = this.injectControlsFunctionFilterIntoQuery(query, functionFilter);
        }
        if (table.pagination) {
          query = this.applyDashboardPreviewLimit(query, tableLimit);
        }
        const result = await this.databaseService.query(query);
        const limitedResult = result.slice(0, tableLimit);
        const data = limitedResult.map((row: any) => {
          const processedRow: any = {};
          for (const column of table.columns) {
            let value = row[column.key];
            if (column.render) value = column.render(value);
            else value = this.formatValue(value, column.type);
            processedRow[column.key] = value;
          }
          return processedRow;
        });
        return { id: table.id, data };
      } catch (error) {
        console.error(`Error fetching table ${table.id}:`, error);
        return { id: table.id, data: [] };
      }
    };

    // Table queries are usually the heaviest part of a dashboard. Run them one-by-one
    // to avoid overwhelming SQL Server with a burst of parallel reads.
    for (const table of tables) {
      const { id, data } = await runOneTable(table);
      results[id] = data;
    }
    return results;
  }

  /** Only treat as date if it looks like YYYY-MM-DD (avoids "Conversion failed when converting date" from invalid strings). */
  private isValidDateString(s?: string): boolean {
    if (s == null || typeof s !== 'string') return false;
    const t = s.trim();
    return t.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(t);
  }

  protected buildDateFilter(startDate?: string, endDate?: string, dateField?: string) {
    const start = this.isValidDateString(startDate) ? startDate!.trim().slice(0, 10) : undefined;
    const end = this.isValidDateString(endDate) ? endDate!.trim().slice(0, 10) : undefined;
    if (!start && !end) return '';

    const field = dateField || 'createdAt';
    let filter = '';
    if (start) filter += ` AND ${field} >= '${start}'`;
    if (end) filter += ` AND ${field} <= '${end} 23:59:59'`;
    return filter;
  }

  /**
   * When a SQL template omits {functionFilter}, inject control function scope for queries that touch Controls (alias c).
   * Same rules as metric queries so cards, charts, and tables stay consistent.
   */
  private injectControlsFunctionFilterIntoQuery(query: string, functionFilter: string): string {
    if (
      !functionFilter ||
      functionFilter.trim() === '' ||
      !query.includes('FROM') ||
      (!query.includes('Controls') && !query.includes('[Controls]'))
    ) {
      return query;
    }
    const hasAliasC =
      /\bFROM\s+.*Controls.*\s+(?:AS\s+)?c\b/i.test(query) ||
      /\bFROM\s+.*\s+(?:AS\s+)?c\s+.*Controls/i.test(query) ||
      /\b(?:INNER|LEFT|RIGHT|FULL)?\s+JOIN\s+.*Controls.*\s+(?:AS\s+)?c\b/i.test(query) ||
      /\b(?:INNER|LEFT|RIGHT|FULL)?\s+JOIN\s+.*\s+(?:AS\s+)?c\s+.*Controls/i.test(query);
    let filterToInject = functionFilter;
    if (!hasAliasC) {
      let aliasMatch = query.match(/FROM\s+(?:dbo\.)?\[?Controls\]?\s+(?:AS\s+)?(\w+)/i);
      if (!aliasMatch) aliasMatch = query.match(/\b(?:INNER|LEFT|RIGHT|FULL)?\s+JOIN\s+(?:dbo\.)?\[?Controls\]?\s+(?:AS\s+)?(\w+)/i);
      if (aliasMatch?.[1]) filterToInject = functionFilter.replace(/c\./g, `${aliasMatch[1]}.`);
      else {
        query = query.replace(/(FROM\s+(?:dbo\.)?\[?Controls\]?)(\s|$)/i, '$1 c$2');
        if (!query.includes(' c ') && !query.includes(' AS c'))
          query = query.replace(/(\b(?:INNER|LEFT|RIGHT|FULL)?\s+JOIN\s+(?:dbo\.)?\[?Controls\]?)(\s|$)/i, '$1 c$2');
      }
    }
    const whereIndex = query.toUpperCase().indexOf(' WHERE ');
    if (whereIndex > -1) {
      const beforeWhere = query.substring(0, whereIndex + 7);
      const afterWhere = query.substring(whereIndex + 7);
      return `${beforeWhere}(${afterWhere}) ${filterToInject}`;
    }
    const fromIndex = query.toUpperCase().lastIndexOf(' FROM ');
    if (fromIndex > -1) {
      const beforeFrom = query.substring(0, fromIndex);
      const fromClause = query.substring(fromIndex);
      const groupByIndex = fromClause.toUpperCase().indexOf(' GROUP BY ');
      const orderByIndex = fromClause.toUpperCase().indexOf(' ORDER BY ');
      const endIndex = groupByIndex > -1 ? groupByIndex : orderByIndex > -1 ? orderByIndex : fromClause.length;
      const fromPart = fromClause.substring(0, endIndex);
      const restPart = fromClause.substring(endIndex);
      return beforeFrom + fromPart + ' WHERE 1=1 ' + filterToInject + restPart;
    }
    return query;
  }

  private applyDashboardPreviewLimit(query: string, limit: number): string {
    const normalized = query.trim().replace(/;+\s*$/, '');
    if (!normalized || /\bFETCH\s+NEXT\b/i.test(normalized) || /\bTOP\s*\(/i.test(normalized) || /\bTOP\s+\d+\b/i.test(normalized)) {
      return normalized;
    }

    if (/\bORDER\s+BY\b/i.test(normalized)) {
      return `${normalized} OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY`;
    }

    return `${normalized} ORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY`;
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
  async getCardData(user: any, cardType: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    const config = this.getConfig();
    const dateFilters: DashboardDateFilters = {
      dateFilter: this.buildDateFilter(startDate, endDate, config.dateField),
      dateFilterC: this.buildDateFilter(startDate, endDate, 'c.createdAt'),
      dateFilterA: this.buildDateFilter(startDate, endDate, 'a.createdAt'),
      dateFilterAp: this.buildDateFilter(startDate, endDate, 'ap.createdAt'),
      dateFilterCdt: this.buildDateFilter(startDate, endDate, 'cdt.createdAt'),
      dateFilterT: this.buildDateFilter(startDate, endDate, 't.createdAt'),
    };
    
    // Get function filter if user is provided and service is available
    let functionFilter = '';
    let functionFilterControlDesignTest = '';
    let functionFilterCdt = '';
    let functionJoinFilter = '';
    if (user && this.userFunctionAccess) {
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      // Only apply Control function filter if this is Controls dashboard
      if (config.tableName && config.tableName.includes('Controls')) {
        functionFilter = this.userFunctionAccess.buildControlFunctionFilter('c', access, selectedFunctionIds);
        functionFilterControlDesignTest = this.userFunctionAccess.buildDirectFunctionFilter('t', 'function_id', access, selectedFunctionIds);
        functionFilterCdt = this.userFunctionAccess.buildDirectFunctionFilter('cdt', 'function_id', access, selectedFunctionIds);
        functionJoinFilter = this.userFunctionAccess.buildControlFunctionJoinFilter('cf', access, selectedFunctionIds);
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
      let countQuery = this.applyDateFilterPlaceholders(metric.query, dateFilters);
      const hasExplicitFunctionTokens =
        /\{functionJoinFilter\}|\{functionFilter(ControlDesignTest|Cdt)?\}/.test(metric.query);
      if (hasExplicitFunctionTokens) {
        countQuery = this.applyFunctionFilterPlaceholders(
          countQuery,
          functionFilter,
          functionFilterControlDesignTest,
          functionFilterCdt,
          functionJoinFilter,
        ).replace(/\s{2,}/g, ' ').trim();
      } else if (functionFilter && countQuery.includes('FROM') && countQuery.includes('Controls')) {
        const whereIndex = countQuery.toUpperCase().indexOf(' WHERE ');
        if (whereIndex > -1) {
          const beforeWhere = countQuery.substring(0, whereIndex + 7);
          const afterWhere = countQuery.substring(whereIndex + 7);
          countQuery = beforeWhere + functionFilter + ' ' + afterWhere;
        }
      }
      
      if (cardType === 'total') {
        dataQuery = `SELECT c.id, c.name, c.code FROM ${fq('Controls')} c WHERE c.isDeleted = 0 AND c.deletedAt IS NULL ${dateFilters.dateFilterC} ${functionFilter} ORDER BY c.createdAt DESC`;
      } else if (cardType === 'unmapped') {
        dataQuery = `SELECT c.id, c.name, c.code FROM ${fq('Controls')} c WHERE c.isDeleted = 0 ${dateFilters.dateFilterC} ${functionFilter} AND NOT EXISTS (SELECT 1 FROM ${fq('ControlCosos')} ccx WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL) ORDER BY c.createdAt DESC`;
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
        
        dataQuery = `SELECT c.id, c.name, c.code FROM ${fq('Controls')} c WHERE ${whereClause} AND c.deletedAt IS NULL AND c.isDeleted = 0 ${dateFilters.dateFilterC} ${functionFilter} ORDER BY c.createdAt DESC`;
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
          WHERE ${whereClause} AND c.isDeleted = 0 AND c.deletedAt IS NULL AND t.function_id IS NOT NULL ${dateFilters.dateFilterT} ${functionFilterControlDesignTest}
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
          AND a.isDeleted = 0 ${dateFilters.dateFilterC} ${functionFilter}
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
          AND (a.isDeleted = 0 OR a.id IS NULL) ${dateFilters.dateFilterC} ${functionFilter}
          ORDER BY c.createdAt DESC`;
      } else {
        // Fallback to generic query
        dataQuery = `SELECT c.id, c.name, c.code FROM ${fq('Controls')} c WHERE c.isDeleted = 0 ${dateFilters.dateFilterC} ${functionFilter} ORDER BY c.createdAt DESC`;
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
