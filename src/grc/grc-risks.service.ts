import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BaseDashboardService, DashboardConfig } from '../shared/base-dashboard.service';
import { DashboardConfigService } from '../shared/dashboard-config.service';
import { UserFunctionAccessService, UserFunctionAccess } from '../shared/user-function-access.service';
import { sortRowsByFunctionAsc } from '../shared/order-by-function';

const DASHBOARD_PREVIEW_LIMIT = 10;

@Injectable()
export class GrcRisksService extends BaseDashboardService {
  constructor(
    protected readonly databaseService: DatabaseService,
    userFunctionAccess: UserFunctionAccessService,
  ) {
    super(databaseService, userFunctionAccess);
  }

  getConfig(): DashboardConfig {
    return DashboardConfigService.getRisksConfig();
  }

  /** Subquery for risk function name(s) - Risks have many-to-many with Functions via RiskFunctions */
  private riskFunctionNameSubquery(): string {
    return `(SELECT STUFF((SELECT ', ' + f_agg.name FROM dbo.[RiskFunctions] rf_agg INNER JOIN dbo.[Functions] f_agg ON f_agg.id = rf_agg.function_id AND f_agg.isDeleted = 0 AND f_agg.deletedAt IS NULL WHERE rf_agg.risk_id = r.id AND rf_agg.deletedAt IS NULL ORDER BY f_agg.name FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, ''))`;
  }

  private riskFunctionNamesCte(): string {
    return `
      RiskFunctionNames AS (
        SELECT
          rf.risk_id,
          STUFF((
            SELECT ', ' + f2.name
            FROM dbo.[RiskFunctions] rf2
            INNER JOIN dbo.[Functions] f2
              ON f2.id = rf2.function_id
             AND f2.isDeleted = 0
             AND f2.deletedAt IS NULL
            WHERE rf2.risk_id = rf.risk_id
              AND rf2.deletedAt IS NULL
            ORDER BY f2.name
            FOR XML PATH(''), TYPE
          ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS function_name
        FROM dbo.[RiskFunctions] rf
        WHERE rf.deletedAt IS NULL
        GROUP BY rf.risk_id
      )
    `;
  }

  private controlFunctionNamesCte(): string {
    return `
      ControlFunctionNames AS (
        SELECT
          cf.control_id,
          STUFF((
            SELECT ', ' + f2.name
            FROM dbo.[ControlFunctions] cf2
            INNER JOIN dbo.[Functions] f2
              ON f2.id = cf2.function_id
             AND f2.isDeleted = 0
             AND f2.deletedAt IS NULL
            WHERE cf2.control_id = cf.control_id
              AND cf2.deletedAt IS NULL
            ORDER BY f2.name
            FOR XML PATH(''), TYPE
          ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS function_name
        FROM dbo.[ControlFunctions] cf
        WHERE cf.deletedAt IS NULL
        GROUP BY cf.control_id
      )
    `;
  }

  private async runQueryBatches<T>(tasks: Array<() => Promise<T>>, batchSize = 4): Promise<T[]> {
    const results: T[] = [];
    for (let index = 0; index < tasks.length; index += batchSize) {
      const batch = tasks.slice(index, index + batchSize);
      results.push(...await Promise.all(batch.map((task) => task())));
    }
    return results;
  }

  async getRisksDashboard(
    user: any,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    section?: 'cards' | 'charts' | 'tables',
  ) {
    // console.log('[getRisksDashboard] Received parameters:', { startDate, endDate, functionId, userId: user.id, groupName: user.groupName });
    
    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    // Date filter for "deleted in quarter" (filter by deletedAt)
    const dateFilterDeleted = this.buildDateFilter(startDate, endDate, 'r.deletedAt');
    // console.log('[getRisksDashboard] Date filter:', dateFilter);
    
    // Get user function access (super_admin_ sees everything)
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    // console.log('[getRisksDashboard] User access:', { isSuperAdmin: access.isSuperAdmin, functionIds: access.functionIds });
    
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);
    // console.log('[getRisksDashboard] Function filter:', functionFilter);

    try {
      // Build residual date filter only when user has applied a date range; otherwise get all data (no filter)
      let residualDateFilter = '';
      const validStart = startDate && /^\d{4}-\d{2}-\d{2}/.test(String(startDate).trim());
      const validEnd = endDate && /^\d{4}-\d{2}-\d{2}/.test(String(endDate).trim());
      if (validStart && validEnd) {
        const start = String(startDate).trim().slice(0, 10);
        const end = String(endDate).trim().slice(0, 10);
        residualDateFilter = `AND rr.createdAt >= '${start}' AND rr.createdAt <= '${end} 23:59:59'`;
      }
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const queryOrFallback = async <T>(label: string, query: string, fallback: T): Promise<T> => {
        try {
          return await this.databaseService.query(query) as T;
        } catch (error) {
          console.error(`Error fetching ${label}:`, error);
          return fallback;
        }
      };

      const includeCards = !section || section === 'cards';
      const includeCharts = !section || section === 'charts';
      const includeTables = !section || section === 'tables';
      const applyTablePreview = section === 'tables';

      const totalRisksTask = () => queryOrFallback<any[]>('totalRisks', `
          SELECT COUNT(*) as total
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
        `, []);
      const allRisksTask = () => queryOrFallback<any[]>('allRisks', `
          SELECT
            r.name AS [RiskName],
            r.description AS [RiskDesc],
            'Event' AS [RiskEventName],
            r.approve AS [RiskApprove],
            r.inherent_value AS [InherentValue],
            r.inherent_frequency AS [InherentFrequency],
            r.inherent_financial_value AS [InherentFinancialValue],
            ${this.riskFunctionNameSubquery()} AS function_name
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0
            ${functionFilter}
          ORDER BY r.createdAt DESC
        ${applyTablePreview ? `OFFSET 0 ROWS FETCH NEXT ${DASHBOARD_PREVIEW_LIMIT} ROWS ONLY` : ''}
        `, []);
      const risksByEventTypeTask = () => queryOrFallback<any[]>('risksByEventType', `
          SELECT
            ISNULL(et.name, 'Unknown') as name,
            COUNT(r.id) as value
          FROM dbo.[Risks] r
          LEFT JOIN dbo.[EventTypes] et ON r.event = et.id
          WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
          GROUP BY et.name
        `, []);
      const risksByCategoryTask = () => queryOrFallback<any[]>('risksByCategory', `
          SELECT
            ISNULL(c.name, 'Uncategorized') as name,
            COUNT(r.id) as value
          FROM dbo.[Risks] r
          LEFT JOIN dbo.RiskCategories rc ON r.id = rc.risk_id AND rc.isDeleted = 0
          LEFT JOIN dbo.Categories c ON rc.category_id = c.id AND c.isDeleted = 0
          WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
          GROUP BY c.name
          ORDER BY value DESC
        `, []);
      const levelsAggTask = () => queryOrFallback<any[]>('levelsAgg', `
          SELECT
            SUM(CASE WHEN r.inherent_value = 'High' THEN 1 ELSE 0 END) as High,
            SUM(CASE WHEN r.inherent_value = 'Medium' THEN 1 ELSE 0 END) as Medium,
            SUM(CASE WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END) as Low
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
        `, []);
      const riskReductionCountTask = () => queryOrFallback<any[]>('riskReductionCount', `
          SELECT COUNT(*) as total
          FROM dbo.[Risks] r
          INNER JOIN dbo.[Residualrisks] rr ON r.id = rr.riskId
          WHERE r.isDeleted = 0
            AND rr.isDeleted = 0
            ${residualDateFilter}
            ${functionFilter}
            AND (
              (CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END)
              - (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END)
            ) > 0
        `, []);
      const newRisksTask = () => queryOrFallback<any[]>('newRisks', `
          SELECT
            r.code as code,
            r.name as title,
            r.inherent_value,
            r.createdAt as created_at
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0 AND DATEDIFF(month, r.createdAt, GETDATE()) = 0 ${dateFilter} ${functionFilter}
          ORDER BY r.createdAt DESC
        `, []);
      const riskApprovalStatusDistributionTask = () => queryOrFallback<any[]>('riskApprovalStatusDistribution', `
          SELECT
            CASE
              WHEN rr.preparerResidualStatus = 'sent' AND rr.acceptanceResidualStatus = 'approved' THEN 'Approved'
              ELSE 'Not Approved'
            END AS approve,
            COUNT(DISTINCT r.id) AS count
          FROM dbo.[Risks] r
          INNER JOIN dbo.[ResidualRisks] rr ON r.id = rr.riskId AND rr.isDeleted = 0
          WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
          GROUP BY
            CASE
              WHEN rr.preparerResidualStatus = 'sent' AND rr.acceptanceResidualStatus = 'approved' THEN 'Approved'
              ELSE 'Not Approved'
            END
          ORDER BY approve ASC
        `, []);
      const riskDistributionByFinancialImpactTask = () => queryOrFallback<any[]>('riskDistributionByFinancialImpact', `
          SELECT
            CASE
              WHEN rr.residual_financial_value <= 2 THEN 'Low'
              WHEN rr.residual_financial_value = 3 THEN 'Medium'
              WHEN rr.residual_financial_value >= 4 THEN 'High'
              ELSE 'Unknown'
            END AS [Financial Status],
            COUNT(DISTINCT r.id) AS count
          FROM dbo.[Risks] r
          INNER JOIN dbo.[ResidualRisks] rr ON rr.riskId = r.id AND rr.isDeleted = 0
          WHERE r.isDeleted = 0 ${residualDateFilter} ${functionFilter}
          GROUP BY
            CASE
              WHEN rr.residual_financial_value <= 2 THEN 'Low'
              WHEN rr.residual_financial_value = 3 THEN 'Medium'
              WHEN rr.residual_financial_value >= 4 THEN 'High'
              ELSE 'Unknown'
            END
          ORDER BY [Financial Status] ASC
        `, []);
      const quarterlyRiskCreationTrendsTask = () => queryOrFallback<any[]>('quarterlyRiskCreationTrends', `
          SELECT
            creation_quarter AS creation_quarter,
            SUM(risk_count) AS [SUM(risk_count)]
          FROM (
            SELECT
              CONCAT(YEAR(r.createdAt), '-Q', DATEPART(QUARTER, r.createdAt)) AS creation_quarter,
              COUNT(r.id) AS risk_count
            FROM dbo.[Risks] r
            WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
            GROUP BY YEAR(r.createdAt), DATEPART(QUARTER, r.createdAt)
          ) AS virtual_table
          GROUP BY creation_quarter
          ORDER BY creation_quarter
        `, []);
      const createdDeletedRisksPerQuarterTask = () => queryOrFallback<any[]>('createdDeletedRisksPerQuarter', `
          WITH AllQuarters AS (
            SELECT 1 AS quarter_num, 'Q1 ${currentYear}' AS quarter_label
            UNION ALL SELECT 2, 'Q2 ${currentYear}'
            UNION ALL SELECT 3, 'Q3 ${currentYear}'
            UNION ALL SELECT 4, 'Q4 ${currentYear}'
          ),
          CreatedInQuarter AS (
            SELECT
              DATEPART(quarter, r.createdAt) AS quarter_num,
              COUNT(*) AS created
            FROM dbo.[Risks] r
            WHERE YEAR(r.createdAt) = ${currentYear} ${dateFilter} ${functionFilter}
            GROUP BY DATEPART(quarter, r.createdAt)
          ),
          DeletedInQuarter AS (
            SELECT
              DATEPART(quarter, r.deletedAt) AS quarter_num,
              COUNT(*) AS deleted
            FROM dbo.[Risks] r
            WHERE r.deletedAt IS NOT NULL
              AND YEAR(r.deletedAt) = ${currentYear} ${dateFilterDeleted} ${functionFilter}
            GROUP BY DATEPART(quarter, r.deletedAt)
          )
          SELECT
            q.quarter_label AS name,
            CAST(ISNULL(c.created, 0) AS INT) AS created,
            CAST(ISNULL(d.deleted, 0) AS INT) AS deleted
          FROM AllQuarters q
          LEFT JOIN CreatedInQuarter c ON q.quarter_num = c.quarter_num
          LEFT JOIN DeletedInQuarter d ON q.quarter_num = d.quarter_num
          ORDER BY q.quarter_num ASC
        `, []);
      const risksPerDepartmentTask = () => queryOrFallback<any[]>('risksPerDepartment', `
          SELECT
            f.name AS [Functions__name],
            COUNT(*) AS [count]
          FROM dbo.[Risks] r
          LEFT JOIN dbo.[RiskFunctions] rf ON r.id = rf.risk_id
          LEFT JOIN dbo.[Functions] f ON rf.function_id = f.id
          WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
          GROUP BY f.name
          ORDER BY [count] DESC, f.name ASC
          ${applyTablePreview ? `OFFSET 0 ROWS FETCH NEXT ${DASHBOARD_PREVIEW_LIMIT} ROWS ONLY` : ''}
        `, []);

      let totalRisksResult: any[] = [];
      let allRisks: any[] = [];
      let risksByEventType: any[] = [];
      let risksByCategory: any[] = [];
      let levelsAgg: any[] = [];
      let riskReductionCountResult: any[] = [];
      let newRisks: any[] = [];
      let riskApprovalStatusDistribution: any[] = [];
      let riskDistributionByFinancialImpact: any[] = [];
      let quarterlyRiskCreationTrends: any[] = [];
      let createdDeletedRisksPerQuarter: any[] = [];
      let risksPerDepartment: any[] = [];

      if (includeCards) {
        [
          totalRisksResult,
          levelsAgg,
          riskReductionCountResult,
          newRisks,
        ] = await this.runQueryBatches<any[]>([
          totalRisksTask,
          levelsAggTask,
          riskReductionCountTask,
          newRisksTask,
        ]);
      }

      if (includeCharts) {
        [
          risksByEventType,
          risksByCategory,
          riskApprovalStatusDistribution,
          riskDistributionByFinancialImpact,
          quarterlyRiskCreationTrends,
          createdDeletedRisksPerQuarter,
        ] = await this.runQueryBatches<any[]>([
          risksByEventTypeTask,
          risksByCategoryTask,
          riskApprovalStatusDistributionTask,
          riskDistributionByFinancialImpactTask,
          quarterlyRiskCreationTrendsTask,
          createdDeletedRisksPerQuarterTask,
        ]);
      }

      if (includeTables) {
        [allRisks, risksPerDepartment] = await this.runQueryBatches<any[]>([
          allRisksTask,
          risksPerDepartmentTask,
        ]);
      }

      const totalRisks = totalRisksResult[0]?.total || 0;
      const riskLevels = [
        { level: 'High', count: levelsAgg[0]?.High || 0 },
        { level: 'Medium', count: levelsAgg[0]?.Medium || 0 },
        { level: 'Low', count: levelsAgg[0]?.Low || 0 },
      ];
      const riskReductionCount = riskReductionCountResult[0]?.total || 0;

      if (section === 'cards') {
        return {
          totalRisks,
          riskLevels,
          riskReductionCount,
          newRisks,
        };
      }

      if (section === 'charts') {
        return {
          risksByCategory,
          risksByEventType,
          createdDeletedRisksPerQuarter,
          quarterlyRiskCreationTrends,
          riskApprovalStatusDistribution,
          riskDistributionByFinancialImpact,
        };
      }

      let risksPerBusinessProcess: any[] = [];
      let inherentResidualRiskComparison: any[] = [];
      let highResidualRiskOverview: any[] = [];
      let risksAndControlsCount: any[] = [];
      let controlsAndRiskCount: any[] = [];
      let risksDetails: any[] = [];

      const risksPerBusinessProcessTask = () => queryOrFallback<any[]>('risksPerBusinessProcess', `
          SELECT p.name AS process_name, COUNT(rp.risk_id) AS risk_count
          FROM dbo.[RiskProcesses] rp
          JOIN dbo.[Processes] p ON rp.process_id = p.id
          JOIN dbo.[Risks] r ON rp.risk_id = r.id
          WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
          GROUP BY p.name ORDER BY risk_count DESC, p.name ASC
          ${applyTablePreview ? `OFFSET 0 ROWS FETCH NEXT ${DASHBOARD_PREVIEW_LIMIT} ROWS ONLY` : ''}
        `, []);
      const inherentResidualRiskComparisonTask = () => queryOrFallback<any[]>('inherentResidualRiskComparison', `
          WITH ${this.riskFunctionNamesCte()}
          SELECT r.name AS [Risk Name], ISNULL(rfn.function_name, 'Unknown') AS [Department Name], r.inherent_value AS [Inherent Value], rr.residual_value AS [Residual Value]
          FROM dbo.[Risks] r
          JOIN dbo.[ResidualRisks] rr ON rr.riskId = r.id AND rr.isDeleted = 0
          LEFT JOIN RiskFunctionNames rfn ON rfn.risk_id = r.id
          WHERE r.isDeleted = 0 AND rr.isDeleted = 0 ${dateFilter} ${functionFilter}
          ORDER BY r.createdAt DESC
          ${applyTablePreview ? `OFFSET 0 ROWS FETCH NEXT ${DASHBOARD_PREVIEW_LIMIT} ROWS ONLY` : ''}
        `, []);
      const highResidualRiskOverviewTask = () => queryOrFallback<any[]>('highResidualRiskOverview', `
          WITH ${this.riskFunctionNamesCte()}
          SELECT risk_name AS [Risk Name], function_name AS [function_name], residual_level AS [Residual Level], inherent_value AS [Inherent Value],
            inherent_frequency_label AS [Inherent Frequency], inherent_financial_label AS [Inherent Financial],
            residual_frequency_label AS [Residual Frequency], residual_financial_label AS [Residual Financial],
            quarter AS [Quarter], year AS [Year]
          FROM (
            SELECT r.name AS risk_name, ISNULL(rfn.function_name, 'Unknown') AS function_name, rr.residual_value AS residual_level, r.inherent_value AS inherent_value,
              r.inherent_frequency, r.inherent_financial_value, rr.residual_frequency, rr.residual_financial_value,
              rr.quarter, rr.year,
              CASE WHEN r.inherent_frequency = 1 THEN 'Once in Three Years' WHEN r.inherent_frequency = 2 THEN 'Annually' WHEN r.inherent_frequency = 3 THEN 'Half Yearly' WHEN r.inherent_frequency = 4 THEN 'Quarterly' WHEN r.inherent_frequency = 5 THEN 'Monthly' ELSE 'Unknown' END AS inherent_frequency_label,
              CASE WHEN r.inherent_financial_value = 1 THEN '0 - 10,000' WHEN r.inherent_financial_value = 2 THEN '10,000 - 100,000' WHEN r.inherent_financial_value = 3 THEN '100,000 - 1,000,000' WHEN r.inherent_financial_value = 4 THEN '1,000,000 - 10,000,000' WHEN r.inherent_financial_value = 5 THEN '> 10,000,000' ELSE 'Unknown' END AS inherent_financial_label,
              CASE WHEN rr.residual_frequency = 1 THEN 'Once in Three Years' WHEN rr.residual_frequency = 2 THEN 'Annually' WHEN rr.residual_frequency = 3 THEN 'Half Yearly' WHEN rr.residual_frequency = 4 THEN 'Quarterly' WHEN rr.residual_frequency = 5 THEN 'Monthly' ELSE 'Unknown' END AS residual_frequency_label,
              CASE WHEN rr.residual_financial_value = 1 THEN '0 - 10,000' WHEN rr.residual_financial_value = 2 THEN '10,000 - 100,000' WHEN rr.residual_financial_value = 3 THEN '100,000 - 1,000,000' WHEN rr.residual_financial_value = 4 THEN '1,000,000 - 10,000,000' WHEN rr.residual_financial_value = 5 THEN '> 10,000,000' ELSE 'Unknown' END AS residual_financial_label
            FROM dbo.[ResidualRisks] rr
            JOIN dbo.[Risks] r ON rr.riskId = r.id
            LEFT JOIN RiskFunctionNames rfn ON rfn.risk_id = r.id
            WHERE r.isDeleted = 0 AND rr.residual_value = 'High' ${dateFilter} ${functionFilter}
          ) AS vt
          ORDER BY year DESC, quarter DESC, inherent_value DESC
          ${applyTablePreview ? `OFFSET 0 ROWS FETCH NEXT ${DASHBOARD_PREVIEW_LIMIT} ROWS ONLY` : ''}
        `, []);
      const risksAndControlsCountTask = () => queryOrFallback<any[]>('risksAndControlsCount', `
          WITH ${this.riskFunctionNamesCte()}
          SELECT r.name AS risk_name, ISNULL(rfn.function_name, 'Unknown') AS function_name, COUNT(DISTINCT rc.control_id) AS control_count
          FROM dbo.[Risks] r
          LEFT JOIN RiskFunctionNames rfn ON rfn.risk_id = r.id
          LEFT JOIN dbo.[RiskControls] rc ON r.id = rc.risk_id
          LEFT JOIN dbo.[Controls] c ON rc.control_id = c.id
          WHERE r.isDeleted = 0 AND r.deletedAt IS NULL AND c.isDeleted = 0 AND c.deletedAt IS NULL ${dateFilter} ${functionFilter}
          GROUP BY r.id, r.name, rfn.function_name ORDER BY control_count DESC, r.name
          ${applyTablePreview ? `OFFSET 0 ROWS FETCH NEXT ${DASHBOARD_PREVIEW_LIMIT} ROWS ONLY` : ''}
        `, []);
      const controlsAndRiskCountTask = () => queryOrFallback<any[]>('controlsAndRiskCount', `
          WITH ${this.controlFunctionNamesCte()}
          SELECT c.name AS [Controls__name], ISNULL(cfn.function_name, 'Unknown') AS function_name, COUNT(DISTINCT r.id) AS [count]
          FROM dbo.[Controls] c
          LEFT JOIN ControlFunctionNames cfn ON cfn.control_id = c.id
          INNER JOIN dbo.[RiskControls] rc ON c.id = rc.control_id
          INNER JOIN dbo.[Risks] r ON rc.risk_id = r.id AND r.isDeleted = 0 AND r.deletedAt IS NULL ${dateFilter} ${functionFilter}
          WHERE c.isDeleted = 0 AND c.deletedAt IS NULL
          GROUP BY c.id, c.name, cfn.function_name ORDER BY [count] DESC, c.name ASC
          ${applyTablePreview ? `OFFSET 0 ROWS FETCH NEXT ${DASHBOARD_PREVIEW_LIMIT} ROWS ONLY` : ''}
        `, []);
      const risksDetailsTask = () => queryOrFallback<any[]>('risksDetails', `
          WITH ${this.riskFunctionNamesCte()}
          SELECT r.name AS [RiskName], r.description AS [RiskDesc], et.name AS [RiskEventName], r.approve AS [RiskApprove],
            r.inherent_value AS [InherentValue], r.residual_value AS [ResidualValue], r.inherent_frequency AS [InherentFrequency],
            r.inherent_financial_value AS [InherentFinancialValue], rr.residual_value AS [RiskResidualValue], rr.quarter AS [ResidualQuarter], rr.year AS [ResidualYear],
            ISNULL(rfn.function_name, 'Unknown') AS [function_name]
          FROM dbo.[Risks] r
          INNER JOIN dbo.[ResidualRisks] rr ON rr.riskId = r.id AND rr.isDeleted = 0
          INNER JOIN dbo.[EventTypes] et ON et.id = r.event
          LEFT JOIN RiskFunctionNames rfn ON rfn.risk_id = r.id
          WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
          ORDER BY r.createdAt DESC
          ${applyTablePreview ? `OFFSET 0 ROWS FETCH NEXT ${DASHBOARD_PREVIEW_LIMIT} ROWS ONLY` : ''}
        `, []);

      if (includeTables) {
        [
          risksPerBusinessProcess,
          inherentResidualRiskComparison,
          highResidualRiskOverview,
          risksAndControlsCount,
          controlsAndRiskCount,
          risksDetails,
        ] = await this.runQueryBatches<any[]>([
          risksPerBusinessProcessTask,
          inherentResidualRiskComparisonTask,
          highResidualRiskOverviewTask,
          risksAndControlsCountTask,
          controlsAndRiskCountTask,
          risksDetailsTask,
        ]);
      }

      if (section === 'tables') {
        return {
          risksPerDepartment,
          risksPerBusinessProcess,
          inherentResidualRiskComparison,
          highResidualRiskOverview,
          risksAndControlsCount,
          controlsAndRiskCount,
          allRisks,
        };
      }

      return {
        totalRisks,
        allRisks,
        risksByCategory,
        risksByEventType,
        riskLevels,
        riskReductionCount,
        newRisks,
        // New data
        risksPerDepartment,
        risksPerBusinessProcess,
        createdDeletedRisksPerQuarter,
        quarterlyRiskCreationTrends,
        inherentResidualRiskComparison,
        riskApprovalStatusDistribution,
        highResidualRiskOverview,
        riskDistributionByFinancialImpact,
        risksAndControlsCount,
        controlsAndRiskCount,
        risksDetails
      };
    } catch (error) {
      console.error('Error fetching risks dashboard data:', error);
      throw error;
    }
  }

  async getRisksDashboardTablePage(
    user: any,
    tableId: string,
    page = 1,
    limit = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    if (tableId === 'risksPerDepartment') {
      return this.getRisksPerDepartmentTablePage(user, page, limit, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'risksPerBusinessProcess') {
      return this.getRisksPerBusinessProcessTablePage(user, page, limit, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'allRisks') {
      return this.getAllRisksTablePage(user, page, limit, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'risksAndControlsCount') {
      return this.getRisksAndControlsCountTablePage(user, page, limit, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'controlsAndRiskCount') {
      return this.getControlsAndRiskCountTablePage(user, page, limit, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'highResidualRiskOverview') {
      return this.getHighResidualRiskOverviewTablePage(user, page, limit, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }

    const tablesPayload = await this.getRisksDashboard(
      user,
      startDate,
      endDate,
      selectedFunctionIds,
      'tables',
    ) as Record<string, any[]>;

    const tableRows = {
      risksPerDepartment: tablesPayload.risksPerDepartment || [],
      risksPerBusinessProcess: tablesPayload.risksPerBusinessProcess || [],
      highResidualRiskOverview: tablesPayload.highResidualRiskOverview || [],
      risksAndControlsCount: tablesPayload.risksAndControlsCount || [],
      controlsAndRiskCount: tablesPayload.controlsAndRiskCount || [],
      allRisks: tablesPayload.allRisks || [],
    }[tableId];

    if (!tableRows) {
      throw new Error(`Table ${tableId} not found`);
    }

    const sortedRows = orderByFunctionAsc
      ? sortRowsByFunctionAsc(tableRows as Record<string, unknown>[])
      : tableRows;
    return this.paginateRows(sortedRows, page, limit);
  }

  private buildPaginationMeta(page: number, limit: number, total: number) {
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safeLimit = Math.max(1, Math.floor(Number(limit)) || 10);
    const totalPages = Math.ceil(total / safeLimit);
    return {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    };
  }

  private async getRisksPerDepartmentTablePage(
    user: any,
    page = 1,
    limit = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;

    const baseQuery = `
      SELECT
        ISNULL(f.name, 'Unknown') AS [Functions__name],
        COUNT(DISTINCT r.id) AS [count],
        MAX(r.createdAt) AS created_at
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[RiskFunctions] rf
        ON rf.risk_id = r.id
       AND rf.deletedAt IS NULL
      LEFT JOIN dbo.[Functions] f
        ON f.id = rf.function_id
       AND f.isDeleted = 0
       AND f.deletedAt IS NULL
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
      GROUP BY ISNULL(f.name, 'Unknown')
    `;

    const countQuery = `SELECT COUNT(*) AS total FROM (${baseQuery}) AS risk_groups`;
    const dataQuery = `
      ${baseQuery}
      ORDER BY ${orderByFunctionAsc ? '[Functions__name] ASC, created_at DESC' : '[count] DESC, [Functions__name] ASC'}
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;

    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery, [offset, limitInt]),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: (rows || []).map((item: any) => ({
        Functions__name: item.Functions__name || 'Unknown',
        count: Number(item.count ?? 0),
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getRisksPerBusinessProcessTablePage(
    user: any,
    page = 1,
    limit = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;

    const baseQuery = `
      SELECT
        p.name AS process_name,
        COUNT(DISTINCT r.id) AS risk_count,
        MAX(r.createdAt) AS created_at
      FROM dbo.[RiskProcesses] rp
      INNER JOIN dbo.[Processes] p
        ON p.id = rp.process_id
      INNER JOIN dbo.[Risks] r
        ON r.id = rp.risk_id
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
      GROUP BY p.name
    `;

    const countQuery = `SELECT COUNT(*) AS total FROM (${baseQuery}) AS process_groups`;
    const dataQuery = `
      ${baseQuery}
      ORDER BY ${orderByFunctionAsc ? 'process_name ASC, created_at DESC' : 'risk_count DESC, process_name ASC'}
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;

    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery, [offset, limitInt]),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: (rows || []).map((item: any) => ({
        process_name: item.process_name || 'Unknown',
        risk_count: Number(item.risk_count ?? 0),
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getAllRisksTablePage(
    user: any,
    page = 1,
    limit = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
    `;

    const dataQuery = `
      WITH ${this.riskFunctionNamesCte()}
      SELECT
        r.name AS [RiskName],
        r.description AS [RiskDesc],
        'Event' AS [RiskEventName],
        r.approve AS [RiskApprove],
        r.inherent_value AS [InherentValue],
        r.inherent_frequency AS [InherentFrequency],
        r.inherent_financial_value AS [InherentFinancialValue],
        ISNULL(rfn.function_name, 'Unknown') AS function_name,
        r.createdAt AS created_at
      FROM dbo.[Risks] r
      LEFT JOIN RiskFunctionNames rfn ON rfn.risk_id = r.id
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, created_at DESC' : 'created_at DESC'}
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;

    const [data, count] = await Promise.all([
      this.databaseService.query(dataQuery, [offset, limitInt]),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(count?.[0]?.total ?? 0);
    return {
      data: (data || []).map((row: any) => ({
        RiskName: row.RiskName,
        RiskDesc: row.RiskDesc,
        RiskEventName: row.RiskEventName,
        RiskApprove: row.RiskApprove,
        InherentValue: row.InherentValue,
        InherentFrequency: row.InherentFrequency,
        InherentFinancialValue: row.InherentFinancialValue,
        function_name: row.function_name,
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getRisksAndControlsCountTablePage(
    user: any,
    page = 1,
    limit = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;

    const countQuery = `
      WITH ${this.riskFunctionNamesCte()}
      SELECT COUNT(*) AS total
      FROM (
        SELECT r.id
        FROM dbo.[Risks] r
        LEFT JOIN RiskFunctionNames rfn ON rfn.risk_id = r.id
        LEFT JOIN dbo.[RiskControls] rc ON r.id = rc.risk_id
        LEFT JOIN dbo.[Controls] c ON rc.control_id = c.id
        WHERE r.isDeleted = 0 AND r.deletedAt IS NULL AND c.isDeleted = 0 AND c.deletedAt IS NULL ${dateFilter} ${functionFilter}
        GROUP BY r.id
      ) AS dashboard_count
    `;

    const dataQuery = `
      WITH ${this.riskFunctionNamesCte()}
      SELECT
        r.name AS risk_name,
        ISNULL(rfn.function_name, 'Unknown') AS function_name,
        COUNT(DISTINCT rc.control_id) AS control_count,
        MAX(r.createdAt) AS created_at
      FROM dbo.[Risks] r
      LEFT JOIN RiskFunctionNames rfn ON rfn.risk_id = r.id
      LEFT JOIN dbo.[RiskControls] rc ON r.id = rc.risk_id
      LEFT JOIN dbo.[Controls] c ON rc.control_id = c.id
      WHERE r.isDeleted = 0 AND r.deletedAt IS NULL AND c.isDeleted = 0 AND c.deletedAt IS NULL ${dateFilter} ${functionFilter}
      GROUP BY r.id, r.name, rfn.function_name
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, created_at DESC' : 'created_at DESC'}
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;

    const [data, count] = await Promise.all([
      this.databaseService.query(dataQuery, [offset, limitInt]),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(count?.[0]?.total ?? 0);
    return {
      data: (data || []).map((row: any) => ({
        risk_name: row.risk_name,
        function_name: row.function_name,
        control_count: row.control_count,
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getControlsAndRiskCountTablePage(
    user: any,
    page = 1,
    limit = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;

    const countQuery = `
      WITH ${this.controlFunctionNamesCte()}
      SELECT COUNT(*) AS total
      FROM (
        SELECT c.id
        FROM dbo.[Controls] c
        LEFT JOIN ControlFunctionNames cfn ON cfn.control_id = c.id
        INNER JOIN dbo.[RiskControls] rc ON c.id = rc.control_id
        INNER JOIN dbo.[Risks] r ON rc.risk_id = r.id AND r.isDeleted = 0 AND r.deletedAt IS NULL ${dateFilter} ${functionFilter}
        WHERE c.isDeleted = 0 AND c.deletedAt IS NULL
        GROUP BY c.id
      ) AS dashboard_count
    `;

    const dataQuery = `
      WITH ${this.controlFunctionNamesCte()}
      SELECT
        c.name AS [Controls__name],
        ISNULL(cfn.function_name, 'Unknown') AS function_name,
        COUNT(DISTINCT r.id) AS [count],
        MAX(c.createdAt) AS created_at
      FROM dbo.[Controls] c
      LEFT JOIN ControlFunctionNames cfn ON cfn.control_id = c.id
      INNER JOIN dbo.[RiskControls] rc ON c.id = rc.control_id
      INNER JOIN dbo.[Risks] r ON rc.risk_id = r.id AND r.isDeleted = 0 AND r.deletedAt IS NULL ${dateFilter} ${functionFilter}
      WHERE c.isDeleted = 0 AND c.deletedAt IS NULL
      GROUP BY c.id, c.name, cfn.function_name
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, created_at DESC' : 'created_at DESC'}
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;

    const [data, count] = await Promise.all([
      this.databaseService.query(dataQuery, [offset, limitInt]),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(count?.[0]?.total ?? 0);
    return {
      data: (data || []).map((row: any) => ({
        Controls__name: row.Controls__name,
        function_name: row.function_name,
        count: row.count,
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getHighResidualRiskOverviewTablePage(
    user: any,
    page = 1,
    limit = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dbo.[ResidualRisks] rr
      JOIN dbo.[Risks] r ON rr.riskId = r.id
      WHERE r.isDeleted = 0 AND rr.isDeleted = 0 AND rr.residual_value = 'High' ${dateFilter} ${functionFilter}
    `;

    const dataQuery = `
      WITH ${this.riskFunctionNamesCte()}
      SELECT
        r.name AS [Risk Name],
        ISNULL(rfn.function_name, 'Unknown') AS [function_name],
        rr.residual_value AS [Residual Level],
        r.inherent_value AS [Inherent Value],
        CASE WHEN r.inherent_frequency = 1 THEN 'Once in Three Years' WHEN r.inherent_frequency = 2 THEN 'Annually' WHEN r.inherent_frequency = 3 THEN 'Half Yearly' WHEN r.inherent_frequency = 4 THEN 'Quarterly' WHEN r.inherent_frequency = 5 THEN 'Monthly' ELSE 'Unknown' END AS [Inherent Frequency],
        CASE WHEN r.inherent_financial_value = 1 THEN '0 - 10,000' WHEN r.inherent_financial_value = 2 THEN '10,000 - 100,000' WHEN r.inherent_financial_value = 3 THEN '100,000 - 1,000,000' WHEN r.inherent_financial_value = 4 THEN '1,000,000 - 10,000,000' WHEN r.inherent_financial_value = 5 THEN '> 10,000,000' ELSE 'Unknown' END AS [Inherent Financial],
        CASE WHEN rr.residual_frequency = 1 THEN 'Once in Three Years' WHEN rr.residual_frequency = 2 THEN 'Annually' WHEN rr.residual_frequency = 3 THEN 'Half Yearly' WHEN rr.residual_frequency = 4 THEN 'Quarterly' WHEN rr.residual_frequency = 5 THEN 'Monthly' ELSE 'Unknown' END AS [Residual Frequency],
        CASE WHEN rr.residual_financial_value = 1 THEN '0 - 10,000' WHEN rr.residual_financial_value = 2 THEN '10,000 - 100,000' WHEN rr.residual_financial_value = 3 THEN '100,000 - 1,000,000' WHEN rr.residual_financial_value = 4 THEN '1,000,000 - 10,000,000' WHEN rr.residual_financial_value = 5 THEN '> 10,000,000' ELSE 'Unknown' END AS [Residual Financial],
        rr.quarter AS [Quarter],
        rr.year AS [Year],
        r.createdAt AS created_at
      FROM dbo.[ResidualRisks] rr
      JOIN dbo.[Risks] r ON rr.riskId = r.id
      LEFT JOIN RiskFunctionNames rfn ON rfn.risk_id = r.id
      WHERE r.isDeleted = 0 AND rr.isDeleted = 0 AND rr.residual_value = 'High' ${dateFilter} ${functionFilter}
      ORDER BY ${orderByFunctionAsc ? '[function_name] ASC, created_at DESC' : 'created_at DESC'}
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;

    const [data, count] = await Promise.all([
      this.databaseService.query(dataQuery, [offset, limitInt]),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(count?.[0]?.total ?? 0);
    return {
      data: (data || []).map((row: any) => ({
        'Risk Name': row['Risk Name'],
        function_name: row.function_name,
        'Residual Level': row['Residual Level'],
        'Inherent Value': row['Inherent Value'],
        'Inherent Frequency': row['Inherent Frequency'],
        'Inherent Financial': row['Inherent Financial'],
        'Residual Frequency': row['Residual Frequency'],
        'Residual Financial': row['Residual Financial'],
        Quarter: row.Quarter,
        Year: row.Year,
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  async getTotalRisks(user: any, page: number, limit: number, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    return this.getFilteredCardData(user, 'total', page, limit, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
  }

  // Risk-specific card data with function filtering
  async getFilteredCardData(user: any, cardType: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    // Normalize hyphenated card types from frontend (e.g., 'new-risks')
    if (cardType === 'new-risks') {
      cardType = 'newRisks';
    }
    const dateFilter = this.buildDateFilter(startDate, endDate, 'createdAt');
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    let dataQuery: string | null = null;
    let countQuery: string | null = null;

    switch (cardType) {
      case 'total': {
        dataQuery = `
      WITH ${this.riskFunctionNamesCte()}
      SELECT 
            r.code as code,
            r.name as risk_name,
            ISNULL(rfn.function_name, 'Unknown') AS function_name,
            CASE WHEN r.inherent_value IN ('High','Medium','Low') THEN r.inherent_value ELSE NULL END as inherent_level,
            CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
            r.createdAt as created_at
          FROM dbo.[Risks] r
          LEFT JOIN RiskFunctionNames rfn ON rfn.risk_id = r.id
          WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
          ORDER BY r.createdAt DESC
          OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`;
        countQuery = `SELECT COUNT(*) as total FROM dbo.[Risks] r WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}`;
        break;
      }
      case 'high': {
        dataQuery = `
          SELECT 
            r.code as code,
            r.name as risk_name,
            ${this.riskFunctionNameSubquery()} AS function_name,
            'High' as inherent_level,
            CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
            r.createdAt as created_at
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} AND r.inherent_value = 'High'
          ORDER BY r.createdAt DESC
          OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`;
        countQuery = `SELECT COUNT(*) as total FROM dbo.[Risks] r WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} AND r.inherent_value = 'High'`;
        break;
      }
      case 'medium': {
        dataQuery = `
          SELECT 
            r.code as code,
            r.name as risk_name,
            ${this.riskFunctionNameSubquery()} AS function_name,
            'Medium' as inherent_level,
            CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
            r.createdAt as created_at
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} AND r.inherent_value = 'Medium'
          ORDER BY r.createdAt DESC
          OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`;
        countQuery = `SELECT COUNT(*) as total FROM dbo.[Risks] r WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} AND r.inherent_value = 'Medium'`;
        break;
      }
      case 'low': {
        dataQuery = `
          SELECT 
            r.code as code,
            r.name as risk_name,
            ${this.riskFunctionNameSubquery()} AS function_name,
            'Low' as inherent_level,
            CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
            r.createdAt as created_at
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} AND r.inherent_value = 'Low'
          ORDER BY r.createdAt DESC
          OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`;
        countQuery = `SELECT COUNT(*) as total FROM dbo.[Risks] r WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} AND r.inherent_value = 'Low'`;
        break;
      }
      case 'reduction': {
        // Match dashboard: when no date range is selected, use no residual date filter so detail count matches card count (942)
        let residualDateFilter = '';
        const validStart2 = startDate && /^\d{4}-\d{2}-\d{2}/.test(String(startDate).trim());
        const validEnd2 = endDate && /^\d{4}-\d{2}-\d{2}/.test(String(endDate).trim());
        if (validStart2 && validEnd2) {
          const start2 = String(startDate).trim().slice(0, 10);
          const end2 = String(endDate).trim().slice(0, 10);
          residualDateFilter = `AND rr.createdAt >= '${start2}' AND rr.createdAt <= '${end2} 23:59:59'`;
        }

        dataQuery = `
          SELECT 
            r.code as code,
            r.name as risk_name,
            ${this.riskFunctionNameSubquery()} AS function_name,
            CASE WHEN r.inherent_value IN ('High','Medium','Low') THEN r.inherent_value ELSE NULL END as inherent_level,
            CASE WHEN rr.residual_value IN ('High','Medium','Low') THEN rr.residual_value ELSE NULL END as residual_level,
            ((CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END)
             - (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END)) as reduction,
            rr.createdAt as created_at
          FROM dbo.[Risks] r
          INNER JOIN dbo.[Residualrisks] rr ON r.id = rr.riskId
          WHERE r.isDeleted = 0 
            AND rr.isDeleted = 0
            ${residualDateFilter}
            ${functionFilter}
            AND (
              (CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END)
              - (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END)
            ) > 0
          ORDER BY reduction DESC
          OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`;
        countQuery = `SELECT COUNT(*) as total 
          FROM dbo.[Risks] r
          INNER JOIN dbo.[Residualrisks] rr ON r.id = rr.riskId
          WHERE r.isDeleted = 0 
            AND rr.isDeleted = 0
            ${residualDateFilter}
            ${functionFilter}
            AND (
              (CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END)
              - (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END)
            ) > 0`;
        break;
      }
      case 'newRisks': {
        dataQuery = `
          SELECT 
            r.code as code,
            r.name as risk_name,
            ${this.riskFunctionNameSubquery()} AS function_name,
            r.createdAt as created_at
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0 AND DATEDIFF(month, r.createdAt, GETDATE()) = 0 ${dateFilter} ${functionFilter}
          ORDER BY r.createdAt DESC
          OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`;
        countQuery = `SELECT COUNT(*) as total FROM dbo.[Risks] r WHERE r.isDeleted = 0 AND DATEDIFF(month, r.createdAt, GETDATE()) = 0 ${dateFilter} ${functionFilter}`;
        break;
      }
      default: {
        // Unknown card type - return empty data
        return {
          data: [],
          pagination: {
            page: pageInt,
            limit: limitInt,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }
    }

    const normalizedDataQuery = (dataQuery || '').trim().replace(/;$/, '');
    const finalDataQuery = orderByFunctionAsc
      ? `${this.stripTrailingOrderBy(normalizedDataQuery)} ORDER BY function_name ASC, created_at DESC OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`
      : normalizedDataQuery;

    const [data, count] = await Promise.all([
      this.databaseService.query(finalDataQuery, [offset, limitInt]),
      this.databaseService.query(countQuery!)
    ]);

    const total = count[0]?.total || count[0]?.count || 0;
    const totalPages = Math.ceil(total / limitInt);
    
    return {
      data,
      pagination: {
      page: pageInt,
        limit: limitInt,
        total,
        totalPages,
        hasNext: pageInt < totalPages,
        hasPrev: pageInt > 1
      }
    };
  }

  async getHighRisks(user: any, page: number, limit: number, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate);
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    const query = `
      SELECT 
        r.code as code,
        r.name as risk_name,
        ${this.riskFunctionNameSubquery()} AS function_name,
        'High' as inherent_level,
        CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
        r.createdAt as created_at
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} AND r.inherent_value = 'High'
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, created_at DESC' : 'r.createdAt DESC'}
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
      AND r.inherent_value = 'High'
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limitInt]),
      this.databaseService.query(countQuery)
    ]);
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limitInt);
    
    return {
      data,
      pagination: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages,
        hasNext: pageInt < totalPages,
        hasPrev: pageInt > 1
      }
    };
  }

  async getMediumRisks(user: any, page: number, limit: number, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate);
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    const query = `
      SELECT 
        r.code as code,
        r.name as risk_name,
        ${this.riskFunctionNameSubquery()} AS function_name,
        'Medium' as inherent_level,
        CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
        r.createdAt as created_at
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} AND r.inherent_value = 'Medium'
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, created_at DESC' : 'r.createdAt DESC'}
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
      AND r.inherent_value = 'Medium'
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limitInt]),
      this.databaseService.query(countQuery)
    ]);
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limitInt);
    
    return {
      data,
      pagination: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages,
        hasNext: pageInt < totalPages,
        hasPrev: pageInt > 1
      }
    };
  }

  async getLowRisks(user: any, page: number, limit: number, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate);
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    const query = `
      SELECT 
        r.code as code,
        r.name as risk_name,
        ${this.riskFunctionNameSubquery()} AS function_name,
        'Low' as inherent_level,
        CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
        r.createdAt as created_at
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} AND r.inherent_value = 'Low'
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, created_at DESC' : 'r.createdAt DESC'}
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
      AND r.inherent_value = 'Low'
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limitInt]),
      this.databaseService.query(countQuery)
    ]);
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limitInt);
    
    return {
      data,
      pagination: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages,
        hasNext: pageInt < totalPages,
        hasPrev: pageInt > 1
      }
    };
  }

  async getRiskReduction(user: any, page: number, limit: number, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    // Match dashboard count: use ResidualRisks join and same date logic (no residual date filter when no range)
    let residualDateFilter = '';
    const validStart = startDate && /^\d{4}-\d{2}-\d{2}/.test(String(startDate).trim());
    const validEnd = endDate && /^\d{4}-\d{2}-\d{2}/.test(String(endDate).trim());
    if (validStart && validEnd) {
      const start = String(startDate).trim().slice(0, 10);
      const end = String(endDate).trim().slice(0, 10);
      residualDateFilter = `AND rr.createdAt >= '${start}' AND rr.createdAt <= '${end} 23:59:59'`;
    }

    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);

    const query = `
      SELECT 
        r.id as risk_id,
        r.code as code,
        r.name as risk_name,
        ${this.riskFunctionNameSubquery()} AS function_name,
        r.inherent_value as inherent_level,
        rr.residual_value as residual_level,
        (CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END) as inherent_value,
        (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END) as residual_value,
        ((CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END)
         - (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END)) as reduction,
        rr.createdAt as created_at
      FROM dbo.[Risks] r
      INNER JOIN dbo.[Residualrisks] rr ON r.id = rr.riskId AND rr.isDeleted = 0
      WHERE r.isDeleted = 0
        ${residualDateFilter}
        ${functionFilter}
        AND (
          (CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END)
          - (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END)
        ) > 0
      ORDER BY ${orderByFunctionAsc
        ? 'function_name ASC, created_at DESC'
        : "(CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END) - (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END) DESC"}
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      INNER JOIN dbo.[Residualrisks] rr ON r.id = rr.riskId AND rr.isDeleted = 0
      WHERE r.isDeleted = 0
        ${residualDateFilter}
        ${functionFilter}
        AND (
          (CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END)
          - (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END)
        ) > 0
    `;

    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limitInt]),
      this.databaseService.query(countQuery)
    ]);
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limitInt);
    
    return {
      data,
      pagination: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages,
        hasNext: pageInt < totalPages,
        hasPrev: pageInt > 1
      }
    };
  }

  async getNewRisks(user: any, page: number, limit: number, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate);
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    const query = `
      SELECT 
        r.code as code,
        r.name as risk_name,
        ${this.riskFunctionNameSubquery()} AS function_name,
        r.createdAt as created_at
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 AND DATEDIFF(month, r.createdAt, GETDATE()) = 0 ${dateFilter} ${functionFilter}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, created_at DESC' : 'r.createdAt DESC'}
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 AND DATEDIFF(month, r.createdAt, GETDATE()) = 0 ${dateFilter} ${functionFilter}
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limitInt]),
      this.databaseService.query(countQuery)
    ]);
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limitInt);
    
    return {
      data,
      pagination: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages,
        hasNext: pageInt < totalPages,
        hasPrev: pageInt > 1
      }
    };
  }

  async exportRisks(user: any, format: 'pdf' | 'excel', startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate);
    const query = `
      SELECT 
        r.id,
        r.name as risk_name,
        r.inherent_value,
        r.residual_value,
        (CAST(r.inherent_value as INT) - CAST(r.residual_value as INT)) as reduction,
        r.createdAt as created_at
      FROM Risks r
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
      ORDER BY r.createdAt DESC
    `;
    const data = await this.databaseService.query(query);

    if (format === 'excel') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Risks Report');

      worksheet.columns = [
        { header: 'Risk ID', key: 'id', width: 36 },
        { header: 'Risk Name', key: 'risk_name', width: 40 },
        { header: 'Inherent Value', key: 'inherent_value', width: 15 },
        { header: 'Residual Value', key: 'residual_value', width: 15 },
        { header: 'Reduction', key: 'reduction', width: 10 },
        { header: 'Created At', key: 'created_at', width: 20 },
      ];

      worksheet.addRows(data);

      return await workbook.xlsx.writeBuffer();
    } else if (format === 'pdf') {
      // Placeholder for PDF generation
      return Buffer.from('PDF export not yet implemented.');
    }
  }

  

  private calculateRiskLevels(risks: any[]) {
    const levels = { High: 0, Medium: 0, Low: 0 };
    
    risks.forEach(risk => {
      const inherentValue = parseInt(risk.inherent_value) || 0;
      if (inherentValue > 80) {
        levels.High++;
      } else if (inherentValue > 50) {
        levels.Medium++;
      } else {
        levels.Low++;
      }
    });
    
    return Object.entries(levels).map(([level, count]) => ({ level, count }));
  }

  // Detail endpoints for charts and tables
  async getRisksByCategory(user: any, category: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    const isUncategorized = category === 'Uncategorized';
    let categoryFilter = '';
    if (isUncategorized) {
      categoryFilter = `AND (c.name IS NULL OR c.name = '')`;
    } else {
      categoryFilter = `AND c.name = @param2`;
    }
    
    // For count query, use @param0 when category is provided
    let countCategoryFilter = '';
    if (isUncategorized) {
      countCategoryFilter = `AND (c.name IS NULL OR c.name = '')`;
    } else {
      countCategoryFilter = `AND c.name = @param0`;
    }
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        ${this.riskFunctionNameSubquery()} AS function_name,
        ISNULL(c.name, 'Uncategorized') AS category_name,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt
      FROM dbo.[Risks] r
      LEFT JOIN dbo.RiskCategories rc ON r.id = rc.risk_id AND rc.isDeleted = 0
      LEFT JOIN dbo.Categories c ON rc.category_id = c.id AND c.isDeleted = 0
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} ${categoryFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      LEFT JOIN dbo.RiskCategories rc ON r.id = rc.risk_id AND rc.isDeleted = 0
      LEFT JOIN dbo.Categories c ON rc.category_id = c.id AND c.isDeleted = 0
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} ${countCategoryFilter}
    `;
    
    const dataParams = isUncategorized ? [offset, limitInt] : [offset, limitInt, category];
    const countParams = isUncategorized ? [] : [category];
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, dataParams),
        this.databaseService.query(countQuery, countParams)
      ]);
      
      return {
        data,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limitInt),
          hasNext: pageInt < Math.ceil((count[0]?.total || 0) / limitInt),
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByCategory:', error);
      console.error('Category:', category);
      console.error('Data params:', dataParams);
      console.error('Count params:', countParams);
      throw error;
    }
  }

  async getRisksByEventType(user: any, eventType: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    const isUnknown = eventType === 'Unknown';
    let eventTypeFilter = '';
    if (isUnknown) {
      eventTypeFilter = `AND (et.name IS NULL OR et.name = '')`;
    } else {
      eventTypeFilter = `AND et.name = @param2`;
    }
    
    // For count query, use @param0 when eventType is provided
    let countEventTypeFilter = '';
    if (isUnknown) {
      countEventTypeFilter = `AND (et.name IS NULL OR et.name = '')`;
    } else {
      countEventTypeFilter = `AND et.name = @param0`;
    }
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        ${this.riskFunctionNameSubquery()} AS function_name,
        ISNULL(et.name, 'Unknown') AS event_type_name,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[EventTypes] et ON r.event = et.id
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} ${eventTypeFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[EventTypes] et ON r.event = et.id
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} ${countEventTypeFilter}
    `;
    
    const dataParams = isUnknown ? [offset, limitInt] : [offset, limitInt, eventType];
    const countParams = isUnknown ? [] : [eventType];
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, dataParams),
        this.databaseService.query(countQuery, countParams)
      ]);
      
      return {
        data,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limitInt),
          hasNext: pageInt < Math.ceil((count[0]?.total || 0) / limitInt),
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByEventType:', error);
      console.error('EventType:', eventType);
      console.error('Data params:', dataParams);
      console.error('Count params:', countParams);
      throw error;
    }
  }

  async getRisksByQuarter(user: any, quarter: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    // Normalize quarter: trim and replace + with space (URL encoding)
    const quarterNorm = typeof quarter === 'string' ? quarter.replace(/\+/g, ' ').trim().replace(/\s+/g, ' ') : '';
    if (!quarterNorm) {
      return {
        data: [],
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }
    
    // Extract quarter and year from string like "Q1 2025" or "2025-Q2"
    let quarterNum: number;
    let year: number;
    
    // Try format "2025-Q2" first (from frontend creation_quarter)
    const format1Match = quarterNorm.match(/(\d{4})-Q(\d+)/);
    if (format1Match) {
      year = parseInt(format1Match[1]);
      quarterNum = parseInt(format1Match[2]);
    } else {
      // Try format "Q1 2025"
      const format2Match = quarterNorm.match(/Q(\d+)\s+(\d+)/);
      if (format2Match) {
        quarterNum = parseInt(format2Match[1]);
        year = parseInt(format2Match[2]);
      } else {
        throw new Error(`Invalid quarter format: "${quarter}". Expected format: "Q1 2025" or "2025-Q2"`);
      }
    }
    
    // Use inline quarter/year in SQL to avoid parameter ordering issues (values are validated above)
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        ${this.riskFunctionNameSubquery()} AS function_name,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt,
        CONCAT(YEAR(r.createdAt), '-Q', DATEPART(QUARTER, r.createdAt)) AS quarter
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 
        AND DATEPART(QUARTER, r.createdAt) = ${quarterNum}
        AND YEAR(r.createdAt) = ${year}
        ${dateFilter}
        ${functionFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    // Count query: inline quarter/year, no params needed for WHERE
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 
        AND DATEPART(QUARTER, r.createdAt) = ${quarterNum}
        AND YEAR(r.createdAt) = ${year}
        ${dateFilter}
        ${functionFilter}
    `;
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, [offset, limitInt]),
        this.databaseService.query(countQuery, [])
      ]);
      
      return {
        data,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limitInt),
          hasNext: pageInt < Math.ceil((count[0]?.total || 0) / limitInt),
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByQuarter:', error);
      console.error('Quarter:', quarter);
      console.error('QuarterNum:', quarterNum, 'Year:', year);
      throw error;
    }
  }

  async getRisksByApprovalStatus(user: any, approvalStatus: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    let dataQuery = '';
    let countQuery = '';
    
    if (approvalStatus === 'Approved') {
      // For approved: risks that have at least one approved ResidualRisk
      dataQuery = `
        SELECT DISTINCT
          r.code,
          r.name AS name,
          ${this.riskFunctionNameSubquery()} AS function_name,
          'Approved' AS approval_status,
          r.inherent_value,
          r.residual_value,
          r.createdAt AS createdAt
        FROM dbo.[Risks] r
        INNER JOIN dbo.[ResidualRisks] rr ON r.id = rr.riskId AND rr.isDeleted = 0
        WHERE r.isDeleted = 0 
          AND rr.preparerResidualStatus = 'sent' 
          AND rr.acceptanceResidualStatus = 'approved'
          ${dateFilter}
          ${functionFilter}
        ORDER BY r.createdAt DESC
        OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
      `;
      
      countQuery = `
        SELECT COUNT(DISTINCT r.id) as total
        FROM dbo.[Risks] r
        INNER JOIN dbo.[ResidualRisks] rr ON r.id = rr.riskId AND rr.isDeleted = 0
        WHERE r.isDeleted = 0 
          AND rr.preparerResidualStatus = 'sent' 
          AND rr.acceptanceResidualStatus = 'approved'
          ${dateFilter}
          ${functionFilter}
      `;
    } else {
      // For not approved: risks that don't have any approved ResidualRisk
      // Use NOT EXISTS to ensure we only get risks with no approved ResidualRisks
      dataQuery = `
        SELECT 
          r.code,
          r.name AS name,
          ${this.riskFunctionNameSubquery()} AS function_name,
          'Not Approved' AS approval_status,
          r.inherent_value,
          r.residual_value,
          r.createdAt AS createdAt
        FROM dbo.[Risks] r
        INNER JOIN dbo.[ResidualRisks] rr ON r.id = rr.riskId AND rr.isDeleted = 0
        WHERE r.isDeleted = 0 
          ${functionFilter}
          AND NOT EXISTS (
            SELECT 1 
            FROM dbo.[ResidualRisks] rr2 
            WHERE rr2.riskId = r.id 
              AND rr2.isDeleted = 0
              AND rr2.preparerResidualStatus = 'sent' 
              AND rr2.acceptanceResidualStatus = 'approved'
          )
          ${dateFilter}
        GROUP BY r.id, r.code, r.name, r.inherent_value, r.residual_value, r.createdAt
        ORDER BY r.createdAt DESC
        OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
      `;
      
      countQuery = `
        SELECT COUNT(DISTINCT r.id) as total
        FROM dbo.[Risks] r
        INNER JOIN dbo.[ResidualRisks] rr ON r.id = rr.riskId AND rr.isDeleted = 0
        WHERE r.isDeleted = 0 
          ${functionFilter}
          AND NOT EXISTS (
            SELECT 1 
            FROM dbo.[ResidualRisks] rr2 
            WHERE rr2.riskId = r.id 
              AND rr2.isDeleted = 0
              AND rr2.preparerResidualStatus = 'sent' 
              AND rr2.acceptanceResidualStatus = 'approved'
          )
          ${dateFilter}
      `;
    }
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, [offset, limitInt]),
        this.databaseService.query(countQuery)
      ]);
      
      return {
        data,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limitInt),
          hasNext: pageInt < Math.ceil((count[0]?.total || 0) / limitInt),
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByApprovalStatus:', error);
      console.error('ApprovalStatus:', approvalStatus);
      throw error;
    }
  }

  async getRisksByFinancialImpact(user: any, financialImpact: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    // Normalize financial impact: trim and match case-insensitively
    const impact = typeof financialImpact === 'string' ? financialImpact.trim() : '';
    const impactLower = impact.toLowerCase();
    let normalizedImpact: string;
    if (impactLower === 'low') normalizedImpact = 'Low';
    else if (impactLower === 'medium') normalizedImpact = 'Medium';
    else if (impactLower === 'high') normalizedImpact = 'High';
    else if (impactLower === 'unknown') normalizedImpact = 'Unknown';
    else normalizedImpact = '';

    // If no valid impact, return empty (do not return all risks)
    if (!normalizedImpact) {
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      return {
        data: [],
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }

    // Residual period: only when user has applied a date filter; otherwise get all data (no date filter)
    let residualDateFilter = '';
    const validStart = startDate && /^\d{4}-\d{2}-\d{2}/.test(String(startDate).trim());
    const validEnd = endDate && /^\d{4}-\d{2}-\d{2}/.test(String(endDate).trim());
    if (validStart && validEnd) {
      const start = String(startDate).trim().slice(0, 10);
      const end = String(endDate).trim().slice(0, 10);
      residualDateFilter = `AND rr.createdAt >= '${start}' AND rr.createdAt <= '${end} 23:59:59'`;
    }

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);

    // Filter by residual financial impact level (same buckets as dashboard card)
    let financialFilter = '';
    if (normalizedImpact === 'Low') {
      financialFilter = `AND rr.residual_financial_value <= 2`;
    } else if (normalizedImpact === 'Medium') {
      financialFilter = `AND rr.residual_financial_value = 3`;
    } else if (normalizedImpact === 'High') {
      financialFilter = `AND rr.residual_financial_value >= 4`;
    } else if (normalizedImpact === 'Unknown') {
      financialFilter = `AND (rr.residual_financial_value IS NULL OR rr.residual_financial_value = 0)`;
    }

    const dataQuery = `
      SELECT
        r.code,
        r.name AS name,
        ${this.riskFunctionNameSubquery()} AS function_name,
        CASE
          WHEN rr.residual_financial_value <= 2 THEN 'Low'
          WHEN rr.residual_financial_value = 3 THEN 'Medium'
          WHEN rr.residual_financial_value >= 4 THEN 'High'
          ELSE 'Unknown'
        END AS financial_status,
        r.inherent_value,
        rr.residual_value,
        r.createdAt AS createdAt
      FROM dbo.[Risks] r
      INNER JOIN dbo.[ResidualRisks] rr ON rr.riskId = r.id AND rr.isDeleted = 0
      WHERE r.isDeleted = 0 ${residualDateFilter} ${functionFilter} ${financialFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT r.id) as total
      FROM dbo.[Risks] r
      INNER JOIN dbo.[ResidualRisks] rr ON rr.riskId = r.id AND rr.isDeleted = 0
      WHERE r.isDeleted = 0 ${residualDateFilter} ${functionFilter} ${financialFilter}
    `;

    const [data, count] = await Promise.all([
      this.databaseService.query(dataQuery, [offset, limitInt]),
      this.databaseService.query(countQuery)
    ]);

    return {
      data,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total: count[0]?.total || 0,
        totalPages: Math.ceil((count[0]?.total || 0) / limitInt),
        hasNext: pageInt < Math.ceil((count[0]?.total || 0) / limitInt),
        hasPrev: pageInt > 1
      }
    };
  }

  async getRisksByFunction(user: any, functionName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const userFunctionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    const hasFunction = functionName && functionName !== '';
    let functionNameFilter = '';
    let countFunctionNameFilter = '';
    
    if (hasFunction) {
      functionNameFilter = `AND f.name = @param2`;
      countFunctionNameFilter = `AND f.name = @param0`;
    } else {
      functionNameFilter = `AND (f.name IS NULL OR f.name = '')`;
      countFunctionNameFilter = `AND (f.name IS NULL OR f.name = '')`;
    }
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        f.name AS function_name,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[RiskFunctions] rf ON r.id = rf.risk_id
      LEFT JOIN dbo.[Functions] f ON rf.function_id = f.id
      WHERE r.isDeleted = 0 ${dateFilter} ${userFunctionFilter} ${functionNameFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[RiskFunctions] rf ON r.id = rf.risk_id
      LEFT JOIN dbo.[Functions] f ON rf.function_id = f.id
      WHERE r.isDeleted = 0 ${dateFilter} ${userFunctionFilter} ${countFunctionNameFilter}
    `;
    
    const params = hasFunction ? [offset, limitInt, functionName] : [offset, limitInt];
    const countParams = hasFunction ? [functionName] : [];
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, params),
        this.databaseService.query(countQuery, countParams)
      ]);
      
      return {
        data,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limitInt),
          hasNext: pageInt < Math.ceil((count[0]?.total || 0) / limitInt),
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByFunction:', error);
      console.error('FunctionName:', functionName);
      throw error;
    }
  }

  async getRisksByBusinessProcess(user: any, processName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        ${this.riskFunctionNameSubquery()} AS function_name,
        p.name AS process_name,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt
      FROM dbo.[Risks] r
      JOIN dbo.[RiskProcesses] rp ON r.id = rp.risk_id
      JOIN dbo.[Processes] p ON rp.process_id = p.id
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} AND p.name = @param2
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    // For count query, use @param0 since only 1 parameter is passed
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      JOIN dbo.[RiskProcesses] rp ON r.id = rp.risk_id
      JOIN dbo.[Processes] p ON rp.process_id = p.id
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter} AND p.name = @param0
    `;
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, [offset, limitInt, processName]),
        this.databaseService.query(countQuery, [processName])
      ]);
      
      return {
        data,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limitInt),
          hasNext: pageInt < Math.ceil((count[0]?.total || 0) / limitInt),
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByBusinessProcess:', error);
      console.error('ProcessName:', processName);
      throw error;
    }
  }

  async getRisksByName(user: any, riskName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    const dataQuery = `
      SELECT 
        c.code,
        c.name AS name,
        r.name AS risk_name,
        ${this.riskFunctionNameSubquery()} AS function_name,
        c.code AS control_code,
        rc.control_id,
        c.createdAt AS createdAt
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[RiskControls] rc ON r.id = rc.risk_id
      LEFT JOIN dbo.[Controls] c ON rc.control_id = c.id AND c.isDeleted = 0 AND c.deletedAt IS NULL
      WHERE r.isDeleted = 0 
        AND r.deletedAt IS NULL 
        AND r.name = @param2
        ${dateFilter}
        ${functionFilter}
      ORDER BY c.name ASC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    // For count query, use @param0 since only 1 parameter is passed
    const countQuery = `
      SELECT COUNT(DISTINCT rc.control_id) as total
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[RiskControls] rc ON r.id = rc.risk_id
      LEFT JOIN dbo.[Controls] c ON rc.control_id = c.id AND c.isDeleted = 0 AND c.deletedAt IS NULL
      WHERE r.isDeleted = 0 
        AND r.deletedAt IS NULL 
        AND r.name = @param0
        ${dateFilter}
        ${functionFilter}
    `;
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, [offset, limitInt, riskName]),
        this.databaseService.query(countQuery, [riskName])
      ]);
      
      return {
        data,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limitInt),
          hasNext: pageInt < Math.ceil((count[0]?.total || 0) / limitInt),
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByName:', error);
      console.error('RiskName:', riskName);
      throw error;
    }
  }

  async getRisksByControlName(user: any, controlName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    const rawName = (controlName != null && controlName !== '') ? String(controlName).replace(/\s+/g, ' ').trim() : '';
    if (!rawName) {
      return { data: [], pagination: { page: 1, limit: Math.floor(Number(limit)) || 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }

    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);

    // Use distinct risk IDs so modal row count matches summary (no duplicate rows when RiskControls has duplicate links)
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        ${this.riskFunctionNameSubquery()} AS function_name,
        c.name AS control_name,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt
      FROM dbo.[Controls] c
      INNER JOIN (SELECT DISTINCT rc.control_id, rc.risk_id FROM dbo.[RiskControls] rc) rc ON c.id = rc.control_id
      INNER JOIN dbo.[Risks] r ON rc.risk_id = r.id AND r.isDeleted = 0 AND r.deletedAt IS NULL
      WHERE c.isDeleted = 0 
        AND c.deletedAt IS NULL
        AND LTRIM(RTRIM(REPLACE(REPLACE(c.name, CHAR(10), ' '), CHAR(13), ' '))) = @param2
        ${dateFilter}
        ${functionFilter}
      ORDER BY r.name ASC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT rc.risk_id) as total
      FROM dbo.[Controls] c
      LEFT JOIN dbo.[RiskControls] rc ON c.id = rc.control_id
      LEFT JOIN dbo.[Risks] r ON rc.risk_id = r.id AND r.isDeleted = 0 AND r.deletedAt IS NULL
      WHERE c.isDeleted = 0 
        AND c.deletedAt IS NULL
        AND LTRIM(RTRIM(REPLACE(REPLACE(c.name, CHAR(10), ' '), CHAR(13), ' '))) = @param0
        ${dateFilter}
        ${functionFilter}
    `;

    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, [offset, limitInt, rawName]),
        this.databaseService.query(countQuery, [rawName])
      ]);
      
      return {
        data,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limitInt),
          hasNext: pageInt < Math.ceil((count[0]?.total || 0) / limitInt),
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByControlName:', error);
      console.error('ControlName:', controlName);
      throw error;
    }
  }

  async getRisksForComparison(user: any, riskName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildRiskFunctionFilter('r', access, selectedFunctionIds);

    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        r.inherent_value,
        r.residual_value,
        f.name AS function_name,
        r.createdAt AS createdAt
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[RiskFunctions] rf ON r.id = rf.risk_id
      LEFT JOIN dbo.[Functions] f ON rf.function_id = f.id
      WHERE r.isDeleted = 0 
        AND r.name = @param2
        ${dateFilter}
        ${functionFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    // For count query, use @param0 since only 1 parameter is passed
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 
        AND r.name = @param0
        ${dateFilter}
        ${functionFilter}
    `;
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, [offset, limitInt, riskName]),
        this.databaseService.query(countQuery, [riskName])
      ]);
      
      return {
        data,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limitInt),
          hasNext: pageInt < Math.ceil((count[0]?.total || 0) / limitInt),
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksForComparison:', error);
      console.error('RiskName:', riskName);
      throw error;
    }
  }
}