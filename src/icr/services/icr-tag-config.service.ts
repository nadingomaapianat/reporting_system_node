import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface TagColumnMeta {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date';
}

export interface TagConfigRecord {
  id: number;
  icrSectionId: number;
  tagKey: string;
  sourceType: 'user' | 'database' | 'chart' | 'empty';
  dataType: string | null;
  userValue: string | null;
  dbTable: string | null;
  dbColumns: string[] | null;
  dbData: Record<string, unknown>[] | null;
  chartId?: number | null;
  useChart?: boolean | null;
  useTable?: boolean | null;
  chartType?: 'bar' | 'line' | 'area' | 'pie' | null;
  chartTitle?: string | null;
  chartData?: Array<{ name: string; value: number }> | null;
}

export interface SaveTagConfigItem {
  tagKey: string;
  sourceType: 'user' | 'database' | 'chart' | 'empty';
  dataType?: string;
  userValue?: string;
  dbTable?: string;
  dbColumns?: string[];
  chartId?: number;
  useChart?: boolean;
  useTable?: boolean;
}

interface DynamicChartRecord {
  id: number;
  title: string;
  chartType: 'bar' | 'line' | 'area' | 'pie';
  config: DynamicChartConfig;
  createdAt?: string;
}

export interface DynamicChartOptionRecord {
  id: number;
  title: string;
  chartType: 'bar' | 'line' | 'area' | 'pie';
  createdAt?: string;
}

interface DynamicChartConfig {
  tables: string[];
  joins?: Array<{
    type?: string;
    leftTable?: string;
    leftColumn?: string;
    rightTable?: string;
    rightColumn?: string;
  }>;
  columns: string[];
  whereConditions?: Array<{
    column?: string;
    operator?: string;
    value?: string;
    logicalOperator?: string;
  }>;
  timeFilter?: {
    column?: string;
    startDate?: string;
    endDate?: string;
  } | null;
  xKey?: string;
  yKey?: string;
  visibleColumns?: string[];
}

export interface TagChartPreviewRecord {
  chartId: number;
  chartTitle: string;
  chartType: 'bar' | 'line' | 'area' | 'pie';
  useChart: boolean;
  useTable: boolean;
  tableColumns: string[];
  tableRows: Record<string, unknown>[];
  chartData: Array<{ name: string; value: number }>;
}

/** Logical tag “table” → physical dbo table name (must stay in sync with IcrDataAggregatorService). */
const LOGICAL_TO_PHYSICAL: Record<string, string> = {
  risks: 'Risks',
  controls: 'Controls',
  kris: 'Kris',
  incidents: 'Incidents',
  finding: '__combined_findings__',
};

const FINDING_SOURCE_TABLES = ['AdequateFindings', 'EffectiveFindings'] as const;
const FINDING_COLUMN_DENYLIST = new Set(['controldesigntest_id']);
const FINDING_VIRTUAL_COLUMNS: TagColumnMeta[] = [
  { key: 'control_code', label: 'Control Code', type: 'string' },
  { key: 'control_description', label: 'Control Description', type: 'string' },
  { key: 'risk_code', label: 'Risk Code', type: 'string' },
  { key: 'risk_description', label: 'Risk Description', type: 'string' },
  { key: 'function_name', label: 'Function Name', type: 'string' },
];

const ALLOWED_TABLES = new Set(Object.keys(LOGICAL_TO_PHYSICAL));
const ALLOWED_CHART_TYPES = new Set(['bar', 'line', 'area', 'pie']);
const SAFE_IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ALLOWED_WHERE_OPERATORS = new Set(['=', '!=', '<>', '>', '>=', '<', '<=', 'LIKE', 'IN', 'BETWEEN']);
const ALLOWED_LOGICAL_OPERATORS = new Set(['AND', 'OR']);
const ALLOWED_JOIN_TYPES = new Set(['INNER', 'LEFT']);

interface RelationLookup {
  table: string;
  alias: string;
  displayColumns: string[];
  targetKey?: string;
}

const COMMON_ID_LOOKUPS: Record<string, RelationLookup> = {
  created_by: { table: 'Users', alias: 'lu_created_by', displayColumns: ['name', 'username', 'email'] },
  modifiedby: { table: 'Users', alias: 'lu_modified_by', displayColumns: ['name', 'username', 'email'] },
  preparerid: { table: 'Users', alias: 'lu_preparer', displayColumns: ['name', 'username', 'email'] },
  checkerid: { table: 'Users', alias: 'lu_checker', displayColumns: ['name', 'username', 'email'] },
  reviewerid: { table: 'Users', alias: 'lu_reviewer', displayColumns: ['name', 'username', 'email'] },
  acceptanceid: { table: 'Users', alias: 'lu_acceptance', displayColumns: ['name', 'username', 'email'] },
};

const TABLE_RELATION_LOOKUPS: Record<string, Record<string, RelationLookup>> = {
  risks: {
    event: { table: 'EventTypes', alias: 'lu_risk_event', displayColumns: ['name', 'code'] },
  },
  controls: {
    departmentid: { table: 'JobTitles', alias: 'lu_control_department', displayColumns: ['name', 'code'] },
    head_departmentid: { table: 'JobTitles', alias: 'lu_control_head_department', displayColumns: ['name', 'code'] },
    systemid: { table: 'Systems', alias: 'lu_control_system', displayColumns: ['name', 'code'] },
    icof_id: { table: 'Assertions', alias: 'lu_control_assertion', displayColumns: ['name', 'coding'] },
    preparerid: { table: 'Users', alias: 'lu_control_preparer', displayColumns: ['name', 'username', 'email'] },
    checkerid: { table: 'Users', alias: 'lu_control_checker', displayColumns: ['name', 'username', 'email'] },
    reviewerid: { table: 'Users', alias: 'lu_control_reviewer', displayColumns: ['name', 'username', 'email'] },
    acceptanceid: { table: 'Users', alias: 'lu_control_acceptance', displayColumns: ['name', 'username', 'email'] },
  },
  incidents: {
    function_id: { table: 'Functions', alias: 'lu_incident_function', displayColumns: ['name', 'code'] },
    category_id: { table: 'Categories', alias: 'lu_incident_category', displayColumns: ['name'] },
    sub_category_id: { table: 'IncidentSubCategories', alias: 'lu_incident_sub_category', displayColumns: ['name'] },
    event_type_id: { table: 'IncidentEvents', alias: 'lu_incident_event_type', displayColumns: ['name', 'code'] },
    discovered_type_id: { table: 'DiscoveredTypes', alias: 'lu_incident_discovered_type', displayColumns: ['name'] },
    financial_impact_id: { table: 'FinancialImpacts', alias: 'lu_incident_financial_impact', displayColumns: ['name'] },
    currency: { table: 'Currencies', alias: 'lu_incident_currency', displayColumns: ['name'] },
    kri: { table: 'Kris', alias: 'lu_incident_kri', displayColumns: ['kriName', 'code'] },
    cause_id: { table: 'RootCauses', alias: 'lu_incident_root_cause', displayColumns: ['name'] },
    preparerid: { table: 'Users', alias: 'lu_incident_preparer', displayColumns: ['name', 'username', 'email'] },
    checkerid: { table: 'Users', alias: 'lu_incident_checker', displayColumns: ['name', 'username', 'email'] },
    reviewerid: { table: 'Users', alias: 'lu_incident_reviewer', displayColumns: ['name', 'username', 'email'] },
    acceptanceid: { table: 'Users', alias: 'lu_incident_acceptance', displayColumns: ['name', 'username', 'email'] },
  },
  kris: {
    assignedpersonid: { table: 'Users', alias: 'lu_kri_assigned_person', displayColumns: ['name', 'username', 'email'] },
    related_function_id: { table: 'Functions', alias: 'lu_kri_function', displayColumns: ['name', 'code'] },
    addedby: { table: 'Users', alias: 'lu_kri_added_by', displayColumns: ['name', 'username', 'email'] },
    preparerid: { table: 'Users', alias: 'lu_kri_preparer', displayColumns: ['name', 'username', 'email'] },
    checkerid: { table: 'Users', alias: 'lu_kri_checker', displayColumns: ['name', 'username', 'email'] },
    reviewerid: { table: 'Users', alias: 'lu_kri_reviewer', displayColumns: ['name', 'username', 'email'] },
    acceptanceid: { table: 'Users', alias: 'lu_kri_acceptance', displayColumns: ['name', 'username', 'email'] },
  },
  finding: {
    controldesigntest_id: { table: 'ControlDesignTests', alias: 'lu_finding_cdt', displayColumns: ['procedure', 'status'] },
  },
};

/** Sensitive / noise columns always hidden (see also `shouldExcludeTagColumn`). */
const COLUMN_DENYLIST = new Set(
  [
    'deletedat',
    'isdeleted',
    'password',
    'passwordhash',
    'token',
    'refreshtoken',
  ],
);

function shouldExcludeTagColumn(columnName: string): boolean {
  const t = columnName.trim();
  if (!t) return true;
  const l = t.toLowerCase();

  if (COLUMN_DENYLIST.has(l)) return true;
  if (l === 'id') return true;
  return false;
}

@Injectable()
export class IcrTagConfigService {
  private readonly logger = new Logger(IcrTagConfigService.name);

  /** Short-lived cache: logical table → columns */
  private columnMetaCache = new Map<string, { expires: number; cols: TagColumnMeta[] }>();
  private static readonly CACHE_MS = 60_000;

  constructor(
    private readonly db: DatabaseService,
  ) {}

  /**
   * Column list comes from SQL Server INFORMATION_SCHEMA for the real dbo table.
   */
  async getAvailableColumns(tableName: string): Promise<TagColumnMeta[]> {
    const logical = (tableName ?? '').trim().toLowerCase();
    if (!ALLOWED_TABLES.has(logical)) {
      throw new BadRequestException(`Invalid table name: ${tableName}. Allowed: ${[...ALLOWED_TABLES].join(', ')}`);
    }
    const now = Date.now();
    const hit = this.columnMetaCache.get(logical);
    if (hit && hit.expires > now) {
      return hit.cols;
    }
    const cols = logical === 'finding'
      ? await this.loadFindingColumnsFromInformationSchema()
      : await this.loadColumnsFromInformationSchema(LOGICAL_TO_PHYSICAL[logical]);
    this.columnMetaCache.set(logical, { expires: now + IcrTagConfigService.CACHE_MS, cols });
    return cols;
  }

  async getTagConfigs(reportId: number, sectionType: string): Promise<TagConfigRecord[]> {
    const sectionId = await this.findSectionId(reportId, sectionType);
    const sql = `
      SELECT
        id,
        icrSectionId,
        tagKey,
        sourceType,
        dataType,
        userValue,
        dbTable,
        dbColumns,
        dbData,
        chartId,
        chartUseChart,
        chartUseTable
      FROM dbo.icr_tag_configs
      WHERE icrSectionId = @param0
      ORDER BY tagKey
    `;
    const rows = await this.db.query(sql, [sectionId]);
    return (rows || []).map((r: any) => ({
      id: r.id,
      icrSectionId: r.icrSectionId,
      tagKey: r.tagKey,
      sourceType: r.sourceType ?? 'empty',
      dataType: r.dataType ?? null,
      userValue: r.userValue ?? null,
      dbTable: r.dbTable ?? null,
      dbColumns: this.parseJson(r.dbColumns),
      dbData: this.parseJson(r.dbData),
      chartId: r.chartId == null ? null : Number(r.chartId),
      useChart: r.chartUseChart == null ? null : Boolean(r.chartUseChart),
      useTable: r.chartUseTable == null ? null : Boolean(r.chartUseTable),
      chartType: null,
      chartTitle: null,
      chartData: null,
    }));
  }

  async saveTagConfigs(
    reportId: number,
    sectionType: string,
    configs: SaveTagConfigItem[] | undefined,
  ): Promise<TagConfigRecord[]> {
    if (!Array.isArray(configs)) {
      throw new BadRequestException('Request body must include a "configs" array.');
    }

    const sectionId = await this.findSectionId(reportId, sectionType);

    for (const cfg of configs) {
      if (!['user', 'database', 'chart', 'empty'].includes(cfg.sourceType)) {
        throw new BadRequestException(`Invalid sourceType: ${cfg.sourceType}`);
      }
      if (cfg.sourceType === 'database' && cfg.dbTable && !ALLOWED_TABLES.has(cfg.dbTable)) {
        throw new BadRequestException(`Invalid dbTable: ${cfg.dbTable}`);
      }
      if (cfg.sourceType === 'chart') {
        if (!cfg.chartId || !Number.isFinite(Number(cfg.chartId))) {
          throw new BadRequestException(`Invalid chartId for tag ${cfg.tagKey}`);
        }
        if (!cfg.useChart && !cfg.useTable) {
          throw new BadRequestException(`Chart tag ${cfg.tagKey} must enable chart or table output.`);
        }
      }
    }

    await this.db.query(`DELETE FROM dbo.icr_tag_configs WHERE icrSectionId = @param0`, [sectionId]);

    for (const cfg of configs) {
      await this.db.query(
        `INSERT INTO dbo.icr_tag_configs
          (icrSectionId, tagKey, sourceType, dataType, userValue, dbTable, dbColumns, dbData, chartId, chartUseChart, chartUseTable)
         VALUES
          (@param0, @param1, @param2, @param3, @param4, @param5, @param6, @param7, @param8, @param9, @param10)`,
        [
          sectionId,
          cfg.tagKey,
          cfg.sourceType,
          cfg.sourceType === 'user' ? (cfg.dataType ?? 'text') : null,
          cfg.sourceType === 'user' ? (cfg.userValue ?? '') : null,
          cfg.sourceType === 'database' ? (cfg.dbTable ?? null) : null,
          cfg.sourceType === 'database' && cfg.dbColumns ? JSON.stringify(cfg.dbColumns) : null,
          null,
          cfg.sourceType === 'chart' ? Number(cfg.chartId) : null,
          cfg.sourceType === 'chart' ? Boolean(cfg.useChart) : null,
          cfg.sourceType === 'chart' ? Boolean(cfg.useTable) : null,
        ],
      );
    }

    return this.getTagConfigs(reportId, sectionType);
  }

  async getTagConfigsForExport(
    reportId: number,
    sectionType: string,
  ): Promise<TagConfigRecord[]> {
    const configs = await this.getTagConfigs(reportId, sectionType);

    return Promise.all(configs.map(async (cfg) => {
      if (cfg.sourceType === 'chart' && cfg.chartId && (cfg.useChart || cfg.useTable)) {
        try {
          const preview = await this.fetchChartDataForPreview(
            reportId,
            cfg.chartId,
            Boolean(cfg.useChart),
            Boolean(cfg.useTable),
            null,
          );
          return {
            ...cfg,
            dbColumns: preview.tableColumns,
            dbData: preview.tableRows,
            chartType: preview.chartType,
            chartTitle: preview.chartTitle,
            chartData: preview.chartData,
          };
        } catch (err: any) {
          this.logger.warn(
            `Failed to rebuild export chart data for tag ${cfg.tagKey} (${sectionType}): ${err?.message ?? err}`,
          );
          return {
            ...cfg,
            dbColumns: [],
            dbData: [],
            chartData: [],
            chartTitle: null,
            chartType: null,
          };
        }
      }

      if (
        cfg.sourceType !== 'database' ||
        !cfg.dbTable ||
        !Array.isArray(cfg.dbColumns) ||
        cfg.dbColumns.length === 0
      ) {
        return { ...cfg, dbData: null };
      }

      try {
        const dbData = await this.fetchTableDataForPreview(
          reportId,
          cfg.dbTable,
          cfg.dbColumns,
          null,
        );
        return { ...cfg, dbData };
      } catch (err: any) {
        this.logger.warn(
          `Failed to rebuild export data for tag ${cfg.tagKey} (${sectionType}): ${err?.message ?? err}`,
        );
        return { ...cfg, dbData: [] };
      }
    }));
  }

  async fetchTableDataForPreview(
    reportId: number,
    tableName: string,
    columns: string[],
    maxRows: number | null = 200,
  ): Promise<Record<string, unknown>[]> {
    const logical = (tableName ?? '').trim().toLowerCase();
    if (!ALLOWED_TABLES.has(logical)) {
      throw new BadRequestException(`Invalid table: ${tableName}`);
    }

    if (logical === 'finding') {
      return this.fetchFindingDataForPreview(reportId, columns, maxRows);
    }

    const schemaRows = await this.queryInformationSchemaColumns(LOGICAL_TO_PHYSICAL[logical]);
    const allColumns = schemaRows
      .map((r: any) => String(r.columnName ?? '').trim())
      .filter(Boolean);
    const dataTypeMap = new Map(
      schemaRows.map((r: any) => [
        String(r.columnName ?? '').trim().toLowerCase(),
        String(r.dataType ?? '').trim().toLowerCase(),
      ]),
    );
    const exactNameMap = new Map(allColumns.map((name) => [name.toLowerCase(), name]));
    const filteredCols = columns
      .map(c => c.trim())
      .map(c => exactNameMap.get(c.toLowerCase()) ?? '')
      .filter(Boolean);
    if (!filteredCols.length) {
      throw new BadRequestException('No valid columns selected');
    }

    const reportPeriod = await this.loadReportPeriod(reportId);

    const physicalTable = LOGICAL_TO_PHYSICAL[logical];
    const sourceAlias = 'src';
    const joins: string[] = [];
    const usedJoinAliases = new Set<string>();
    const selectCols = filteredCols.map((col) =>
      this.buildPreviewSelectExpression(logical, col, sourceAlias, joins, usedJoinAliases),
    ).join(', ');
    const whereClause = this.buildReportPeriodWhereClause(
      allColumns,
      sourceAlias,
      reportPeriod.periodFrom,
      reportPeriod.periodTo,
    );
    const topClause = maxRows && maxRows > 0 ? `TOP (${Math.floor(maxRows)}) ` : '';
    const createdAtCol = this.findColumnName(allColumns, 'createdAt');
    const orderClause = createdAtCol
      ? `ORDER BY ${sourceAlias}.[${this.escapeIdentifier(createdAtCol)}] ASC`
      : '';
    const sql = `
      SELECT ${topClause}${selectCols}
      FROM dbo.[${this.escapeIdentifier(physicalTable)}] ${sourceAlias}
      ${joins.join('\n      ')}
      ${whereClause}
      ${orderClause}
    `;

    try {
      const rows = await this.db.query(sql, [
        reportPeriod.periodFrom.toISOString(),
        reportPeriod.periodTo.toISOString(),
      ]);
      return (rows ?? []).map((row: Record<string, unknown>) => {
        const formatted: Record<string, unknown> = {};
        for (const col of filteredCols) {
          formatted[col] = this.toHumanReadableValue(
            row[col],
            dataTypeMap.get(col.toLowerCase()) ?? '',
            Boolean(this.getRelationLookup(logical, col)),
          );
        }
        return formatted;
      });
    } catch (err: any) {
      this.logger.error(`Failed to fetch preview rows from dbo.${physicalTable}: ${err?.message}`);
      throw new BadRequestException(`Could not load preview data for table "${tableName}".`);
    }
  }

  async listAvailableCharts(): Promise<DynamicChartOptionRecord[]> {
    const configColumn = await this.resolveDynamicChartConfigColumn();
    if (!configColumn) {
      return [];
    }

    const rows = await this.db.query(
      `
        SELECT id, title, chart_type AS chartType, ${configColumn} AS chartConfig, created_at AS createdAt
        FROM dbo.dynamic_dashboard_charts
        ORDER BY created_at DESC, id DESC
      `,
      [],
    );

    return (rows ?? [])
      .map((row: any) => {
        const chartType = String(row.chartType ?? '').trim().toLowerCase();
        if (!ALLOWED_CHART_TYPES.has(chartType)) {
          return null;
        }
        const config = this.parseJson(row.chartConfig) as DynamicChartConfig | null;
        if (!config || !Array.isArray(config.tables) || !Array.isArray(config.columns)) {
          return null;
        }
        return {
          id: Number(row.id),
          title: String(row.title ?? `Chart ${row.id}`),
          chartType: chartType as DynamicChartRecord['chartType'],
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
        };
      })
      .filter(Boolean) as DynamicChartOptionRecord[];
  }

  async fetchChartDataForPreview(
    reportId: number,
    chartId: number,
    useChart: boolean,
    useTable: boolean,
    maxRows: number | null = 200,
  ): Promise<TagChartPreviewRecord> {
    if (!useChart && !useTable) {
      throw new BadRequestException('Chart preview must request chart output, table output, or both.');
    }

    const chart = await this.loadDynamicChart(chartId);
    const queryPlan = await this.buildDynamicChartQuery(chart.config, reportId, maxRows);
    const rawRows = await this.db.query(queryPlan.sql, queryPlan.params);
    const tableRows = (rawRows ?? []).map((row: Record<string, unknown>) => {
      const formatted: Record<string, unknown> = {};
      for (const col of queryPlan.outputColumns) {
        formatted[col.outputKey] = this.toHumanReadableValue(
          row[col.outputKey],
          col.sqlType,
          false,
        );
      }
      return formatted;
    });

    return {
      chartId: chart.id,
      chartTitle: chart.title,
      chartType: chart.chartType,
      useChart,
      useTable,
      tableColumns: queryPlan.outputColumns.map((col) => col.outputKey),
      tableRows,
      chartData: useChart
        ? this.transformRowsToChartData(
            rawRows ?? [],
            chart.config.xKey ?? '',
            chart.config.yKey ?? '',
            chart.chartType,
          )
        : [],
    };
  }

  private async loadColumnsFromInformationSchema(physicalTable: string): Promise<TagColumnMeta[]> {
    const rows = await this.queryInformationSchemaColumns(physicalTable);

    const out: TagColumnMeta[] = [];
    for (const r of rows) {
      const name = String(r.columnName ?? '').trim();
      if (!name) continue;
      if (shouldExcludeTagColumn(name)) continue;
      out.push({
        key: name,
        label: humanizeColumnLabel(name),
        type: mapSqlDataTypeToTagType(String(r.dataType ?? 'varchar')),
      });
    }
    return out;
  }

  private async loadFindingColumnsFromInformationSchema(): Promise<TagColumnMeta[]> {
    const merged = new Map<string, TagColumnMeta>();

    for (const table of FINDING_SOURCE_TABLES) {
      const cols = await this.loadColumnsFromInformationSchema(table);
      for (const col of cols) {
        const key = col.key.toLowerCase();
        if (FINDING_COLUMN_DENYLIST.has(key)) continue;
        if (!merged.has(key)) {
          merged.set(key, col);
        }
      }
    }

    for (const col of FINDING_VIRTUAL_COLUMNS) {
      if (!merged.has(col.key.toLowerCase())) {
        merged.set(col.key.toLowerCase(), col);
      }
    }

    return Array.from(merged.values());
  }

  private async queryInformationSchemaColumns(physicalTable: string): Promise<any[]> {
    const sql = `
      SELECT
        COLUMN_NAME AS columnName,
        DATA_TYPE   AS dataType
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = N'dbo'
        AND TABLE_NAME = @param0
      ORDER BY ORDINAL_POSITION
    `;
    let rows: any[];
    try {
      rows = await this.db.query(sql, [physicalTable]) || [];
    } catch (err: any) {
      this.logger.error(`INFORMATION_SCHEMA lookup failed for dbo.${physicalTable}: ${err?.message}`);
      throw new BadRequestException(`Could not read columns for table "${physicalTable}".`);
    }
    return rows;
  }

  private buildPreviewSelectExpression(
    logical: string,
    columnName: string,
    sourceAlias: string,
    joins: string[],
    usedJoinAliases: Set<string>,
  ): string {
    const escapedColumn = this.escapeIdentifier(columnName);
    if (logical === 'finding') {
      return this.buildFindingDerivedExpression(
        columnName,
        sourceAlias,
        escapedColumn,
        joins,
        usedJoinAliases,
      );
    }

    const lookup = this.getRelationLookup(logical, columnName);
    if (!lookup) {
      return `${sourceAlias}.[${escapedColumn}] AS [${escapedColumn}]`;
    }

    if (!usedJoinAliases.has(lookup.alias)) {
      const targetKey = this.escapeIdentifier(lookup.targetKey ?? 'id');
      joins.push(
        `LEFT JOIN dbo.[${this.escapeIdentifier(lookup.table)}] ${lookup.alias}` +
        ` ON ${lookup.alias}.[${targetKey}] = ${sourceAlias}.[${escapedColumn}]` +
        ` AND ${lookup.alias}.[deletedAt] IS NULL`,
      );
      usedJoinAliases.add(lookup.alias);
    }

    const nonEmptyLookupCols = lookup.displayColumns.map(
      (displayCol) =>
        `NULLIF(LTRIM(RTRIM(CAST(${lookup.alias}.[${this.escapeIdentifier(displayCol)}] AS NVARCHAR(4000)))), N'')`,
    );
    const fallback = `CAST(${sourceAlias}.[${escapedColumn}] AS NVARCHAR(4000))`;

    return `COALESCE(${[...nonEmptyLookupCols, fallback].join(', ')}) AS [${escapedColumn}]`;
  }

  private buildFindingDerivedExpression(
    columnName: string,
    sourceAlias: string,
    escapedColumn: string,
    joins: string[],
    usedJoinAliases: Set<string>,
  ): string {
    const lower = columnName.toLowerCase();
    if (
      lower !== 'controldesigntest_id' &&
      !FINDING_VIRTUAL_COLUMNS.some((col) => col.key.toLowerCase() === lower)
    ) {
      return `${sourceAlias}.[${escapedColumn}] AS [${escapedColumn}]`;
    }

    const controlDesignTestJoinColumn =
      lower === 'controldesigntest_id'
        ? escapedColumn
        : this.escapeIdentifier('controlDesignTest_id');

    this.ensureFindingControlDesignTestJoins(
      sourceAlias,
      controlDesignTestJoinColumn,
      joins,
      usedJoinAliases,
    );

    if (lower === 'control_code') {
      return this.buildFindingTextSelect('lu_finding_control', 'code', 'control_code');
    }
    if (lower === 'control_description') {
      return this.buildFindingTextSelect('lu_finding_control', 'description', 'control_description');
    }
    if (lower === 'risk_code') {
      return this.buildFindingTextSelect('lu_finding_risk', 'code', 'risk_code');
    }
    if (lower === 'risk_description') {
      return this.buildFindingTextSelect('lu_finding_risk', 'description', 'risk_description');
    }
    if (lower === 'function_name') {
      return this.buildFindingTextSelect('lu_finding_function', 'name', 'function_name');
    }

    return this.buildFindingControlDesignTestSummarySelect(sourceAlias, escapedColumn);
  }

  private ensureFindingControlDesignTestJoins(
    sourceAlias: string,
    escapedColumn: string,
    joins: string[],
    usedJoinAliases: Set<string>,
  ): void {
    const joinDefs = [
      {
        alias: 'lu_finding_cdt',
        sql:
          `LEFT JOIN dbo.[ControlDesignTests] lu_finding_cdt` +
          ` ON lu_finding_cdt.[id] = ${sourceAlias}.[${escapedColumn}]` +
          ` AND lu_finding_cdt.[deletedAt] IS NULL`,
      },
      {
        alias: 'lu_finding_control',
        sql:
          `LEFT JOIN dbo.[Controls] lu_finding_control` +
          ` ON lu_finding_control.[id] = lu_finding_cdt.[control_id]` +
          ` AND lu_finding_control.[deletedAt] IS NULL`,
      },
      {
        alias: 'lu_finding_risk',
        sql:
          `LEFT JOIN dbo.[Risks] lu_finding_risk` +
          ` ON lu_finding_risk.[id] = lu_finding_cdt.[risk_id]` +
          ` AND lu_finding_risk.[deletedAt] IS NULL`,
      },
      {
        alias: 'lu_finding_function',
        sql:
          `LEFT JOIN dbo.[Functions] lu_finding_function` +
          ` ON lu_finding_function.[id] = lu_finding_cdt.[function_id]` +
          ` AND lu_finding_function.[deletedAt] IS NULL`,
      },
    ];

    for (const join of joinDefs) {
      if (!usedJoinAliases.has(join.alias)) {
        joins.push(join.sql);
        usedJoinAliases.add(join.alias);
      }
    }
  }

  private buildFindingTextSelect(
    tableAlias: string,
    columnName: string,
    outputColumn: string,
    fallbackExpr: string = `N''`,
  ): string {
    return `COALESCE(NULLIF(LTRIM(RTRIM(CAST(${tableAlias}.[${this.escapeIdentifier(columnName)}] AS NVARCHAR(4000)))), N''), ${fallbackExpr}) AS [${this.escapeIdentifier(outputColumn)}]`;
  }

  private buildFindingControlDesignTestSummarySelect(
    sourceAlias: string,
    escapedColumn: string,
  ): string {
    const detailExpr = `
      NULLIF(LTRIM(RTRIM(CONCAT(
        CASE
          WHEN NULLIF(LTRIM(RTRIM(CAST(lu_finding_control.[code] AS NVARCHAR(4000)))), N'') IS NOT NULL
            THEN N'Control Code: ' + CAST(lu_finding_control.[code] AS NVARCHAR(4000))
          ELSE N''
        END,
        CASE
          WHEN NULLIF(LTRIM(RTRIM(CAST(lu_finding_control.[description] AS NVARCHAR(4000)))), N'') IS NOT NULL
            THEN CASE
              WHEN NULLIF(LTRIM(RTRIM(CAST(lu_finding_control.[code] AS NVARCHAR(4000)))), N'') IS NOT NULL
                THEN N' | '
              ELSE N''
            END + N'Control Description: ' + CAST(lu_finding_control.[description] AS NVARCHAR(4000))
          ELSE N''
        END,
        CASE
          WHEN NULLIF(LTRIM(RTRIM(CAST(lu_finding_risk.[code] AS NVARCHAR(4000)))), N'') IS NOT NULL
            THEN CASE
              WHEN
                NULLIF(LTRIM(RTRIM(CAST(lu_finding_control.[code] AS NVARCHAR(4000)))), N'') IS NOT NULL OR
                NULLIF(LTRIM(RTRIM(CAST(lu_finding_control.[description] AS NVARCHAR(4000)))), N'') IS NOT NULL
                THEN N' | '
              ELSE N''
            END + N'Risk Code: ' + CAST(lu_finding_risk.[code] AS NVARCHAR(4000))
          ELSE N''
        END,
        CASE
          WHEN NULLIF(LTRIM(RTRIM(CAST(lu_finding_risk.[description] AS NVARCHAR(4000)))), N'') IS NOT NULL
            THEN CASE
              WHEN
                NULLIF(LTRIM(RTRIM(CAST(lu_finding_control.[code] AS NVARCHAR(4000)))), N'') IS NOT NULL OR
                NULLIF(LTRIM(RTRIM(CAST(lu_finding_control.[description] AS NVARCHAR(4000)))), N'') IS NOT NULL OR
                NULLIF(LTRIM(RTRIM(CAST(lu_finding_risk.[code] AS NVARCHAR(4000)))), N'') IS NOT NULL
                THEN N' | '
              ELSE N''
            END + N'Risk Description: ' + CAST(lu_finding_risk.[description] AS NVARCHAR(4000))
          ELSE N''
        END,
        CASE
          WHEN NULLIF(LTRIM(RTRIM(CAST(lu_finding_function.[name] AS NVARCHAR(4000)))), N'') IS NOT NULL
            THEN CASE
              WHEN
                NULLIF(LTRIM(RTRIM(CAST(lu_finding_control.[code] AS NVARCHAR(4000)))), N'') IS NOT NULL OR
                NULLIF(LTRIM(RTRIM(CAST(lu_finding_control.[description] AS NVARCHAR(4000)))), N'') IS NOT NULL OR
                NULLIF(LTRIM(RTRIM(CAST(lu_finding_risk.[code] AS NVARCHAR(4000)))), N'') IS NOT NULL OR
                NULLIF(LTRIM(RTRIM(CAST(lu_finding_risk.[description] AS NVARCHAR(4000)))), N'') IS NOT NULL
                THEN N' | '
              ELSE N''
            END + N'Function: ' + CAST(lu_finding_function.[name] AS NVARCHAR(4000))
          ELSE N''
        END
      ))), N'')
    `;

    return `COALESCE(${detailExpr}, CAST(${sourceAlias}.[${escapedColumn}] AS NVARCHAR(4000))) AS [${escapedColumn}]`;
  }

  private buildPreviewSelectExpressionForAvailableColumns(
    logical: string,
    columnName: string,
    availableColumns: Set<string>,
    sourceAlias: string,
    joins: string[],
    usedJoinAliases: Set<string>,
  ): string {
    const isFindingVirtualColumn =
      logical === 'finding' &&
      FINDING_VIRTUAL_COLUMNS.some((col) => col.key.toLowerCase() === columnName.toLowerCase());

    if (isFindingVirtualColumn) {
      return this.buildPreviewSelectExpression(logical, columnName, sourceAlias, joins, usedJoinAliases);
    }

    if (!availableColumns.has(columnName.toLowerCase())) {
      return `CAST(N'' AS NVARCHAR(4000)) AS [${this.escapeIdentifier(columnName)}]`;
    }
    return this.buildPreviewSelectExpression(logical, columnName, sourceAlias, joins, usedJoinAliases);
  }

  private getRelationLookup(logical: string, columnName: string): RelationLookup | null {
    const lower = columnName.toLowerCase();
    return TABLE_RELATION_LOOKUPS[logical]?.[lower] ?? COMMON_ID_LOOKUPS[lower] ?? null;
  }

  private buildSoftDeleteWhere(columnNames: string[], tableAlias: string): string {
    const lower = new Set(columnNames.map((c) => c.toLowerCase()));
    const parts: string[] = [];

    const isDeletedCol = columnNames.find((c) => c.toLowerCase() === 'isdeleted');
    if (isDeletedCol && lower.has('isdeleted')) {
      parts.push(`ISNULL(${tableAlias}.[${this.escapeIdentifier(isDeletedCol)}], 0) = 0`);
    }

    const deletedAtCol = columnNames.find((c) => c.toLowerCase() === 'deletedat');
    if (deletedAtCol && lower.has('deletedat')) {
      parts.push(`${tableAlias}.[${this.escapeIdentifier(deletedAtCol)}] IS NULL`);
    }

    if (!parts.length) return '';
    return `WHERE ${parts.join(' AND ')}`;
  }

  private buildReportPeriodWhereClause(
    columnNames: string[],
    tableAlias: string,
    periodFrom: Date,
    periodTo: Date,
  ): string {
    const parts: string[] = [];
    const softDeleteClause = this.buildSoftDeleteWhere(columnNames, tableAlias);
    if (softDeleteClause) {
      parts.push(softDeleteClause.replace(/^WHERE\s+/i, ''));
    }

    const createdAtCol = this.findColumnName(columnNames, 'createdAt');
    if (!createdAtCol) {
      throw new BadRequestException('Selected table does not expose a createdAt column for report period filtering.');
    }
    parts.push(`${tableAlias}.[${this.escapeIdentifier(createdAtCol)}] >= @param0`);
    parts.push(`${tableAlias}.[${this.escapeIdentifier(createdAtCol)}] <= @param1`);

    return `WHERE ${parts.join(' AND ')}`;
  }

  private findColumnName(columnNames: string[], target: string): string | null {
    return columnNames.find((c) => c.toLowerCase() === target.toLowerCase()) ?? null;
  }

  private async fetchFindingDataForPreview(
    reportId: number,
    columns: string[],
    maxRows: number | null,
  ): Promise<Record<string, unknown>[]> {
    const schemaByTable = await Promise.all(
      FINDING_SOURCE_TABLES.map(async (table) => ({
        table,
        rows: await this.queryInformationSchemaColumns(table),
      })),
    );

    const mergedColumnMap = new Map<string, { key: string; type: string }>();
    for (const { rows } of schemaByTable) {
      for (const row of rows) {
        const key = String(row.columnName ?? '').trim();
        if (!key || shouldExcludeTagColumn(key)) continue;
        const lower = key.toLowerCase();
        if (!mergedColumnMap.has(lower)) {
          mergedColumnMap.set(lower, {
            key,
            type: String(row.dataType ?? '').trim().toLowerCase(),
          });
        }
      }
    }
    for (const col of FINDING_VIRTUAL_COLUMNS) {
      if (!mergedColumnMap.has(col.key.toLowerCase())) {
        mergedColumnMap.set(col.key.toLowerCase(), {
          key: col.key,
          type: col.type,
        });
      }
    }

    const filteredCols = columns
      .map((c) => c.trim().toLowerCase())
      .map((c) => mergedColumnMap.get(c))
      .filter(Boolean) as Array<{ key: string; type: string }>;

    if (!filteredCols.length) {
      throw new BadRequestException('No valid columns selected');
    }

    const reportPeriod = await this.loadReportPeriod(reportId);
    const unionParts: string[] = [];

    for (const { table, rows } of schemaByTable) {
      const allColumns = rows
        .map((r: any) => String(r.columnName ?? '').trim())
        .filter(Boolean);
      const availableColumns = new Set(allColumns.map((c) => c.toLowerCase()));
      const sourceAlias = table === 'AdequateFindings' ? 'af' : 'ef';
      const joins: string[] = [];
      const usedJoinAliases = new Set<string>();
      const selectCols = filteredCols.map((col) =>
        this.buildPreviewSelectExpressionForAvailableColumns(
          'finding',
          col.key,
          availableColumns,
          sourceAlias,
          joins,
          usedJoinAliases,
        ),
      ).join(', ');
      const whereClause = this.buildReportPeriodWhereClause(
        allColumns,
        sourceAlias,
        reportPeriod.periodFrom,
        reportPeriod.periodTo,
      );
      const createdAtCol = this.findColumnName(allColumns, 'createdAt');
      unionParts.push(`
        SELECT
          ${selectCols},
          ${sourceAlias}.[${this.escapeIdentifier(createdAtCol ?? 'createdAt')}] AS [__sort_created_at]
        FROM dbo.[${this.escapeIdentifier(table)}] ${sourceAlias}
        ${joins.join('\n        ')}
        ${whereClause}
      `);
    }

    const topClause = maxRows && maxRows > 0 ? `TOP (${Math.floor(maxRows)}) ` : '';
    const sql = `
      SELECT ${topClause}${filteredCols.map((c) => `[${this.escapeIdentifier(c.key)}]`).join(', ')}
      FROM (
        ${unionParts.join('\n        UNION ALL\n')}
      ) AS combined_findings
      ORDER BY [__sort_created_at] ASC
    `;

    try {
      const rows = await this.db.query(sql, [
        reportPeriod.periodFrom.toISOString(),
        reportPeriod.periodTo.toISOString(),
        reportPeriod.periodFrom.toISOString(),
        reportPeriod.periodTo.toISOString(),
      ]);
      return (rows ?? []).map((row: Record<string, unknown>) => {
        const formatted: Record<string, unknown> = {};
        for (const col of filteredCols) {
          formatted[col.key] = this.toHumanReadableValue(
            row[col.key],
            col.type,
            Boolean(this.getRelationLookup('finding', col.key)),
          );
        }
        return formatted;
      });
    } catch (err: any) {
      this.logger.error(`Failed to fetch preview rows from combined findings: ${err?.message}`);
      throw new BadRequestException('Could not load preview data for table "finding".');
    }
  }

  private dynamicChartConfigColumnCache: string | null | undefined = undefined;

  private async resolveDynamicChartConfigColumn(): Promise<string | null> {
    if (this.dynamicChartConfigColumnCache !== undefined) {
      return this.dynamicChartConfigColumnCache;
    }

    const rows = await this.db.query(
      `
        SELECT name
        FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.dynamic_dashboard_charts')
          AND name IN ('chart_config', 'config')
      `,
      [],
    );
    const names = new Set((rows ?? []).map((row: any) => String(row.name ?? '')));
    this.dynamicChartConfigColumnCache = names.has('chart_config')
      ? 'chart_config'
      : (names.has('config') ? 'config' : null);
    return this.dynamicChartConfigColumnCache;
  }

  private async loadDynamicChart(chartId: number): Promise<DynamicChartRecord> {
    const configColumn = await this.resolveDynamicChartConfigColumn();
    if (!configColumn) {
      throw new BadRequestException('Dynamic dashboard charts table is not available.');
    }

    const rows = await this.db.query(
      `
        SELECT id, title, chart_type AS chartType, ${configColumn} AS chartConfig, created_at AS createdAt
        FROM dbo.dynamic_dashboard_charts
        WHERE id = @param0
      `,
      [chartId],
    );
    if (!rows?.length) {
      throw new NotFoundException(`Dynamic chart #${chartId} not found.`);
    }

    const row = rows[0];
    const chartType = String(row.chartType ?? '').trim().toLowerCase();
    if (!ALLOWED_CHART_TYPES.has(chartType)) {
      throw new BadRequestException(`Unsupported dynamic chart type: ${row.chartType}`);
    }

    const config = this.parseJson(row.chartConfig) as DynamicChartConfig | null;
    if (!config || typeof config !== 'object') {
      throw new BadRequestException(`Dynamic chart #${chartId} has invalid saved config.`);
    }

    return {
      id: Number(row.id),
      title: String(row.title ?? `Chart ${row.id}`),
      chartType: chartType as DynamicChartRecord['chartType'],
      config,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    };
  }

  private async buildDynamicChartQuery(
    config: DynamicChartConfig,
    reportId: number,
    maxRows: number | null,
  ): Promise<{
    sql: string;
    params: unknown[];
    outputColumns: Array<{ outputKey: string; sqlType: string }>;
  }> {
    this.validateDynamicChartConfigShape(config);

    const reportPeriod = await this.loadReportPeriod(reportId);
    const primaryTable = config.tables[0];
    const tableColumns = new Map<string, Array<{ columnName: string; dataType: string }>>();
    for (const table of config.tables) {
      tableColumns.set(table, await this.queryInformationSchemaColumns(table));
    }

    const visibleColumns = (config.visibleColumns?.length ? config.visibleColumns : config.columns)
      .filter((col) => col && col !== '#');
    if (!visibleColumns.length) {
      throw new BadRequestException('Saved chart does not contain visible columns.');
    }

    const requiredTokens = Array.from(new Set([
      ...visibleColumns,
      ...(config.xKey ? [config.xKey] : []),
      ...(config.yKey ? [config.yKey] : []),
    ]));

    const resolvedColumns = requiredTokens.map((token) => {
      const resolved = this.resolveDynamicChartColumnToken(token, primaryTable, tableColumns);
      return {
        token,
        resolvedSql: resolved.sql,
        selectSql: `${resolved.sql} AS [${this.escapeIdentifier(token)}]`,
        sqlType: resolved.sqlType,
      };
    });
    const outputColumns = resolvedColumns
      .filter((col) => visibleColumns.includes(col.token))
      .map((col) => ({
        token: col.token,
        outputKey: col.token,
        sqlType: col.sqlType,
      }));

    const joinClauses: string[] = [];
    const joinedTables = new Set<string>([primaryTable]);
    for (const join of config.joins ?? []) {
      const joinType = String(join.type ?? 'INNER').trim().toUpperCase();
      if (!ALLOWED_JOIN_TYPES.has(joinType)) {
        throw new BadRequestException(`Unsupported join type: ${join.type}`);
      }
      const leftTable = this.validateDynamicTableName(join.leftTable ?? '');
      const rightTable = this.validateDynamicTableName(join.rightTable ?? '');
      if (!config.tables.includes(leftTable) || !config.tables.includes(rightTable)) {
        throw new BadRequestException(`Join tables must exist in saved chart tables.`);
      }
      const leftCol = this.validateExistingDynamicColumn(leftTable, join.leftColumn ?? '', tableColumns);
      const rightCol = this.validateExistingDynamicColumn(rightTable, join.rightColumn ?? '', tableColumns);
      if (!joinedTables.has(rightTable)) {
        joinClauses.push(
          `${joinType} JOIN dbo.[${this.escapeIdentifier(rightTable)}] [${this.escapeIdentifier(rightTable)}] ON ` +
          `[${this.escapeIdentifier(leftTable)}].[${this.escapeIdentifier(leftCol)}] = ` +
          `[${this.escapeIdentifier(rightTable)}].[${this.escapeIdentifier(rightCol)}]`,
        );
        joinedTables.add(rightTable);
      }
    }

    const params: unknown[] = [];
    const whereClauses: string[] = [];
    for (const [index, condition] of (config.whereConditions ?? []).entries()) {
      const resolved = this.resolveDynamicChartColumnToken(condition.column ?? '', primaryTable, tableColumns);
      const operator = String(condition.operator ?? '=').trim().toUpperCase();
      if (!ALLOWED_WHERE_OPERATORS.has(operator)) {
        throw new BadRequestException(`Unsupported where operator: ${condition.operator}`);
      }
      const logical = index === 0
        ? ''
        : ` ${ALLOWED_LOGICAL_OPERATORS.has(String(condition.logicalOperator ?? 'AND').trim().toUpperCase())
            ? String(condition.logicalOperator ?? 'AND').trim().toUpperCase()
            : 'AND'} `;
      const clause = this.buildDynamicWhereClause(resolved.sql, operator, condition.value ?? '', params);
      whereClauses.push(`${logical}${clause}`);
    }

    const timeColumnToken = (config.timeFilter?.column && String(config.timeFilter.column).trim())
      ? String(config.timeFilter.column)
      : this.findColumnName(
          (tableColumns.get(primaryTable) ?? []).map((row) => String(row.columnName ?? '')),
          'createdAt',
        );
    if (timeColumnToken) {
      const resolvedTime = this.resolveDynamicChartColumnToken(timeColumnToken, primaryTable, tableColumns);
      const startParam = `@param${params.length}`;
      params.push(reportPeriod.periodFrom.toISOString());
      const endParam = `@param${params.length}`;
      params.push(reportPeriod.periodTo.toISOString());
      whereClauses.push(`${whereClauses.length ? ' AND ' : ''}${resolvedTime.sql} >= ${startParam} AND ${resolvedTime.sql} <= ${endParam}`);
    }

    const topClause = maxRows && maxRows > 0 ? `TOP (${Math.floor(maxRows)}) ` : '';
    const orderExpr = timeColumnToken
      ? this.resolveDynamicChartColumnToken(timeColumnToken, primaryTable, tableColumns).sql
      : resolvedColumns[0].resolvedSql;
    const sql = `
      SELECT ${topClause}${resolvedColumns.map((col) => col.selectSql).join(', ')}
      FROM dbo.[${this.escapeIdentifier(primaryTable)}] [${this.escapeIdentifier(primaryTable)}]
      ${joinClauses.join('\n      ')}
      ${whereClauses.length ? `WHERE ${whereClauses.join('')}` : ''}
      ORDER BY ${orderExpr} ASC
    `;

    return {
      sql,
      params,
      outputColumns: outputColumns.map(({ outputKey, sqlType }) => ({ outputKey, sqlType })),
    };
  }

  private validateDynamicChartConfigShape(config: DynamicChartConfig): void {
    if (!Array.isArray(config.tables) || !config.tables.length) {
      throw new BadRequestException('Saved chart is missing its source tables.');
    }
    if (!Array.isArray(config.columns) || !config.columns.length) {
      throw new BadRequestException('Saved chart is missing its source columns.');
    }
    for (const table of config.tables) {
      this.validateDynamicTableName(table);
    }
  }

  private validateDynamicTableName(tableName: string): string {
    const trimmed = String(tableName ?? '').trim();
    if (!SAFE_IDENTIFIER_RE.test(trimmed)) {
      throw new BadRequestException(`Unsafe table name in saved chart: ${tableName}`);
    }
    return trimmed;
  }

  private validateExistingDynamicColumn(
    tableName: string,
    columnName: string,
    tableColumns: Map<string, Array<{ columnName: string; dataType: string }>>,
  ): string {
    const trimmed = String(columnName ?? '').trim();
    if (!SAFE_IDENTIFIER_RE.test(trimmed)) {
      throw new BadRequestException(`Unsafe column name in saved chart: ${columnName}`);
    }
    const match = (tableColumns.get(tableName) ?? []).find(
      (row) => String(row.columnName ?? '').toLowerCase() === trimmed.toLowerCase(),
    );
    if (!match) {
      throw new BadRequestException(`Saved chart column ${tableName}.${columnName} does not exist.`);
    }
    return String(match.columnName);
  }

  private resolveDynamicChartColumnToken(
    token: string,
    primaryTable: string,
    tableColumns: Map<string, Array<{ columnName: string; dataType: string }>>,
  ): { sql: string; sqlType: string } {
    const trimmed = String(token ?? '').trim();
    if (!trimmed || trimmed === '#') {
      throw new BadRequestException(`Invalid chart column token: ${token}`);
    }

    const [tableCandidate, columnCandidate] = trimmed.includes('.')
      ? trimmed.split('.', 2)
      : [primaryTable, trimmed];
    const tableName = this.validateDynamicTableName(tableCandidate);
    const columnName = this.validateExistingDynamicColumn(tableName, columnCandidate, tableColumns);
    const columnMeta = (tableColumns.get(tableName) ?? []).find(
      (row) => String(row.columnName ?? '').toLowerCase() === columnName.toLowerCase(),
    );
    return {
      sql: `[${this.escapeIdentifier(tableName)}].[${this.escapeIdentifier(columnName)}]`,
      sqlType: String(columnMeta?.dataType ?? '').trim().toLowerCase(),
    };
  }

  private buildDynamicWhereClause(
    columnSql: string,
    operator: string,
    rawValue: string,
    params: unknown[],
  ): string {
    if (operator === 'IN') {
      const parts = String(rawValue)
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      if (!parts.length) {
        throw new BadRequestException('IN condition requires at least one value.');
      }
      const placeholders = parts.map((part) => {
        const name = `@param${params.length}`;
        params.push(part);
        return name;
      });
      return `${columnSql} IN (${placeholders.join(', ')})`;
    }

    if (operator === 'BETWEEN') {
      const parts = String(rawValue)
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length !== 2) {
        throw new BadRequestException('BETWEEN condition requires two comma-separated values.');
      }
      const startParam = `@param${params.length}`;
      params.push(parts[0]);
      const endParam = `@param${params.length}`;
      params.push(parts[1]);
      return `${columnSql} BETWEEN ${startParam} AND ${endParam}`;
    }

    const paramName = `@param${params.length}`;
    params.push(operator === 'LIKE' ? `%${rawValue}%` : rawValue);
    const normalizedOperator = operator === '!=' ? '<>' : operator;
    return `${columnSql} ${normalizedOperator} ${paramName}`;
  }

  private transformRowsToChartData(
    rows: Record<string, unknown>[],
    xKey: string,
    yKey: string,
    chartType: DynamicChartRecord['chartType'],
  ): Array<{ name: string; value: number }> {
    if (!xKey || !yKey || !rows.length) {
      return [];
    }

    const sampleY = rows[0]?.[yKey];
    const isYNumeric = sampleY !== null && sampleY !== '' && !Number.isNaN(Number(sampleY));

    if (chartType === 'pie' && !isYNumeric) {
      const counts = new Map<string, number>();
      for (const row of rows) {
        const yValue = String(row[yKey] ?? '').trim();
        if (yValue) {
          counts.set(yValue, (counts.get(yValue) ?? 0) + 1);
        }
      }
      return Array.from(counts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 20);
    }

    const totals = new Map<string, number>();
    for (const row of rows) {
      const xValue = String(row[xKey] ?? '').trim();
      const yValue = row[yKey];
      if (!xValue || yValue == null || yValue === '') {
        continue;
      }
      const numericValue = isYNumeric ? Number(yValue) : 1;
      if (!Number.isNaN(numericValue)) {
        totals.set(xValue, (totals.get(xValue) ?? 0) + numericValue);
      }
    }

    const out = Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
    if (chartType === 'pie') {
      return out.sort((a, b) => b.value - a.value).slice(0, 20);
    }
    return out.sort((a, b) => {
      const aNum = Number(a.name);
      const bNum = Number(b.name);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private async loadReportPeriod(reportId: number): Promise<{ periodFrom: Date; periodTo: Date }> {
    const rows = await this.db.query(
      `SELECT periodFrom, periodTo FROM dbo.icr_reports WHERE id = @param0`,
      [reportId],
    );
    if (!rows?.length) {
      throw new NotFoundException(`ICR Report #${reportId} not found.`);
    }
    return {
      periodFrom: new Date(rows[0].periodFrom),
      periodTo: new Date(rows[0].periodTo),
    };
  }

  private toHumanReadableValue(value: unknown, sqlType: string, isLookupValue: boolean): unknown {
    if (value == null) return '';

    if (isLookupValue) {
      return this.humanizeTextValue(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toHumanReadableValue(item, '', false)).join(', ');
    }

    if (value instanceof Date) {
      return this.formatDateValue(value, sqlType);
    }

    if (sqlType === 'bit' || typeof value === 'boolean') {
      return Number(value) === 1 || value === true ? 'Yes' : 'No';
    }

    if (
      ['date', 'datetime', 'datetime2', 'smalldatetime', 'datetimeoffset', 'time'].includes(sqlType)
    ) {
      return this.formatDateValue(value, sqlType);
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    if (typeof value === 'string') {
      return this.humanizeTextValue(value);
    }

    return value;
  }

  private formatDateValue(value: unknown, sqlType: string): string {
    const dt = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(dt.getTime())) {
      return String(value ?? '');
    }

    if (sqlType === 'date') {
      return dt.toISOString().slice(0, 10);
    }

    if (sqlType === 'time') {
      return dt.toISOString().slice(11, 19);
    }

    return `${dt.toISOString().slice(0, 10)} ${dt.toISOString().slice(11, 16)}`;
  }

  private humanizeTextValue(value: unknown): string {
    const text = String(value ?? '').trim();
    if (!text) return '';

    if (this.looksLikeUuid(text)) return text;

    if (text.includes('_') || text.includes('-')) {
      return text
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (ch) => ch.toUpperCase())
        .replace(/\b\w+\b/g, (word) => {
          return /^[A-Z0-9]+$/.test(word) ? word.charAt(0) + word.slice(1).toLowerCase() : word;
        });
    }

    return text;
  }

  private looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private escapeIdentifier(value: string): string {
    return value.replace(/]/g, ']]');
  }

  private async findSectionId(reportId: number, sectionType: string): Promise<number> {
    const rows = await this.db.query(
      `SELECT id FROM dbo.icr_sections WHERE icrReportId = @param0 AND sectionType = @param1`,
      [reportId, sectionType],
    );
    if (!rows?.length) {
      throw new NotFoundException(
        `Section "${sectionType}" not found for report #${reportId}.`,
      );
    }
    return rows[0].id;
  }

  private parseJson(val: unknown): any {
    if (val == null) return null;
    if (typeof val === 'object') return val;
    try { return JSON.parse(String(val)); } catch { return null; }
  }
}

function humanizeColumnLabel(name: string): string {
  const s = name.replace(/_/g, ' ').trim();
  if (!s) return name;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mapSqlDataTypeToTagType(dataType: string): 'string' | 'number' | 'date' {
  const t = dataType.toLowerCase();
  if (
    ['bigint', 'int', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'real', 'money', 'smallmoney', 'bit']
      .includes(t)
  ) {
    return 'number';
  }
  if (['date', 'datetime', 'datetime2', 'smalldatetime', 'datetimeoffset', 'time'].includes(t)) {
    return 'date';
  }
  return 'string';
}
