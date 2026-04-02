import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';
import { DatabaseService } from '../database/database.service';
import { UserFunctionAccessService, UserFunctionAccess } from '../shared/user-function-access.service';
import { sortRowsByFunctionAsc } from '../shared/order-by-function';

const PYTHON_API_URL = process.env.PYTHON_API_URL || process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
const DASHBOARD_PREVIEW_LIMIT = 10;

@Injectable()
export class GrcIncidentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly userFunctionAccess: UserFunctionAccessService,
  ) {}

  private buildDateFilter(timeframe?: string, startDate?: string, endDate?: string): string {
    // If startDate and endDate are provided, use them
    if (startDate || endDate) {
      let filter = '';
      if (startDate) {
        filter += ` AND i.createdAt >= '${startDate}'`;
      }
      if (endDate) {
        // Add one day to endDate to include the entire end date
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        filter += ` AND i.createdAt < '${endDateObj.toISOString()}'`;
      }
      return filter;
    }
    
    // Otherwise use timeframe if provided
    if (!timeframe) return '';
    
    const now = new Date();
    let startDateObj: Date;
    
    switch (timeframe) {
      case '7d':
        startDateObj = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDateObj = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDateObj = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDateObj = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return '';
    }
    
    return ` AND i.createdAt >= '${startDateObj.toISOString()}'`;
  }

  private previewRows<T>(rows: T[]): T[] {
    return Array.isArray(rows) ? rows.slice(0, DASHBOARD_PREVIEW_LIMIT) : [];
  }

  private paginateRows<T>(rows: T[], page = 1, limit = 10) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);
    const total = Array.isArray(rows) ? rows.length : 0;
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    const start = (safePage - 1) * safeLimit;
    return {
      data: Array.isArray(rows) ? rows.slice(start, start + safeLimit) : [],
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
      },
    };
  }

  private async runDashboardQuery<T>(label: string, query: string, fallback: T): Promise<T> {
    try {
      return await this.databaseService.query(query) as T;
    } catch (error) {
      console.error(`${label} query failed:`, error);
      return fallback;
    }
  }

  private async runQueryBatches<T>(tasks: Array<() => Promise<T>>, batchSize = 4): Promise<T[]> {
    const results: T[] = [];
    for (let index = 0; index < tasks.length; index += batchSize) {
      const batch = tasks.slice(index, index + batchSize);
      results.push(...await Promise.all(batch.map((task) => task())));
    }
    return results;
  }

  async getIncidentsDashboard(
    user: any,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    section?: 'cards' | 'charts' | 'tables',
  ) {
    try {
      // console.log('[getIncidentsDashboard] Received parameters:', { timeframe, startDate, endDate, functionId, userId: user.id, groupName: user.groupName });
      
      const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
      // console.log('[getIncidentsDashboard] Date filter:', dateFilter);

      // Get user function access (super_admin_ sees everything)
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      // console.log('[getIncidentsDashboard] User access:', { isSuperAdmin: access.isSuperAdmin, functionIds: access.functionIds });
      
      // Build function filter - use selected functionId if provided, otherwise use user's functions
      const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter('i', 'function_id', access, selectedFunctionIds);
      // console.log('[getIncidentsDashboard] Function filter:', functionFilter);

      // Get total incidents
      const totalIncidentsQuery = `
        SELECT COUNT(*) as total
        FROM Incidents i
        WHERE i.isDeleted = 0 ${dateFilter} ${functionFilter}
      `;
      const totalIncidentsTask = () => this.runDashboardQuery<any[]>('Total incidents', totalIncidentsQuery, []);

      // Get incidents status counts using standardized pending rules
      const incidentsStatusCountsQuery = `
        SELECT 
          SUM(CASE WHEN ISNULL(preparerStatus, '') <> 'sent' THEN 1 ELSE 0 END) AS pendingPreparer,
          SUM(CASE WHEN ISNULL(preparerStatus, '') = 'sent' AND ISNULL(checkerStatus, '') <> 'approved' AND ISNULL(acceptanceStatus, '') <> 'approved' THEN 1 ELSE 0 END) AS pendingChecker,
          SUM(CASE WHEN ISNULL(checkerStatus, '') = 'approved' AND ISNULL(reviewerStatus, '') <> 'sent' AND ISNULL(acceptanceStatus, '') <> 'approved' THEN 1 ELSE 0 END) AS pendingReviewer,
          SUM(CASE WHEN ISNULL(reviewerStatus, '') = 'sent' AND ISNULL(acceptanceStatus, '') <> 'approved' THEN 1 ELSE 0 END) AS pendingAcceptance,
          SUM(CASE WHEN ISNULL(acceptanceStatus, '') = 'approved' THEN 1 ELSE 0 END) AS approved
        FROM Incidents i
        WHERE i.isDeleted = 0 AND i.deletedAt IS NULL ${dateFilter} ${functionFilter}
      `;
      const statusCountsTask = () => this.runDashboardQuery<any[]>('Incident status counts', incidentsStatusCountsQuery, []);

      // Get incidents by status distribution (for pie charts - same format as Python)
      const incidentsByStatusDistributionQuery = `
        WITH IncidentStatus AS (
          SELECT 
            i.id,
            CASE 
              WHEN ISNULL(i.preparerStatus, '') <> 'sent' THEN 'Pending Preparer'
              WHEN ISNULL(i.preparerStatus, '') = 'sent' AND ISNULL(i.checkerStatus, '') <> 'approved' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Checker'
              WHEN ISNULL(i.checkerStatus, '') = 'approved' AND ISNULL(i.reviewerStatus, '') <> 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Reviewer'
              WHEN ISNULL(i.reviewerStatus, '') = 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Acceptance'
              WHEN ISNULL(i.acceptanceStatus, '') = 'approved' THEN 'Approved'
              ELSE 'Other'
            END AS status
          FROM Incidents i
          WHERE i.isDeleted = 0 AND i.deletedAt IS NULL ${dateFilter} ${functionFilter}
        ),
        StatusCounts AS (
          SELECT 
            status as status_name,
            COUNT(*) as count
          FROM IncidentStatus
          GROUP BY status
        ),
        AllStatuses AS (
          SELECT 'Pending Preparer' AS status_name
          UNION ALL SELECT 'Pending Checker'
          UNION ALL SELECT 'Pending Reviewer'
          UNION ALL SELECT 'Pending Acceptance'
          UNION ALL SELECT 'Approved'
          UNION ALL SELECT 'Other'
        )
        SELECT 
          a.status_name,
          ISNULL(s.count, 0) as count
        FROM AllStatuses a
        LEFT JOIN StatusCounts s ON a.status_name = s.status_name
        ORDER BY s.count DESC, a.status_name
      `;
      const incidentsByStatusDistributionTask = () => this.runDashboardQuery<any[]>('Incidents by status distribution', incidentsByStatusDistributionQuery, []);

      // Get incidents by category
      const incidentsByCategoryQuery = `
        SELECT 
          ISNULL(c.name, 'Unknown') as category_name,
          COUNT(i.id) as count
        FROM Incidents i
        LEFT JOIN Categories c ON i.category_id = c.id
          AND c.isDeleted = 0
          AND c.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        GROUP BY ISNULL(c.name, 'Unknown')
        ORDER BY COUNT(i.id) DESC
      `;
      const incidentsByCategoryTask = () => this.runDashboardQuery<any[]>('Incidents by category', incidentsByCategoryQuery, []);

      // Get top financial impacts grouped by category with total net loss
      const topFinancialImpactsQuery = `
        SELECT
          ISNULL(fi.name, 'Unknown') as financial_impact_name,
          ISNULL(SUM(i.net_loss), 0) as net_loss
        FROM Incidents i
        LEFT JOIN FinancialImpacts fi ON i.financial_impact_id = fi.id
          AND fi.isDeleted = 0
          AND fi.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
          AND i.net_loss IS NOT NULL
          AND i.net_loss > 0
        GROUP BY fi.name
        ORDER BY net_loss DESC
      `;
      const topFinancialImpactsTask = () => this.runDashboardQuery<any[]>('Top financial impacts', topFinancialImpactsQuery, []);

      // Get net loss and recovery data
      const netLossAndRecoveryQuery = `
        SELECT
          i.title as incident_title,
          i.net_loss,
          i.recovery_amount,
          f.name as function_name
        FROM Incidents i
        LEFT JOIN Functions f ON i.function_id = f.id
          AND f.isDeleted = 0
          AND f.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
          AND (i.net_loss IS NOT NULL OR i.recovery_amount IS NOT NULL)
        ORDER BY i.net_loss DESC
      `;
      const netLossAndRecoveryTask = () => this.runDashboardQuery<any[]>('Net loss and recovery', netLossAndRecoveryQuery, []);

      // Get monthly trend
      const monthlyTrendQuery = `
        SELECT 
          FORMAT(i.createdAt, 'MMM yyyy') as month_year,
          COUNT(i.id) as incident_count
        FROM Incidents i
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
          AND i.createdAt IS NOT NULL
        GROUP BY FORMAT(i.createdAt, 'MMM yyyy')
        ORDER BY MIN(i.createdAt)
      `;
      const monthlyTrendTask = () => this.runDashboardQuery<any[]>('Incident monthly trend', monthlyTrendQuery, []);

      // Get incidents by status
      const incidentsByStatusQuery = `
        SELECT 
          i.status AS status, 
          COUNT(*) AS count 
        FROM 
          Incidents i
        WHERE 
          i.isDeleted = 0 ${dateFilter} ${functionFilter}
        GROUP BY 
          i.status 
        ORDER BY 
          i.status ASC
      `;
      const incidentsByStatusTask = () => this.runDashboardQuery<any[]>('Incidents by status table', incidentsByStatusQuery, []);

      // Fetch statusOverview (details list) using standardized staged status logic
      const listQuery = `
        SELECT 
          i.code,
          i.title,
          f.name AS function_name,
          CASE 
            WHEN ISNULL(i.preparerStatus, '') <> 'sent' THEN 'Pending Preparer'
            WHEN ISNULL(i.preparerStatus, '') = 'sent' AND ISNULL(i.checkerStatus, '') <> 'approved' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Checker'
            WHEN ISNULL(i.checkerStatus, '') = 'approved' AND ISNULL(i.reviewerStatus, '') <> 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Reviewer'
            WHEN ISNULL(i.reviewerStatus, '') = 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Acceptance'
            WHEN ISNULL(i.acceptanceStatus, '') = 'approved' THEN 'Approved'
            ELSE 'Other'
          END as status,
          FORMAT(CONVERT(datetime, i.createdAt), 'yyyy-MM-dd HH:mm:ss') as createdAt
        FROM Incidents i
        LEFT JOIN Functions f ON i.function_id = f.id
          AND f.isDeleted = 0
          AND f.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        ORDER BY i.createdAt DESC
      `;
      const statusOverviewTask = () => this.runDashboardQuery<any[]>('Incident status overview', listQuery, []);

      // Get incidents financial details
      const incidentsFinancialDetailsQuery = `
        SELECT 
          i.title AS title, 
          i.rootCause AS rootCause, 
          f.name AS function_name, 
          i.net_loss AS netLoss, 
          i.total_loss AS totalLoss, 
          i.recovery_amount AS recoveryAmount, 
          (ISNULL(i.total_loss, 0) + ISNULL(i.recovery_amount, 0)) AS grossAmount, 
          CASE 
            WHEN ISNULL(i.preparerStatus, '') <> 'sent' THEN 'Pending Preparer'
            WHEN ISNULL(i.preparerStatus, '') = 'sent' AND ISNULL(i.checkerStatus, '') <> 'approved' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Checker'
            WHEN ISNULL(i.checkerStatus, '') = 'approved' AND ISNULL(i.reviewerStatus, '') <> 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Reviewer'
            WHEN ISNULL(i.reviewerStatus, '') = 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Acceptance'
            WHEN ISNULL(i.acceptanceStatus, '') = 'approved' THEN 'Approved'
            ELSE 'Other'
          END AS status 
        FROM Incidents i
        LEFT JOIN Functions f ON i.function_id = f.id
          AND f.isDeleted = 0
          AND f.deletedAt IS NULL
        WHERE 
          i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
      `;
      const incidentsFinancialDetailsTask = () => this.runDashboardQuery<any[]>('Incident financial details', incidentsFinancialDetailsQuery, []);

      // Get incidents by event type
      const incidentsByEventTypeQuery = `
        SELECT 
          ISNULL(ie.name, 'Unknown') AS event_type, 
          COUNT(i.id) AS incident_count 
        FROM Incidents i 
        LEFT JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.isDeleted = 0
          AND ie.deletedAt IS NULL
        WHERE 
          i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        GROUP BY 
          ISNULL(ie.name, 'Unknown')
        ORDER BY 
          COUNT(i.id) DESC
      `;
      const incidentsByEventTypeTask = () => this.runDashboardQuery<any[]>('Incidents by event type', incidentsByEventTypeQuery, []);

      // Get incidents by financial impact
      const incidentsByFinancialImpactQuery = `
        SELECT 
          ISNULL(fi.name, 'Unknown') AS financial_impact_name, 
          COUNT(i.id) AS incident_count 
        FROM Incidents i
        LEFT JOIN FinancialImpacts fi ON i.financial_impact_id = fi.id
          AND fi.isDeleted = 0
          AND fi.deletedAt IS NULL
        WHERE 
          i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        GROUP BY 
          ISNULL(fi.name, 'Unknown')
        ORDER BY 
          COUNT(i.id) DESC
      `;
      const incidentsByFinancialImpactTask = () => this.runDashboardQuery<any[]>('Incidents by financial impact', incidentsByFinancialImpactQuery, []);

      // Get incidents time series by month
      const incidentsTimeSeriesQuery = `
        WITH month_series AS ( 
          SELECT  
            DATEFROMPARTS(YEAR(MIN(i.createdAt)), MONTH(MIN(i.createdAt)), 1) AS start_month, 
            DATEFROMPARTS(YEAR(MAX(i.createdAt)), MONTH(MAX(i.createdAt)), 1) AS end_month 
          FROM Incidents i
          WHERE i.isDeleted = 0 AND i.deletedAt IS NULL ${dateFilter} ${functionFilter}
        ), 
        months AS ( 
          SELECT start_month AS month_date 
          FROM month_series 
          UNION ALL 
          SELECT DATEADD(MONTH, 1, month_date) 
          FROM months, month_series 
          WHERE DATEADD(MONTH, 1, month_date) <= (SELECT end_month FROM month_series) 
        ) 
        SELECT 
          m.month_date AS month, 
          COUNT(i.id) AS total_incidents 
        FROM months AS m 
        LEFT JOIN Incidents AS i 
          ON YEAR(i.createdAt) = YEAR(m.month_date) 
          AND MONTH(i.createdAt) = MONTH(m.month_date)
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${functionFilter}
        GROUP BY  
          m.month_date 
        ORDER BY  
          m.month_date 
        OPTION (MAXRECURSION 0)
      `;
      const incidentsTimeSeriesTask = () => this.runDashboardQuery<any[]>('Incidents time series', incidentsTimeSeriesQuery, []);

      // Get new incidents by month
      const newIncidentsByMonthQuery = `
        SELECT 
          CAST(
            DATEFROMPARTS(
              YEAR(i.createdAt), 
              MONTH(i.createdAt), 
              1 
            ) AS datetime2
          ) AS month, 
          COUNT(*) AS new_incidents 
        FROM Incidents i
        WHERE  
          i.isDeleted = 0 ${dateFilter}
          ${functionFilter}
          AND i.deletedAt IS NULL
        GROUP BY 
          CAST(
            DATEFROMPARTS(
              YEAR(i.createdAt), 
              MONTH(i.createdAt), 
              1 
            ) AS datetime2
          )
        ORDER BY 
          month ASC
      `;
      const newIncidentsByMonthTask = () => this.runDashboardQuery<any[]>('New incidents by month', newIncidentsByMonthQuery, []);

      // Get incidents with timeframe
      const incidentsWithTimeframeQuery = `
        SELECT 
          i.title AS incident_name, 
          i.timeFrame AS time_frame,
          f.name AS function_name
        FROM Incidents i
        LEFT JOIN Functions f ON i.function_id = f.id
          AND f.isDeleted = 0
          AND f.deletedAt IS NULL
        WHERE i.isDeleted = 0 ${dateFilter}
          ${functionFilter}
          AND i.deletedAt IS NULL
        ORDER BY i.timeFrame DESC
      `;
      const incidentsWithTimeframeTask = () => this.runDashboardQuery<any[]>('Incidents with timeframe', incidentsWithTimeframeQuery, []);

      // Get incidents with financial impact and function details
      const incidentsWithFinancialAndFunctionQuery = `
        SELECT 
          i.title AS title, 
          ISNULL(fi.name, 'Unknown') AS financial_impact_name, 
          ISNULL(f.name, 'Unknown') AS function_name 
        FROM Incidents i
        LEFT JOIN FinancialImpacts fi ON i.financial_impact_id = fi.id
          AND fi.isDeleted = 0
          AND fi.deletedAt IS NULL
        LEFT JOIN Functions f ON i.function_id = f.id
          AND f.isDeleted = 0
          AND f.deletedAt IS NULL
        WHERE 
          i.isDeleted = 0 ${dateFilter}
          ${functionFilter}
          AND i.deletedAt IS NULL
      `;
      const incidentsWithFinancialAndFunctionTask = () => this.runDashboardQuery<any[]>('Incidents with financial impact and function', incidentsWithFinancialAndFunctionQuery, []);

      const [
        totalIncidentsResult,
        statusCountsResults,
        incidentsByStatusDistribution,
        incidentsByCategory,
        topFinancialImpacts,
        netLossAndRecovery,
        monthlyTrend,
        incidentsByStatus,
        statusOverview,
        incidentsFinancialDetails,
        incidentsByEventType,
        incidentsByFinancialImpact,
        incidentsTimeSeries,
        newIncidentsByMonth,
        incidentsWithTimeframe,
        incidentsWithFinancialAndFunction,
      ] = await this.runQueryBatches<any[]>([
        totalIncidentsTask,
        statusCountsTask,
        incidentsByStatusDistributionTask,
        incidentsByCategoryTask,
        topFinancialImpactsTask,
        netLossAndRecoveryTask,
        monthlyTrendTask,
        incidentsByStatusTask,
        statusOverviewTask,
        incidentsFinancialDetailsTask,
        incidentsByEventTypeTask,
        incidentsByFinancialImpactTask,
        incidentsTimeSeriesTask,
        newIncidentsByMonthTask,
        incidentsWithTimeframeTask,
        incidentsWithFinancialAndFunctionTask,
      ]);
      const totalIncidents = totalIncidentsResult[0]?.total || 0;
      const statusCountsRow = statusCountsResults[0] || {};
      const pendingPreparer = statusCountsRow?.pendingPreparer || 0;
      const pendingChecker = statusCountsRow?.pendingChecker || 0;
      const pendingReviewer = statusCountsRow?.pendingReviewer || 0;
      const pendingAcceptance = statusCountsRow?.pendingAcceptance || 0;

      // Operational Loss Metrics - Calculate date range (last 12 months)
      // Use occurrence_date if available, otherwise fall back to createdAt
      const operationalLossDateFilter = ` AND COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())`;

      // 1. Value of Operational Loss Incidents (monthly)
      const operationalLossValueQuery = `
        SELECT 
          YEAR(i.occurrence_date) AS [Year],
          MONTH(i.occurrence_date) AS [Month],
          CAST(SUM(i.net_loss) AS DECIMAL(18,2)) AS TotalLossValue,
          COUNT(*) AS IncidentCount
        FROM Incidents i
        WHERE i.occurrence_date >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${functionFilter}
          AND i.net_loss IS NOT NULL
        GROUP BY YEAR(i.occurrence_date), MONTH(i.occurrence_date)
        ORDER BY [Year], [Month]
      `;
      const operationalLossValueTask = () => this.runDashboardQuery<any[]>('Operational loss value', operationalLossValueQuery, []);

      // 2. Number of ATM theft events
      const atmTheftCountQuery = `
        SELECT COUNT(*) AS ATMTheftCount
        FROM Incidents i
        INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
          AND sc.deletedAt IS NULL
        WHERE i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${operationalLossDateFilter}
          ${functionFilter}
          AND sc.name = N'ATM issue'
      `;
      const atmTheftTask = () => this.runDashboardQuery<any[]>('ATM theft count', atmTheftCountQuery, []);

      // 3. Average time to recognize operational losses (in months)
      const avgRecognitionTimeQuery = `
        SELECT CAST(AVG(CAST(DATEDIFF(DAY, i.occurrence_date, i.reported_date) AS FLOAT)) / 30.44 AS DECIMAL(10,2))
               AS AvgRecognitionTimeMonths
        FROM Incidents i
        WHERE i.occurrence_date >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${functionFilter}
          AND i.occurrence_date IS NOT NULL
          AND i.reported_date IS NOT NULL
          AND i.reported_date >= i.occurrence_date
      `;
      const avgRecognitionTimeTask = () => this.runDashboardQuery<any[]>('Average recognition time', avgRecognitionTimeQuery, []);

      // 4. Number of internal frauds
      const internalFraudCountQuery = `
        SELECT COUNT(*) AS InternalFraudCount
        FROM Incidents i
        INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        WHERE COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${functionFilter}
          AND ie.name = N'Internal Fraud'
      `;
      const internalFraudTask = () => this.runDashboardQuery<any[]>('Internal fraud count', internalFraudCountQuery, []);

      // 5. Value of losses due to internal frauds
      const internalFraudLossQuery = `
        SELECT 
          CAST(SUM(i.net_loss) AS DECIMAL(18,2)) AS TotalInternalFraudLoss,
          COUNT(*) AS IncidentCount
        FROM Incidents i
        INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        WHERE i.occurrence_date >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${functionFilter}
          AND ie.name = N'Internal Fraud'
          AND i.net_loss IS NOT NULL
      `;
      const internalFraudLossTask = () => this.runDashboardQuery<any[]>('Internal fraud loss', internalFraudLossQuery, []);

      // 6. Number of external frauds
      const externalFraudCountQuery = `
        SELECT COUNT(*) AS ExternalFraudCount
        FROM Incidents i
        INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${operationalLossDateFilter}
          ${functionFilter}
          AND ie.name = N'External Fraud'
      `;
      const externalFraudTask = () => this.runDashboardQuery<any[]>('External fraud count', externalFraudCountQuery, []);

      // 7. Value of losses due to external frauds
      const externalFraudLossQuery = `
        SELECT 
          CAST(SUM(i.net_loss) AS DECIMAL(18,2)) AS TotalExternalFraudLoss,
          COUNT(*) AS IncidentCount
        FROM Incidents i
        INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        WHERE i.occurrence_date >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${functionFilter}
          AND ie.name = N'External Fraud'
          AND i.net_loss IS NOT NULL
      `;
      const externalFraudLossTask = () => this.runDashboardQuery<any[]>('External fraud loss', externalFraudLossQuery, []);

      // 8. Number of events that caused damages to physical assets
      const physicalAssetDamageCountQuery = `
        SELECT COUNT(*) AS PhysicalAssetDamageCount
        FROM Incidents i
        INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${operationalLossDateFilter}
          ${functionFilter}
          AND ie.name = N'Damage to Physical Assets'
      `;
      const physicalAssetDamageTask = () => this.runDashboardQuery<any[]>('Physical asset damage count', physicalAssetDamageCountQuery, []);

      // 9. Value of losses due to damages to physical assets
      const physicalAssetLossQuery = `
        SELECT 
          CAST(SUM(i.net_loss) AS DECIMAL(18,2)) AS TotalPhysicalAssetLoss,
          COUNT(*) AS IncidentCount
        FROM Incidents i
        INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        WHERE i.occurrence_date >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${functionFilter}
          AND ie.name = N'Damage to Physical Assets'
          AND i.net_loss IS NOT NULL
      `;
      const physicalAssetLossTask = () => this.runDashboardQuery<any[]>('Physical asset loss', physicalAssetLossQuery, []);

      // 10. Number of loss events due to people errors
      const peopleErrorCountQuery = `
        SELECT COUNT(*) AS PeopleErrorCount
        FROM Incidents i
        INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
          AND sc.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${operationalLossDateFilter}
          ${functionFilter}
          AND sc.name = N'Human Mistake'
      `;
      const peopleErrorTask = () => this.runDashboardQuery<any[]>('People error count', peopleErrorCountQuery, []);

      // 11. Value of losses due to people errors
      const peopleErrorLossQuery = `
        SELECT 
          CAST(SUM(ISNULL(i.net_loss, 0)) AS DECIMAL(18,2)) AS TotalPeopleErrorLoss,
          COUNT(*) AS IncidentCount
        FROM Incidents i
        INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
          AND sc.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${operationalLossDateFilter}
          ${functionFilter}
          AND sc.name = N'Human Mistake'
          AND i.net_loss IS NOT NULL
      `;
      const peopleErrorLossTask = () => this.runDashboardQuery<any[]>('People error loss', peopleErrorLossQuery, []);

      const [
        operationalLossValue,
        atmTheftResult,
        avgRecognitionTimeResult,
        internalFraudResult,
        internalFraudLossResult,
        externalFraudResult,
        externalFraudLossResult,
        physicalAssetDamageResult,
        physicalAssetLossResult,
        peopleErrorResult,
        peopleErrorLossResult,
      ] = await this.runQueryBatches<any[]>([
        operationalLossValueTask,
        atmTheftTask,
        avgRecognitionTimeTask,
        internalFraudTask,
        internalFraudLossTask,
        externalFraudTask,
        externalFraudLossTask,
        physicalAssetDamageTask,
        physicalAssetLossTask,
        peopleErrorTask,
        peopleErrorLossTask,
      ]);
      const atmTheftCount = atmTheftResult[0]?.ATMTheftCount || 0;
      const avgRecognitionTime = avgRecognitionTimeResult[0]?.AvgRecognitionTimeMonths || 0;
      const internalFraudCount = internalFraudResult[0]?.InternalFraudCount || 0;
      const internalFraudLoss = internalFraudLossResult[0]?.TotalInternalFraudLoss || 0;
      const externalFraudCount = externalFraudResult[0]?.ExternalFraudCount || 0;
      const externalFraudLoss = externalFraudLossResult[0]?.TotalExternalFraudLoss || 0;
      const physicalAssetDamageCount = physicalAssetDamageResult[0]?.PhysicalAssetDamageCount || 0;
      const physicalAssetLoss = physicalAssetLossResult[0]?.TotalPhysicalAssetLoss || 0;
      const peopleErrorCount = peopleErrorResult[0]?.PeopleErrorCount || 0;
      const peopleErrorLoss = peopleErrorLossResult[0]?.TotalPeopleErrorLoss || 0;

      if (section === 'cards') {
        return {
          totalIncidents,
          pendingPreparer,
          pendingChecker,
          pendingReviewer,
          pendingAcceptance,
          atmTheftCount,
          avgRecognitionTime,
          internalFraudCount,
          internalFraudLoss,
          externalFraudCount,
          externalFraudLoss,
          physicalAssetDamageCount,
          physicalAssetLoss,
          peopleErrorCount,
          peopleErrorLoss,
        };
      }

      // 12. Monthly trend analysis by incident type
      const monthlyTrendByTypeQuery = `
        SELECT 
          FORMAT(COALESCE(i.occurrence_date, i.createdAt), 'yyyy-MM') AS Period,
          SUM(CASE WHEN ie.name = N'Internal Fraud' THEN 1 ELSE 0 END) AS InternalFrauds,
          SUM(CASE WHEN ie.name = N'External Fraud' THEN 1 ELSE 0 END) AS ExternalFrauds,
          SUM(CASE WHEN ie.name = N'Damage to Physical Assets' THEN 1 ELSE 0 END) AS PhysicalAssetDamages,
          SUM(CASE WHEN sc.name = N'Human Mistake' THEN 1 ELSE 0 END) AS HumanErrors,
          SUM(CASE WHEN sc.name = N'ATM issue' THEN 1 ELSE 0 END) AS ATMIssues,
          SUM(CASE WHEN sc.name IN (N'System Error', N'Prime System Issue', N'Transaction system error (TRX BUG)') THEN 1 ELSE 0 END) AS SystemErrors
        FROM Incidents i
        LEFT JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        LEFT JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
          AND sc.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${operationalLossDateFilter}
          ${functionFilter}
        GROUP BY FORMAT(COALESCE(i.occurrence_date, i.createdAt), 'yyyy-MM')
        ORDER BY Period
      `;
      const monthlyTrendByTypeTask = () => this.runDashboardQuery<any[]>('Monthly trend by type', monthlyTrendByTypeQuery, []);

      // 13. Loss analysis by risk category
      const lossByRiskCategoryQuery = `
        SELECT 
          c.name AS RiskCategory,
          COUNT(*) AS IncidentCount,
          CAST(SUM(ISNULL(i.net_loss, 0)) AS DECIMAL(18,2)) AS TotalLoss,
          CAST(AVG(NULLIF(i.net_loss, 0)) AS DECIMAL(18,2)) AS AverageLoss
        FROM Incidents i
        INNER JOIN Categories c ON i.category_id = c.id
          AND c.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${operationalLossDateFilter}
          ${functionFilter}
          AND i.net_loss IS NOT NULL
        GROUP BY c.name
        ORDER BY TotalLoss DESC
      `;
      const lossByRiskCategoryTask = () => this.runDashboardQuery<any[]>('Loss by risk category', lossByRiskCategoryQuery, []);

      // 14. Incident Action Plans (from Actionplans linked to Incidents)
      // For this table, function filter is applied on Actionplans.actionOwner (not incident.function_id)
      const actionOwnerFunctionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
        'a',
        'actionOwner',
        access,
        selectedFunctionIds,
      );
      const incidentActionPlanQuery = `
        SELECT 
          i.code AS incident_code,
          i.title AS incident_title,
          f_inc.name AS incident_function_name,
          CAST(ISNULL(i.description, '') AS NVARCHAR(MAX)) AS incident_description,
          CAST(ISNULL(i.rootCause, '') AS NVARCHAR(MAX)) AS incident_root_cause,
          a.control_procedure AS action_taken,
          f_owner.name AS action_owner_name,
          a.business_unit AS business_unit_status,
          a.implementation_date AS expected_implementation_date
        FROM dbo.[Actionplans] a
        INNER JOIN dbo.[Incidents] i ON a.incident_id = i.id
        LEFT JOIN dbo.[Functions] f_inc ON i.function_id = f_inc.id
          AND f_inc.isDeleted = 0
          AND f_inc.deletedAt IS NULL
        LEFT JOIN dbo.[Functions] f_owner ON a.actionOwner = f_owner.id
          AND f_owner.isDeleted = 0
          AND f_owner.deletedAt IS NULL
        WHERE a.deletedAt IS NULL
          AND a.[from] = 'incident'
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${dateFilter}
          ${actionOwnerFunctionFilter}
        ORDER BY a.createdAt DESC
      `;
      const incidentActionPlanTask = () => this.runDashboardQuery<any[]>('Incident action plan', incidentActionPlanQuery, []);

      // 14b. Incident Action Plans by Status (business_unit) - counts for pie chart
      const incidentActionPlanByStatusQuery = `
        SELECT 
          ISNULL(a.business_unit, 'N/A') AS status_name,
          COUNT(*) AS count
        FROM dbo.[Actionplans] a
        INNER JOIN dbo.[Incidents] i ON a.incident_id = i.id
        LEFT JOIN dbo.[Functions] f_inc ON i.function_id = f_inc.id
          AND f_inc.isDeleted = 0
          AND f_inc.deletedAt IS NULL
        LEFT JOIN dbo.[Functions] f_owner ON a.actionOwner = f_owner.id
          AND f_owner.isDeleted = 0
          AND f_owner.deletedAt IS NULL
        WHERE a.deletedAt IS NULL
          AND a.[from] = 'incident'
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${dateFilter}
          ${actionOwnerFunctionFilter}
        GROUP BY ISNULL(a.business_unit, 'N/A')
        ORDER BY count DESC
      `;
      const incidentActionPlanByStatusTask = () => this.runDashboardQuery<any[]>('Incident action plan by status', incidentActionPlanByStatusQuery, []);

      // 14c. Overdue Incidents — same rows/columns as Incident Action Plan, filtered by
      // Actionplans.business_unit = pending|overdue (case-insensitive) and implementation date before today.
      const overdueIncidentsQuery = `
        SELECT 
          i.code AS incident_code,
          i.title AS incident_title,
          f_inc.name AS incident_function_name,
          CAST(ISNULL(i.description, '') AS NVARCHAR(MAX)) AS incident_description,
          CAST(ISNULL(i.rootCause, '') AS NVARCHAR(MAX)) AS incident_root_cause,
          a.control_procedure AS action_taken,
          f_owner.name AS action_owner_name,
          a.business_unit AS business_unit_status,
          a.implementation_date AS expected_implementation_date
        FROM dbo.[Actionplans] a
        INNER JOIN dbo.[Incidents] i ON a.incident_id = i.id
        LEFT JOIN dbo.[Functions] f_inc ON i.function_id = f_inc.id
          AND f_inc.isDeleted = 0
          AND f_inc.deletedAt IS NULL
        LEFT JOIN dbo.[Functions] f_owner ON a.actionOwner = f_owner.id
          AND f_owner.isDeleted = 0
          AND f_owner.deletedAt IS NULL
        WHERE a.deletedAt IS NULL
          AND a.[from] = 'incident'
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          AND a.implementation_date IS NOT NULL
          AND CAST(a.implementation_date AS DATE) < CAST(GETDATE() AS DATE)
          AND LOWER(LTRIM(RTRIM(ISNULL(a.business_unit, N'')))) IN (N'pending', N'overdue')
          ${dateFilter}
          ${actionOwnerFunctionFilter}
        ORDER BY a.createdAt DESC
      `;
      const overdueIncidentsTask = () => this.runDashboardQuery<any[]>('Overdue incidents', overdueIncidentsQuery, []);

      // 15. Comprehensive Operational Loss Dashboard (UNION ALL)
      const comprehensiveOperationalLossQuery = `
        SELECT 
          'Total Operational Loss Incidents' as Metric,
          COUNT(*) as Count,
          CAST(SUM(COALESCE(i.net_loss, 0)) AS DECIMAL(18,2)) as TotalValue
        FROM Incidents i
        WHERE COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${functionFilter}

        UNION ALL

        SELECT 
          'ATM Issues' as Metric,
          COUNT(*) as Count,
          CAST(SUM(COALESCE(i.net_loss, 0)) AS DECIMAL(18,2)) as TotalValue
        FROM Incidents i
        INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
          AND sc.deletedAt IS NULL
        WHERE COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${functionFilter}
          AND sc.name = N'ATM issue'

        UNION ALL

        SELECT 
          'Internal Fraud' as Metric,
          COUNT(*) as Count,
          CAST(SUM(COALESCE(i.net_loss, 0)) AS DECIMAL(18,2)) as TotalValue
        FROM Incidents i
        INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        WHERE COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${functionFilter}
          AND ie.name = N'Internal Fraud'

        UNION ALL

        SELECT 
          'External Fraud' as Metric,
          COUNT(*) as Count,
          CAST(SUM(COALESCE(i.net_loss, 0)) AS DECIMAL(18,2)) as TotalValue
        FROM Incidents i
        INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        WHERE COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${functionFilter}
          AND ie.name = N'External Fraud'

        UNION ALL

        SELECT 
          'Human Mistakes' as Metric,
          COUNT(*) as Count,
          CAST(SUM(COALESCE(i.net_loss, 0)) AS DECIMAL(18,2)) as TotalValue
        FROM Incidents i
        INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
          AND sc.deletedAt IS NULL
        WHERE COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${functionFilter}
          AND sc.name = N'Human Mistake'

        UNION ALL

        SELECT 
          'System Errors' as Metric,
          COUNT(*) as Count,
          CAST(SUM(COALESCE(i.net_loss, 0)) AS DECIMAL(18,2)) as TotalValue
        FROM Incidents i
        INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
          AND sc.deletedAt IS NULL
        WHERE COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${functionFilter}
          AND sc.name IN (N'System Error', N'Prime System Issue', N'Transaction system error (TRX BUG)')
      `;
      const comprehensiveOperationalLossTask = () => this.runDashboardQuery<any[]>('Comprehensive operational loss', comprehensiveOperationalLossQuery, []);

      const [
        monthlyTrendByType,
        lossByRiskCategory,
        incidentActionPlan,
        incidentActionPlanByStatus,
        overdueIncidentsRows,
        comprehensiveOperationalLoss,
      ] = await this.runQueryBatches<any[]>([
        monthlyTrendByTypeTask,
        lossByRiskCategoryTask,
        incidentActionPlanTask,
        incidentActionPlanByStatusTask,
        overdueIncidentsTask,
        comprehensiveOperationalLossTask,
      ]);

      if (section === 'charts') {
        return {
          incidentsByCategory: incidentsByCategory.map(item => ({
            category_name: item.category_name || 'Unknown',
            count: item.count,
          })),
          incidentsByEventType: incidentsByEventType.map(item => ({
            event_type: item.event_type || 'Unknown',
            incident_count: item.incident_count || 0,
          })),
          incidentsByFinancialImpact: incidentsByFinancialImpact.map(item => ({
            financial_impact_name: item.financial_impact_name || 'Unknown',
            incident_count: item.incident_count || 0,
          })),
          incidentsByStatus: [
            { status: 'Pending Preparer', count: pendingPreparer },
            { status: 'Pending Checker', count: pendingChecker },
            { status: 'Pending Reviewer', count: pendingReviewer },
            { status: 'Pending Acceptance', count: pendingAcceptance },
            { status: 'Approved', count: statusCountsRow?.approved || 0 },
          ],
          incidentsByStatusDistribution: incidentsByStatusDistribution.map(item => ({
            status_name: item.status_name || 'Unknown',
            count: item.count || 0,
          })),
          incidentsByStatusTable: incidentsByStatus.map(item => ({
            status: item.status || 'Unknown',
            count: item.count || 0,
          })),
          topFinancialImpacts: topFinancialImpacts.map(item => ({
            financial_impact_name: item.financial_impact_name || 'Unknown',
            net_loss: item.net_loss || 0,
          })),
          monthlyTrend: monthlyTrend.map(item => ({
            month_year: item.month_year,
            incident_count: item.incident_count,
          })),
          incidentsTimeSeries: incidentsTimeSeries.map(item => ({
            month: item.month ? new Date(item.month).toISOString().split('T')[0] : null,
            total_incidents: item.total_incidents || 0,
          })),
          operationalLossValue: operationalLossValue.map(item => ({
            year: item.Year || 0,
            month: item.Month || 0,
            totalLossValue: item.TotalLossValue || 0,
            incidentCount: item.IncidentCount || 0,
          })),
          monthlyTrendByType: monthlyTrendByType.map(item => ({
            period: item.Period || '',
            internalFrauds: item.InternalFrauds || 0,
            externalFrauds: item.ExternalFrauds || 0,
            physicalAssetDamages: item.PhysicalAssetDamages || 0,
            humanErrors: item.HumanErrors || 0,
            atmIssues: item.ATMIssues || 0,
            systemErrors: item.SystemErrors || 0,
          })),
          incidentActionPlanByStatus: (incidentActionPlanByStatus || []).map((row: any) => ({
            status_name: row.status_name || 'N/A',
            count: row.count || 0,
          })),
        };
      }

      if (section === 'tables') {
        return {
          netLossAndRecovery: netLossAndRecovery.map(item => ({
            incident_title: item.incident_title || 'Unknown',
            net_loss: item.net_loss || 0,
            recovery_amount: item.recovery_amount || 0,
            function_name: item.function_name || 'Unknown',
          })),
          statusOverview,
          overallStatuses: statusOverview,
          incidentsFinancialDetails: incidentsFinancialDetails.map(item => ({
            title: item.title || 'Unknown',
            rootCause: item.rootCause || '',
            function_name: item.function_name || 'Unknown',
            netLoss: item.netLoss || 0,
            totalLoss: item.totalLoss || 0,
            recoveryAmount: item.recoveryAmount || 0,
            grossAmount: item.grossAmount || 0,
            status: item.status || 'Unknown',
          })),
          incidentsWithTimeframe: incidentsWithTimeframe.map(item => ({
            incident_name: item.incident_name || 'Unknown',
            time_frame: item.time_frame || '',
            function_name: item.function_name || 'Unknown',
          })),
          incidentsWithFinancialAndFunction: incidentsWithFinancialAndFunction.map(item => ({
            title: item.title || 'Unknown',
            financial_impact_name: item.financial_impact_name || 'Unknown',
            function_name: item.function_name || 'Unknown',
          })),
          lossByRiskCategory: lossByRiskCategory.map(item => ({
            riskCategory: item.RiskCategory || 'Unknown',
            incidentCount: item.IncidentCount || 0,
            totalLoss: item.TotalLoss || 0,
            averageLoss: item.AverageLoss || 0,
          })),
          comprehensiveOperationalLoss: comprehensiveOperationalLoss.map(item => ({
            metric: item.Metric || 'Unknown',
            count: item.Count || 0,
            totalValue: item.TotalValue || 0,
          })),
          incidentActionPlan: incidentActionPlan.map((row: any) => ({
            code: row.incident_code != null && row.incident_code !== '' ? String(row.incident_code) : 'N/A',
            incident_name: row.incident_title || 'N/A',
            incident_department: row.incident_function_name || 'N/A',
            root_cause: row.incident_root_cause || '',
            description: row.incident_description || '',
            action_taken: row.action_taken || row.control_procedure || '',
            action_owner: row.action_owner_name || '',
            status: row.business_unit_status || '',
            expected_implementation_date: row.expected_implementation_date || null,
          })),
          overdueIncidents: (overdueIncidentsRows || []).map((row: any) => ({
            code: row.incident_code != null && row.incident_code !== '' ? String(row.incident_code) : 'N/A',
            incident_name: row.incident_title || 'N/A',
            incident_department: row.incident_function_name || 'N/A',
            root_cause: row.incident_root_cause || '',
            description: row.incident_description || '',
            action_taken: row.action_taken || row.control_procedure || '',
            action_owner: row.action_owner_name || '',
            status: row.business_unit_status || '',
            expected_implementation_date: row.expected_implementation_date || null,
          })),
        };
      }

      return {
        totalIncidents,
        pendingPreparer,
        pendingChecker,
        pendingReviewer,
        pendingAcceptance,
        incidentsByCategory: incidentsByCategory.map(item => ({
          category_name: item.category_name || 'Unknown',
          count: item.count
        })),
        incidentsByEventType: incidentsByEventType.map(item => ({
          event_type: item.event_type || 'Unknown',
          incident_count: item.incident_count || 0
        })),
        incidentsByFinancialImpact: incidentsByFinancialImpact.map(item => ({
          financial_impact_name: item.financial_impact_name || 'Unknown',
          incident_count: item.incident_count || 0
        })),
        incidentsByStatus: [
          { status: 'Pending Preparer', count: pendingPreparer },
          { status: 'Pending Checker', count: pendingChecker },
          { status: 'Pending Reviewer', count: pendingReviewer },
          { status: 'Pending Acceptance', count: pendingAcceptance },
          { status: 'Approved', count: statusCountsRow?.approved || 0 }
        ],
        // Status distribution for pie charts (same format as Python: status_name, count)
        incidentsByStatusDistribution: incidentsByStatusDistribution.map(item => ({
          status_name: item.status_name || 'Unknown',
          count: item.count || 0
        })),
        incidentsByStatusTable: incidentsByStatus.map(item => ({
          status: item.status || 'Unknown',
          count: item.count || 0
        })),
        topFinancialImpacts: topFinancialImpacts.map(item => ({
          financial_impact_name: item.financial_impact_name || 'Unknown',
          net_loss: item.net_loss || 0
        })),
        netLossAndRecovery: netLossAndRecovery.map(item => ({
          incident_title: item.incident_title || 'Unknown',
          net_loss: item.net_loss || 0,
          recovery_amount: item.recovery_amount || 0,
          function_name: item.function_name || 'Unknown'
        })),
        monthlyTrend: monthlyTrend.map(item => ({
          month_year: item.month_year,
          incident_count: item.incident_count
        })),
        statusOverview,
        overallStatuses: statusOverview,
        incidentsFinancialDetails: incidentsFinancialDetails.map(item => ({
          title: item.title || 'Unknown',
          rootCause: item.rootCause || '',
          function_name: item.function_name || 'Unknown',
          netLoss: item.netLoss || 0,
          totalLoss: item.totalLoss || 0,
          recoveryAmount: item.recoveryAmount || 0,
          grossAmount: item.grossAmount || 0,
          status: item.status || 'Unknown'
        })),
        incidentsTimeSeries: incidentsTimeSeries.map(item => ({
          month: item.month ? new Date(item.month).toISOString().split('T')[0] : null,
          total_incidents: item.total_incidents || 0
        })),
        newIncidentsByMonth: newIncidentsByMonth.map(item => ({
          month: item.month ? new Date(item.month).toISOString().split('T')[0] : null,
          new_incidents: item.new_incidents || 0
        })),
        incidentsWithTimeframe: incidentsWithTimeframe.map(item => ({
          incident_name: item.incident_name || 'Unknown',
          time_frame: item.time_frame || '',
          function_name: item.function_name || 'Unknown'
        })),
        incidentsWithFinancialAndFunction: incidentsWithFinancialAndFunction.map(item => ({
          title: item.title || 'Unknown',
          financial_impact_name: item.financial_impact_name || 'Unknown',
          function_name: item.function_name || 'Unknown'
        })),
        // Operational Loss Metrics
        operationalLossValue: operationalLossValue.map(item => ({
          year: item.Year || 0,
          month: item.Month || 0,
          totalLossValue: item.TotalLossValue || 0,
          incidentCount: item.IncidentCount || 0
        })),
        atmTheftCount,
        avgRecognitionTime,
        internalFraudCount,
        internalFraudLoss,
        externalFraudCount,
        externalFraudLoss,
        physicalAssetDamageCount,
        physicalAssetLoss,
        peopleErrorCount,
        peopleErrorLoss,
        monthlyTrendByType: monthlyTrendByType.map(item => ({
          period: item.Period || '',
          internalFrauds: item.InternalFrauds || 0,
          externalFrauds: item.ExternalFrauds || 0,
          physicalAssetDamages: item.PhysicalAssetDamages || 0,
          humanErrors: item.HumanErrors || 0,
          atmIssues: item.ATMIssues || 0,
          systemErrors: item.SystemErrors || 0
        })),
        lossByRiskCategory: lossByRiskCategory.map(item => ({
          riskCategory: item.RiskCategory || 'Unknown',
          incidentCount: item.IncidentCount || 0,
          totalLoss: item.TotalLoss || 0,
          averageLoss: item.AverageLoss || 0
        })),
        // Comprehensive Operational Loss Dashboard
        comprehensiveOperationalLoss: comprehensiveOperationalLoss.map(item => ({
          metric: item.Metric || 'Unknown',
          count: item.Count || 0,
          totalValue: item.TotalValue || 0
        })),
        // Incident Action Plans (tabular view)
        incidentActionPlan: incidentActionPlan.map((row: any) => ({
          code: row.incident_code != null && row.incident_code !== '' ? String(row.incident_code) : 'N/A',
          incident_name: row.incident_title || 'N/A',
          incident_department: row.incident_function_name || 'N/A',
          root_cause: row.incident_root_cause || '',
          description: row.incident_description || '',
          action_taken: row.action_taken || row.control_procedure || '',
          action_owner: row.action_owner_name || '',
          status: row.business_unit_status || '',
          expected_implementation_date: row.expected_implementation_date || null
        })),
        // Incident Action Plans by Status (business_unit) for pie chart
        incidentActionPlanByStatus: (incidentActionPlanByStatus || []).map((row: any) => ({
          status_name: row.status_name || 'N/A',
          count: row.count || 0
        })),
        overdueIncidents: (overdueIncidentsRows || []).map((row: any) => ({
          code: row.incident_code != null && row.incident_code !== '' ? String(row.incident_code) : 'N/A',
          incident_name: row.incident_title || 'N/A',
          incident_department: row.incident_function_name || 'N/A',
          root_cause: row.incident_root_cause || '',
          description: row.incident_description || '',
          action_taken: row.action_taken || row.control_procedure || '',
          action_owner: row.action_owner_name || '',
          status: row.business_unit_status || '',
          expected_implementation_date: row.expected_implementation_date || null,
        }))
      };
    } catch (error) {
      console.error('Error fetching incidents dashboard data:', error);
      throw error;
    }
  }

  async getIncidentsDashboardTablePage(
    user: any,
    tableId: string,
    page = 1,
    limit = 10,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    if (tableId === 'overallStatuses') {
      return this.getOverallStatusesTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'netLossAndRecovery') {
      return this.getNetLossAndRecoveryTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'incidentsFinancialDetails') {
      return this.getIncidentsFinancialDetailsTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'incidentsWithTimeframe') {
      return this.getIncidentsWithTimeframeTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'incidentsWithFinancialAndFunction') {
      return this.getIncidentsWithFinancialAndFunctionTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'incidentActionPlan') {
      return this.getIncidentActionPlanTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, false, orderByFunctionAsc);
    }
    if (tableId === 'overdueIncidents') {
      return this.getIncidentActionPlanTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, true, orderByFunctionAsc);
    }

    const tablesPayload = await this.getIncidentsDashboard(
      user,
      timeframe,
      startDate,
      endDate,
      selectedFunctionIds,
      'tables',
    ) as Record<string, any[]>;

    const tableRows = {
      overallStatuses: tablesPayload.overallStatuses || [],
      incidentsFinancialDetails: tablesPayload.incidentsFinancialDetails || [],
      incidentsWithTimeframe: tablesPayload.incidentsWithTimeframe || [],
      incidentsWithFinancialAndFunction: tablesPayload.incidentsWithFinancialAndFunction || [],
      lossByRiskCategory: tablesPayload.lossByRiskCategory || [],
      comprehensiveOperationalLoss: tablesPayload.comprehensiveOperationalLoss || [],
      netLossAndRecovery: tablesPayload.netLossAndRecovery || [],
      incidentActionPlan: tablesPayload.incidentActionPlan || [],
      overdueIncidents: tablesPayload.overdueIncidents || [],
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

  private async getOverallStatusesTablePage(
    user: any,
    page = 1,
    limit = 10,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
    const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter('i', 'function_id', access, selectedFunctionIds);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const countQuery = `SELECT COUNT(*) as total FROM Incidents i WHERE i.isDeleted = 0 AND i.deletedAt IS NULL ${dateFilter} ${functionFilter}`;
    const dataQuery = `
      SELECT 
        i.code,
        i.title,
        ISNULL(f.name, 'Unknown') AS function_name,
        CASE 
          WHEN ISNULL(i.preparerStatus, '') <> 'sent' THEN 'Pending Preparer'
          WHEN ISNULL(i.preparerStatus, '') = 'sent' AND ISNULL(i.checkerStatus, '') <> 'approved' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Checker'
          WHEN ISNULL(i.checkerStatus, '') = 'approved' AND ISNULL(i.reviewerStatus, '') <> 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Reviewer'
          WHEN ISNULL(i.reviewerStatus, '') = 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Acceptance'
          WHEN ISNULL(i.acceptanceStatus, '') = 'approved' THEN 'Approved'
          ELSE 'Other'
        END as status,
        FORMAT(CONVERT(datetime, i.createdAt), 'yyyy-MM-dd HH:mm:ss') as createdAt
      FROM Incidents i
      LEFT JOIN Functions f ON i.function_id = f.id
        AND f.isDeleted = 0
        AND f.deletedAt IS NULL
      WHERE i.isDeleted = 0 
        AND i.deletedAt IS NULL
        ${dateFilter}
        ${functionFilter}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, i.createdAt DESC' : 'i.createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const [data, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return { data, pagination: this.buildPaginationMeta(pageInt, limitInt, total) };
  }

  private async getNetLossAndRecoveryTablePage(
    user: any,
    page = 1,
    limit = 10,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
    const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter('i', 'function_id', access, selectedFunctionIds);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Incidents i
      WHERE i.isDeleted = 0 AND i.deletedAt IS NULL
        ${dateFilter}
        ${functionFilter}
        AND (i.net_loss IS NOT NULL OR i.recovery_amount IS NOT NULL)
    `;
    const dataQuery = `
      SELECT
        i.title as incident_title,
        i.net_loss,
        i.recovery_amount,
        ISNULL(f.name, 'Unknown') as function_name
      FROM Incidents i
      LEFT JOIN Functions f ON i.function_id = f.id
        AND f.isDeleted = 0
        AND f.deletedAt IS NULL
      WHERE i.isDeleted = 0 
        AND i.deletedAt IS NULL
        ${dateFilter}
        ${functionFilter}
        AND (i.net_loss IS NOT NULL OR i.recovery_amount IS NOT NULL)
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, i.createdAt DESC' : 'i.createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: rows.map((item: any) => ({
        incident_title: item.incident_title || 'Unknown',
        net_loss: item.net_loss || 0,
        recovery_amount: item.recovery_amount || 0,
        function_name: item.function_name || 'Unknown',
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getIncidentsFinancialDetailsTablePage(
    user: any,
    page = 1,
    limit = 10,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
    const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter('i', 'function_id', access, selectedFunctionIds);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const countQuery = `SELECT COUNT(*) as total FROM Incidents i WHERE i.isDeleted = 0 AND i.deletedAt IS NULL ${dateFilter} ${functionFilter}`;
    const dataQuery = `
      SELECT 
        i.title AS title, 
        i.rootCause AS rootCause, 
        ISNULL(f.name, 'Unknown') AS function_name, 
        i.net_loss AS netLoss, 
        i.total_loss AS totalLoss, 
        i.recovery_amount AS recoveryAmount, 
        (ISNULL(i.total_loss, 0) + ISNULL(i.recovery_amount, 0)) AS grossAmount, 
        CASE 
          WHEN ISNULL(i.preparerStatus, '') <> 'sent' THEN 'Pending Preparer'
          WHEN ISNULL(i.preparerStatus, '') = 'sent' AND ISNULL(i.checkerStatus, '') <> 'approved' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Checker'
          WHEN ISNULL(i.checkerStatus, '') = 'approved' AND ISNULL(i.reviewerStatus, '') <> 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Reviewer'
          WHEN ISNULL(i.reviewerStatus, '') = 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Acceptance'
          WHEN ISNULL(i.acceptanceStatus, '') = 'approved' THEN 'Approved'
          ELSE 'Other'
        END AS status 
      FROM Incidents i
      LEFT JOIN Functions f ON i.function_id = f.id
        AND f.isDeleted = 0
        AND f.deletedAt IS NULL
      WHERE i.isDeleted = 0 
        AND i.deletedAt IS NULL
        ${dateFilter}
        ${functionFilter}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, i.createdAt DESC' : 'i.createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: rows.map((item: any) => ({
        title: item.title || 'Unknown',
        rootCause: item.rootCause || '',
        function_name: item.function_name || 'Unknown',
        netLoss: item.netLoss || 0,
        totalLoss: item.totalLoss || 0,
        recoveryAmount: item.recoveryAmount || 0,
        grossAmount: item.grossAmount || 0,
        status: item.status || 'Unknown',
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getIncidentsWithTimeframeTablePage(
    user: any,
    page = 1,
    limit = 10,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
    const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter('i', 'function_id', access, selectedFunctionIds);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const countQuery = `SELECT COUNT(*) as total FROM Incidents i WHERE i.isDeleted = 0 ${dateFilter} ${functionFilter} AND i.deletedAt IS NULL`;
    const dataQuery = `
      SELECT 
        i.title AS incident_name, 
        i.timeFrame AS time_frame,
        ISNULL(f.name, 'Unknown') AS function_name
      FROM Incidents i
      LEFT JOIN Functions f ON i.function_id = f.id
        AND f.isDeleted = 0
        AND f.deletedAt IS NULL
      WHERE i.isDeleted = 0 ${dateFilter}
        ${functionFilter}
        AND i.deletedAt IS NULL
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, i.createdAt DESC' : 'i.createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: rows.map((item: any) => ({
        incident_name: item.incident_name || 'Unknown',
        time_frame: item.time_frame || '',
        function_name: item.function_name || 'Unknown',
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getIncidentsWithFinancialAndFunctionTablePage(
    user: any,
    page = 1,
    limit = 10,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
    const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter('i', 'function_id', access, selectedFunctionIds);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const countQuery = `SELECT COUNT(*) as total FROM Incidents i WHERE i.isDeleted = 0 ${dateFilter} ${functionFilter} AND i.deletedAt IS NULL`;
    const dataQuery = `
      SELECT 
        i.title AS title, 
        ISNULL(fi.name, 'Unknown') AS financial_impact_name, 
        ISNULL(f.name, 'Unknown') AS function_name 
      FROM Incidents i
      LEFT JOIN FinancialImpacts fi ON i.financial_impact_id = fi.id
        AND fi.isDeleted = 0
        AND fi.deletedAt IS NULL
      LEFT JOIN Functions f ON i.function_id = f.id
        AND f.isDeleted = 0
        AND f.deletedAt IS NULL
      WHERE i.isDeleted = 0 ${dateFilter}
        ${functionFilter}
        AND i.deletedAt IS NULL
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, i.createdAt DESC' : 'i.createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: rows.map((item: any) => ({
        title: item.title || 'Unknown',
        financial_impact_name: item.financial_impact_name || 'Unknown',
        function_name: item.function_name || 'Unknown',
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getIncidentActionPlanTablePage(
    user: any,
    page = 1,
    limit = 10,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    overdueOnly = false,
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
    const actionOwnerFunctionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
      'a',
      'actionOwner',
      access,
      selectedFunctionIds,
    );
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const overdueFilter = overdueOnly
      ? `
          AND a.implementation_date IS NOT NULL
          AND CAST(a.implementation_date AS DATE) < CAST(GETDATE() AS DATE)
          AND LOWER(LTRIM(RTRIM(ISNULL(a.business_unit, N'')))) IN (N'pending', N'overdue')
        `
      : '';
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dbo.[Actionplans] a
      INNER JOIN dbo.[Incidents] i ON a.incident_id = i.id
      WHERE a.deletedAt IS NULL
        AND a.[from] = 'incident'
        AND i.isDeleted = 0
        AND i.deletedAt IS NULL
        ${dateFilter}
        ${actionOwnerFunctionFilter}
        ${overdueFilter}
    `;
    const dataQuery = `
      SELECT 
        i.code AS incident_code,
        i.title AS incident_title,
        ISNULL(f_inc.name, 'N/A') AS incident_function_name,
        CAST(ISNULL(i.description, '') AS NVARCHAR(MAX)) AS incident_description,
        CAST(ISNULL(i.rootCause, '') AS NVARCHAR(MAX)) AS incident_root_cause,
        a.control_procedure AS action_taken,
        f_owner.name AS action_owner_name,
        a.business_unit AS business_unit_status,
        a.implementation_date AS expected_implementation_date
      FROM dbo.[Actionplans] a
      INNER JOIN dbo.[Incidents] i ON a.incident_id = i.id
      LEFT JOIN dbo.[Functions] f_inc ON i.function_id = f_inc.id
        AND f_inc.isDeleted = 0
        AND f_inc.deletedAt IS NULL
      LEFT JOIN dbo.[Functions] f_owner ON a.actionOwner = f_owner.id
        AND f_owner.isDeleted = 0
        AND f_owner.deletedAt IS NULL
      WHERE a.deletedAt IS NULL
        AND a.[from] = 'incident'
        AND i.isDeleted = 0
        AND i.deletedAt IS NULL
        ${dateFilter}
        ${actionOwnerFunctionFilter}
        ${overdueFilter}
      ORDER BY ${orderByFunctionAsc ? 'incident_function_name ASC, a.createdAt DESC' : 'a.createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: rows.map((row: any) => ({
        code: row.incident_code != null && row.incident_code !== '' ? String(row.incident_code) : 'N/A',
        incident_name: row.incident_title || 'N/A',
        incident_department: row.incident_function_name || 'N/A',
        root_cause: row.incident_root_cause || '',
        description: row.incident_description || '',
        action_taken: row.action_taken || row.control_procedure || '',
        action_owner: row.action_owner_name || '',
        status: row.business_unit_status || '',
        expected_implementation_date: row.expected_implementation_date || null,
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  async exportIncidents(user: any, format: string, timeframe?: string) {
    // Legacy placeholder; use proxyExportToPython (export-pdf / export-excel) for real export
    return {
      message: `Exporting incidents data in ${format} format`,
      timeframe: timeframe || 'all',
      status: 'success'
    };
  }

  /**
   * Proxy incident export to Python so user context (X-User-Id, X-Group-Name) is sent
   * and export applies the same function filter as the UI (same row count).
   */
  async proxyExportToPython(
    user: any,
    format: 'pdf' | 'excel',
    query: Record<string, any>,
    res: Response,
  ): Promise<void> {
    const base = PYTHON_API_URL.replace(/\/$/, '');
    const path = `/api/grc/incidents/export-${format}`;
    const qs = new URLSearchParams();
    Object.entries(query || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        qs.append(k, String(v));
      }
    });
    const url = qs.toString() ? `${base}${path}?${qs.toString()}` : `${base}${path}`;
    const headers: Record<string, string> = {};
    if (user?.id) headers['X-User-Id'] = String(user.id);
    if (user?.groupName) headers['X-Group-Name'] = String(user.groupName);
    else if (user?.group) headers['X-Group-Name'] = String(user.group);

    try {
      const ax = await axios({
        method: 'GET',
        url,
        headers,
        responseType: 'stream',
        validateStatus: () => true,
      });
      const contentType = ax.headers['content-type'];
      const contentDisposition = ax.headers['content-disposition'];
      if (contentType) res.setHeader('Content-Type', contentType);
      if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition);
      res.status(ax.status);
      ax.data.pipe(res);
    } catch (err: any) {
      res.status(500).json({ detail: err?.message || 'Export proxy failed' });
    }
  }

  async getTotalIncidents(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
      'i',
      'function_id',
      access,
      selectedFunctionIds,
    );

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = ["i.isDeleted = 0"];
    const validStart = startDate && /^\d{4}-\d{2}-\d{2}/.test(String(startDate).trim());
    const validEnd = endDate && /^\d{4}-\d{2}-\d{2}/.test(String(endDate).trim());
    if (validStart) where.push(`i.createdAt >= '${String(startDate).trim().slice(0, 10)}'`);
    if (validEnd) where.push(`i.createdAt <= '${String(endDate).trim().slice(0, 10)} 23:59:59'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`;

    const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`
    const totalRes = await this.databaseService.query(countQuery)
    const total = totalRes?.[0]?.total || 0

    const dataQuery = `
      SELECT 
        i.code,
        i.title,
        CAST(ISNULL(i.description, '') AS NVARCHAR(MAX)) as description,
        CASE 
          WHEN i.acceptanceStatus = 'approved' THEN 'approved'
          WHEN i.reviewerStatus = 'sent' THEN 'sent'
          WHEN i.checkerStatus = 'approved' THEN 'approved'
          ELSE ISNULL(i.preparerStatus, i.acceptanceStatus)
        END as status,
        i.createdAt,
        ISNULL(c.name, '') as categoryName,
        ISNULL(f.name, '') as functionName,
        i.occurrence_date as occurrenceDate,
        i.reported_date as reportedDate,
        ISNULL(i.net_loss, 0) as netLoss,
        ISNULL(i.recovery_amount, 0) as recoveryAmount,
        ISNULL(i.total_loss, 0) as totalLoss,
        ISNULL(ie.name, '') as eventType,
        ISNULL(i.importance, '') as importance,
        ISNULL(i.timeFrame, '') as timeFrame,
        ISNULL(u.name, '') as owner,
        ISNULL(sc.name, '') as subCategoryName,
        CAST(ISNULL(i.rootCause, '') AS NVARCHAR(MAX)) as rootCause,
        ISNULL(rc.name, '') as causeName,
        ISNULL(fi.name, '') as financialImpactName,
        ISNULL(cu.name, '') as currencyName,
        ISNULL(i.exchange_rate, 0) as exchangeRate,
        ISNULL(i.status, '') as recoveryStatus,
        ISNULL(i.preparerStatus, '') as preparerStatus,
        ISNULL(i.reviewerStatus, '') as reviewerStatus,
        ISNULL(i.checkerStatus, '') as checkerStatus,
        ISNULL(i.acceptanceStatus, '') as acceptanceStatus
      FROM Incidents i
      LEFT JOIN Categories c ON i.category_id = c.id AND c.isDeleted = 0 AND c.deletedAt IS NULL
      LEFT JOIN Functions f ON i.function_id = f.id AND f.isDeleted = 0 AND f.deletedAt IS NULL
      LEFT JOIN IncidentEvents ie ON i.event_type_id = ie.id AND ie.isDeleted = 0 AND ie.deletedAt IS NULL
      LEFT JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id AND sc.isDeleted = 0 AND sc.deletedAt IS NULL
      LEFT JOIN RootCauses rc ON i.cause_id = rc.id AND rc.isDeleted = 0 AND rc.deletedAt IS NULL
      LEFT JOIN FinancialImpacts fi ON i.financial_impact_id = fi.id AND fi.isDeleted = 0 AND fi.deletedAt IS NULL
      LEFT JOIN Currencies cu ON i.currency = cu.id AND cu.isDeleted = 0 AND cu.deletedAt IS NULL
      LEFT JOIN Users u ON i.created_by = u.id AND u.deletedAt IS NULL
      ${whereSql}
      ORDER BY ${orderByFunctionAsc ? 'functionName ASC, i.createdAt DESC' : 'i.createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `
    const data = await this.databaseService.query(dataQuery)

    return {
      data,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages: Math.ceil(total / limitInt),
        hasNext: offset + limitInt < total,
        hasPrev: pageInt > 1
      }
    }
  }

  async getPendingPreparerIncidents(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
      'i',
      'function_id',
      access,
      selectedFunctionIds,
    );

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = ["i.isDeleted = 0", "i.deletedAt IS NULL", "ISNULL(i.preparerStatus, '') <> 'sent'"]
    if (this.isValidDateStr(startDate)) where.push(`i.createdAt >= '${String(startDate).trim().slice(0, 10)}'`)
    if (this.isValidDateStr(endDate)) where.push(`i.createdAt <= '${String(endDate).trim().slice(0, 10)} 23:59:59'`)
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`

    const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`
    const totalRes = await this.databaseService.query(countQuery)
    const total = totalRes?.[0]?.total || 0

    const dataQuery = `
      SELECT 
        i.code,
        i.title,
        f.name AS function_name,
        'Pending Preparer' as status,
        i.createdAt
      FROM Incidents i
      LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
      ${whereSql}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, i.createdAt DESC' : 'i.createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `
    const data = await this.databaseService.query(dataQuery)

    return {
      data,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages: Math.ceil(total / limitInt),
        hasNext: offset + limitInt < total,
        hasPrev: pageInt > 1
      }
    }
  }

  async getPendingCheckerIncidents(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
      'i',
      'function_id',
      access,
      selectedFunctionIds,
    );

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = [
      "i.isDeleted = 0",
      "i.deletedAt IS NULL",
      "ISNULL(i.preparerStatus, '') = 'sent'",
      "ISNULL(i.checkerStatus, '') <> 'approved'",
      "ISNULL(i.acceptanceStatus, '') <> 'approved'"
    ]
    if (this.isValidDateStr(startDate)) where.push(`i.createdAt >= '${String(startDate).trim().slice(0, 10)}'`)
    if (this.isValidDateStr(endDate)) where.push(`i.createdAt <= '${String(endDate).trim().slice(0, 10)} 23:59:59'`)
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`

    const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`
    const totalRes = await this.databaseService.query(countQuery)
    const total = totalRes?.[0]?.total || 0

    const dataQuery = `
      SELECT 
        i.code,
        i.title,
        f.name AS function_name,
        'Pending Checker' as status,
        i.createdAt
      FROM Incidents i
      LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
      ${whereSql}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, i.createdAt DESC' : 'i.createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `
    const data = await this.databaseService.query(dataQuery)

    return {
      data,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages: Math.ceil(total / limitInt),
        hasNext: offset + limitInt < total,
        hasPrev: pageInt > 1
      }
    }
  }

  async getPendingReviewerIncidents(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
      'i',
      'function_id',
      access,
      selectedFunctionIds,
    );

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = [
      "i.isDeleted = 0",
      "i.deletedAt IS NULL",
      "ISNULL(i.checkerStatus, '') = 'approved'",
      "ISNULL(i.reviewerStatus, '') <> 'sent'",
      "ISNULL(i.acceptanceStatus, '') <> 'approved'"
    ]
    if (this.isValidDateStr(startDate)) where.push(`i.createdAt >= '${String(startDate).trim().slice(0, 10)}'`)
    if (this.isValidDateStr(endDate)) where.push(`i.createdAt <= '${String(endDate).trim().slice(0, 10)} 23:59:59'`)
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`

    const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`
    const totalRes = await this.databaseService.query(countQuery)
    const total = totalRes?.[0]?.total || 0

    const dataQuery = `
      SELECT 
        i.code,
        i.title,
        f.name AS function_name,
        'Pending Reviewer' as status,
        i.createdAt
      FROM Incidents i
      LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
      ${whereSql}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, i.createdAt DESC' : 'i.createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `
    const data = await this.databaseService.query(dataQuery)

    return {
      data,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages: Math.ceil(total / limitInt),
        hasNext: offset + limitInt < total,
        hasPrev: pageInt > 1
      }
    }
  }

  async getPendingAcceptanceIncidents(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
      'i',
      'function_id',
      access,
      selectedFunctionIds,
    );

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = [
      "i.isDeleted = 0",
      "i.deletedAt IS NULL",
      "ISNULL(i.reviewerStatus, '') = 'sent'",
      "ISNULL(i.acceptanceStatus, '') <> 'approved'"
    ]
    if (this.isValidDateStr(startDate)) where.push(`i.createdAt >= '${String(startDate).trim().slice(0, 10)}'`)
    if (this.isValidDateStr(endDate)) where.push(`i.createdAt <= '${String(endDate).trim().slice(0, 10)} 23:59:59'`)
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`

    const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`
    const totalRes = await this.databaseService.query(countQuery)
    const total = totalRes?.[0]?.total || 0

    const dataQuery = `
      SELECT 
        i.code,
        i.title,
        f.name AS function_name,
        'Pending Acceptance' as status,
        i.createdAt
      FROM Incidents i
      LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
      ${whereSql}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, i.createdAt DESC' : 'i.createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `
    const data = await this.databaseService.query(dataQuery)

    return {
      data,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages: Math.ceil(total / limitInt),
        hasNext: offset + limitInt < total,
        hasPrev: pageInt > 1
      }
    }
  }

  async getIncidentsByCategory(
    user: any,
    category: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[]
  ) {
    try {
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
      // Decode URL-encoded parameter (handles Arabic and special characters)
      let decodedCategory = category;
      try {
        decodedCategory = decodeURIComponent(category);
        try {
          decodedCategory = decodeURIComponent(decodedCategory);
        } catch (e) {
          // Already decoded, keep as is
        }
      } catch (e) {
        decodedCategory = category;
      }
      
      // Log for debugging
      // console.log('[getIncidentsByCategory] Received category:', category);
      // console.log('[getIncidentsByCategory] Decoded category:', decodedCategory);
      
      const dateFilter = this.buildDateRangeFilter(startDate, endDate, 'i.createdAt');
      
      // Get user function access
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
        'i',
        'function_id',
        access,
        selectedFunctionIds,
      );
      
      // Escape special characters for SQL
      const escapedForExact = decodedCategory.replace(/'/g, "''");
      
      // Build WHERE clause - match chart query exactly (same as incidentsByCategoryQuery)
      const whereSql = `WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          AND ISNULL(c.name, 'Unknown') = N'${escapedForExact}'
          ${dateFilter}
          ${functionFilter}`;
      
      // Use LEFT JOIN with Categories table (matching chart query exactly)
      const query = `
        SELECT 
          i.code,
          i.title AS name,
          f.name AS function_name,
          i.createdAt,
          i.net_loss,
          i.recovery_amount
        FROM Incidents i
        LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
        LEFT JOIN Categories c ON i.category_id = c.id
          AND c.isDeleted = 0
          AND c.deletedAt IS NULL
        ${whereSql}
        ORDER BY i.createdAt DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
      `;

      const result = await this.databaseService.query(query);

      const countQuery = `
        SELECT COUNT(*) AS total
        FROM Incidents i
        LEFT JOIN Categories c ON i.category_id = c.id
          AND c.isDeleted = 0
          AND c.deletedAt IS NULL
        ${whereSql}
      `;
      const countResult = await this.databaseService.query(countQuery);
      const total = countResult[0]?.total || 0;
      
      // console.log('[getIncidentsByCategory] Total count:', total);

      return {
        data: result.map((row: any) => ({
          code: row.code || 'N/A',
          name: row.name || 'N/A',
          function_name: row.function_name || null,
          createdAt: row.createdAt || null,
          netLoss: row.net_loss || null,
          recoveryAmount: row.recovery_amount || null
        })),
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages: Math.ceil(total / limitInt),
          hasNext: pageInt * limitInt < total,
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error fetching incidents by category:', error);
      throw error;
    }
  }

  async getIncidentsByEventType(
    user: any,
    eventType: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[]
  ) {
    try {
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
      // Get user function access
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
        'i',
        'function_id',
        access,
        selectedFunctionIds,
      );

      // Build date filter - match the chart query logic (uses createdAt, not occurrence_date)
      // The chart query uses buildDateFilter(timeframe) which filters by createdAt
      let dateFilter = '';
      if (startDate || endDate) {
        dateFilter = this.buildDateRangeFilter(startDate, endDate, 'i.createdAt');
      } else {
        // No date filter by default to match chart behavior (chart uses buildDateFilter which returns empty string if no timeframe)
        dateFilter = '';
      }
      
      // Handle 'Unknown' case - match the chart query logic
      let eventTypeFilter = '';
      if (eventType === 'Unknown' || eventType === 'unknown') {
        eventTypeFilter = ` AND (ie.name IS NULL OR ie.name = '')`;
      } else {
        eventTypeFilter = ` AND ISNULL(ie.name, 'Unknown') = @param0`;
      }
      
      const query = `
        SELECT 
          i.code as incident_code,
          i.title as incident_title,
          f.name AS function_name,
          FORMAT(i.createdAt, 'yyyy-MM-ddTHH:mm:ss') as created_at,
          i.net_loss,
          i.recovery_amount
        FROM dbo.[Incidents] i
        LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
        LEFT JOIN dbo.[IncidentEvents] ie ON i.event_type_id = ie.id AND ie.isDeleted = 0 AND ie.deletedAt IS NULL
        WHERE i.isDeleted = 0 AND i.deletedAt IS NULL
          ${eventTypeFilter}
          ${dateFilter}
          ${functionFilter}
        ORDER BY i.createdAt DESC
        OFFSET @param1 ROWS
        FETCH NEXT @param2 ROWS ONLY
      `;

      const queryParams = eventType === 'Unknown' || eventType === 'unknown' 
        ? [offset, limitInt] 
        : [eventType, offset, limitInt];

      const result = await this.databaseService.query(query, queryParams);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Incidents] i
        LEFT JOIN dbo.[IncidentEvents] ie ON i.event_type_id = ie.id AND ie.isDeleted = 0 AND ie.deletedAt IS NULL
        WHERE i.isDeleted = 0 AND i.deletedAt IS NULL
          ${eventTypeFilter}
          ${dateFilter}
          ${functionFilter}
      `;
      
      const countParams = eventType === 'Unknown' || eventType === 'unknown' ? [] : [eventType];
      const countResult = await this.databaseService.query(countQuery, countParams);
      const total = countResult[0]?.total || 0;

      return {
        data: result.map((row: any) => ({
          code: row.incident_code || 'N/A',
          name: row.incident_title || 'N/A',
          function_name: row.function_name || null,
          createdAt: row.created_at || null,
          netLoss: row.net_loss || null,
          recoveryAmount: row.recovery_amount || null
        })),
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages: Math.ceil(total / limitInt),
          hasNext: pageInt * limitInt < total,
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error fetching incidents by event type:', error);
      throw error;
    }
  }

  async getIncidentsByFinancialImpact(
    user: any,
    financialImpact: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[]
  ) {
    try {
      // Get user function access
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
        'i',
        'function_id',
        access,
        selectedFunctionIds,
      );

      const dateFilter = this.buildDateRangeFilter(startDate, endDate, 'i.createdAt');
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
      const query = `
        SELECT 
          i.code as incident_code,
          i.title as incident_title,
          f.name AS function_name,
          FORMAT(i.createdAt, 'yyyy-MM-ddTHH:mm:ss') as created_at,
          ISNULL(i.net_loss, 0) as net_loss,
          ISNULL(i.recovery_amount, 0) as recovery_amount
        FROM dbo.[Incidents] i
        LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
        LEFT JOIN dbo.[FinancialImpacts] fi ON i.financial_impact_id = fi.id AND fi.isDeleted = 0 AND fi.deletedAt IS NULL
        WHERE i.isDeleted = 0 AND i.deletedAt IS NULL
          AND ISNULL(fi.name, 'Unknown') = @param0
          ${dateFilter}
          ${functionFilter}
        ORDER BY i.createdAt DESC
        OFFSET @param1 ROWS
        FETCH NEXT @param2 ROWS ONLY
      `;

      const result = await this.databaseService.query(query, [financialImpact, offset, limitInt]);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Incidents] i
        LEFT JOIN dbo.[FinancialImpacts] fi ON i.financial_impact_id = fi.id AND fi.isDeleted = 0 AND fi.deletedAt IS NULL
        WHERE i.isDeleted = 0 AND i.deletedAt IS NULL
          AND ISNULL(fi.name, 'Unknown') = @param0
          ${dateFilter}
          ${functionFilter}
      `;
      const countResult = await this.databaseService.query(countQuery, [financialImpact]);
      const total = countResult[0]?.total || 0;

      return {
        data: result.map((row: any) => ({
          code: row.incident_code || 'N/A',
          name: row.incident_title || 'N/A',
          function_name: row.function_name || null,
          createdAt: row.created_at || null,
          netLoss: row.net_loss || 0,
          recoveryAmount: row.recovery_amount || 0
        })),
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages: Math.ceil(total / limitInt),
          hasNext: pageInt * limitInt < total,
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error fetching incidents by financial impact:', error);
      throw error;
    }
  }

  async getIncidentsByStatus(
    user: any,
    status: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[]
  ) {
    try {
      // Get user function access
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
        'i',
        'function_id',
        access,
        selectedFunctionIds,
      );

      const dateFilter = this.buildDateRangeFilter(startDate, endDate, 'i.createdAt');
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
      // Decode URL-encoded parameter (handles Arabic and special characters)
      let decodedStatus = status;
      try {
        decodedStatus = decodeURIComponent(status);
        try {
          decodedStatus = decodeURIComponent(decodedStatus);
        } catch (e) {
          // Already decoded, keep as is
        }
      } catch (e) {
        decodedStatus = status;
      }
      
      // Log for debugging
      // console.log('[getIncidentsByStatus] Received status:', status);
      // console.log('[getIncidentsByStatus] Decoded status:', decodedStatus);
      
      // Map status names to the appropriate query conditions
      // Using the same staged status logic as the dashboard
      let statusCondition = '';
      if (decodedStatus === 'Pending Preparer') {
        statusCondition = "ISNULL(i.preparerStatus, '') <> 'sent'";
      } else if (decodedStatus === 'Pending Checker') {
        statusCondition = "ISNULL(i.preparerStatus, '') = 'sent' AND ISNULL(i.checkerStatus, '') <> 'approved' AND ISNULL(i.acceptanceStatus, '') <> 'approved'";
      } else if (decodedStatus === 'Pending Reviewer') {
        statusCondition = "ISNULL(i.checkerStatus, '') = 'approved' AND ISNULL(i.reviewerStatus, '') <> 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved'";
      } else if (decodedStatus === 'Pending Acceptance') {
        statusCondition = "ISNULL(i.reviewerStatus, '') = 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved'";
      } else if (decodedStatus === 'Approved') {
        statusCondition = "ISNULL(i.acceptanceStatus, '') = 'approved'";
      } else {
        // For unknown or other statuses, use computed status matching
        const escapedStatus = decodedStatus.replace(/'/g, "''");
        statusCondition = `(
          CASE 
            WHEN ISNULL(i.preparerStatus, '') <> 'sent' THEN 'Pending Preparer'
            WHEN ISNULL(i.preparerStatus, '') = 'sent' AND ISNULL(i.checkerStatus, '') <> 'approved' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Checker'
            WHEN ISNULL(i.checkerStatus, '') = 'approved' AND ISNULL(i.reviewerStatus, '') <> 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Reviewer'
            WHEN ISNULL(i.reviewerStatus, '') = 'sent' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Acceptance'
            WHEN ISNULL(i.acceptanceStatus, '') = 'approved' THEN 'Approved'
            ELSE 'Other'
          END
        ) = N'${escapedStatus}'`;
      }
      
      const query = `
        SELECT 
          i.code as incident_code,
          i.title as incident_title,
          f.name AS function_name,
          FORMAT(i.createdAt, 'yyyy-MM-ddTHH:mm:ss') as created_at
        FROM dbo.[Incidents] i
        LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
        WHERE i.isDeleted = 0 AND i.deletedAt IS NULL
          AND ${statusCondition}
          ${dateFilter}
          ${functionFilter}
        ORDER BY i.createdAt DESC
        OFFSET ${offset} ROWS
        FETCH NEXT ${limitInt} ROWS ONLY
      `;

      const result = await this.databaseService.query(query);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Incidents] i
        WHERE i.isDeleted = 0 AND i.deletedAt IS NULL
          AND ${statusCondition}
          ${dateFilter}
          ${functionFilter}
      `;
      const countResult = await this.databaseService.query(countQuery);
      const total = countResult[0]?.total || 0;
      
      // console.log('[getIncidentsByStatus] Total count:', total);

      return {
        data: result.map((row: any) => ({
          code: row.incident_code || 'N/A',
          name: row.incident_title || 'N/A',
          function_name: row.function_name || null,
          createdAt: row.created_at || null
        })),
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages: Math.ceil(total / limitInt),
          hasNext: pageInt * limitInt < total,
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error fetching incidents by status:', error);
      throw error;
    }
  }

  /**
   * Get incident action plans list with optional filter by business_unit (status).
   * Used by the "Incident Action Plan by Status" pie chart detail view.
   */
  async getIncidentActionPlans(
    user: any,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    businessUnit?: string
  ) {
    try {
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      const actionOwnerFunctionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
        'a',
        'actionOwner',
        access,
        selectedFunctionIds,
      );
      const dateFilter = this.buildDateRangeFilter(startDate, endDate, 'i.createdAt');

      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);

      let businessUnitFilter = '';
      if (businessUnit && String(businessUnit).trim()) {
        try {
          const decoded = decodeURIComponent(String(businessUnit).trim());
          const escaped = decoded.replace(/'/g, "''");
          businessUnitFilter = ` AND ISNULL(a.business_unit, N'N/A') = N'${escaped}'`;
        } catch {
          businessUnitFilter = '';
        }
      }

      const countQuery = `
        SELECT COUNT(*) AS total
        FROM dbo.[Actionplans] a
        INNER JOIN dbo.[Incidents] i ON a.incident_id = i.id
        LEFT JOIN dbo.[Functions] f_inc ON i.function_id = f_inc.id AND f_inc.isDeleted = 0 AND f_inc.deletedAt IS NULL
        LEFT JOIN dbo.[Functions] f_owner ON a.actionOwner = f_owner.id AND f_owner.isDeleted = 0 AND f_owner.deletedAt IS NULL
        WHERE a.deletedAt IS NULL
          AND a.[from] = 'incident'
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${dateFilter}
          ${actionOwnerFunctionFilter}
          ${businessUnitFilter}
      `;
      const countResult = await this.databaseService.query(countQuery);
      const total = countResult[0]?.total || 0;

      const dataQuery = `
        SELECT 
          i.title AS incident_title,
          f_inc.name AS incident_function_name,
          a.control_procedure AS action_taken,
          f_owner.name AS action_owner_name,
          a.business_unit AS business_unit_status,
          a.implementation_date AS expected_implementation_date
        FROM dbo.[Actionplans] a
        INNER JOIN dbo.[Incidents] i ON a.incident_id = i.id
        LEFT JOIN dbo.[Functions] f_inc ON i.function_id = f_inc.id
          AND f_inc.isDeleted = 0
          AND f_inc.deletedAt IS NULL
        LEFT JOIN dbo.[Functions] f_owner ON a.actionOwner = f_owner.id
          AND f_owner.isDeleted = 0
          AND f_owner.deletedAt IS NULL
        WHERE a.deletedAt IS NULL
          AND a.[from] = 'incident'
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${dateFilter}
          ${actionOwnerFunctionFilter}
          ${businessUnitFilter}
        ORDER BY a.createdAt DESC
        OFFSET ${offset} ROWS
        FETCH NEXT ${limitInt} ROWS ONLY
      `;
      const result = await this.databaseService.query(dataQuery);

      return {
        data: result.map((row: any) => ({
          incident_name: row.incident_title || 'N/A',
          name: row.incident_title || 'N/A',
          incident_department: row.incident_function_name || 'N/A',
          function_name: row.incident_function_name || null,
          action_taken: row.action_taken || row.control_procedure || '',
          action_owner: row.action_owner_name || '',
          status: row.business_unit_status || '',
          expected_implementation_date: row.expected_implementation_date || null
        })),
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages: Math.ceil(total / limitInt),
          hasNext: pageInt * limitInt < total,
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error fetching incident action plans:', error);
      throw error;
    }
  }

  async getIncidentsByMonthYear(
    user: any,
    monthYear: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[]
  ) {
    try {
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      // Parse month and year from inputs like 'Mar 2025' or '2025-03-01'
      let year: number | null = null
      let month: number | null = null
      if (monthYear) {
        // Try 'MMM yyyy'
        const m = monthYear.trim()
        const mmmYyyy = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i
        if (mmmYyyy.test(m)) {
          const [monStr, yStr] = m.split(/\s+/)
          const monMap: Record<string, number> = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }
          month = monMap[monStr.toLowerCase()] || null
          year = parseInt(yStr, 10)
        } else {
          // Try ISO date
          const d = new Date(m)
          if (!isNaN(d.valueOf())) {
            year = d.getUTCFullYear()
            month = d.getUTCMonth() + 1
          }
        }
      }

      if (!year || !month) {
        throw new Error(`Invalid monthYear: ${monthYear}`)
      }

      // Get user function access
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
        'i',
        'function_id',
        access,
        selectedFunctionIds,
      );

      const whereParts: string[] = [
        'i.isDeleted = 0',
        'i.deletedAt IS NULL',
        `YEAR(i.createdAt) = ${year}`,
        `MONTH(i.createdAt) = ${month}`
      ]
      if (startDate) whereParts.push(`i.createdAt >= '${startDate}'`)
      if (endDate) whereParts.push(`i.createdAt <= '${endDate}'`)
      const whereSql = `WHERE ${whereParts.join(' AND ')} ${functionFilter}`

      const dataQuery = `
        SELECT 
          i.code AS incident_code,
          i.title AS incident_title,
          f.name AS function_name,
          FORMAT(i.createdAt, 'yyyy-MM-ddTHH:mm:ss') AS created_at
        FROM Incidents i
        LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
        ${whereSql}
        ORDER BY i.createdAt DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
      `
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM Incidents i
        ${whereSql}
      `

      const [rows, countRows] = await Promise.all([
        this.databaseService.query(dataQuery),
        this.databaseService.query(countQuery)
      ])

      const total = countRows?.[0]?.total || 0

      return {
        data: rows.map((r: any) => ({
          code: r.incident_code || 'N/A',
          name: r.incident_title || 'N/A',
          function_name: r.function_name || null,
          createdAt: r.created_at || null
        })),
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages: Math.ceil(total / limitInt),
          hasNext: pageInt * limitInt < total,
          hasPrev: pageInt > 1
        }
      }
    } catch (error) {
      console.error('Error fetching incidents by month-year:', error)
      throw error
    }
  }

  async getIncidentsBySubCategory(
    user: any,
    subCategory: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[]
  ) {
    try {
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
      // Get user function access
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
        'i',
        'function_id',
        access,
        selectedFunctionIds,
      );

      // Build WHERE clause
      const whereParts: string[] = [
        'i.isDeleted = 0',
        'i.deletedAt IS NULL',
        'sc.deletedAt IS NULL'
      ];
      
      // Handle sub-category filter
      if (subCategory) {
        const decodedSubCategory = decodeURIComponent(subCategory);
        // Escape single quotes for SQL safety
        const escaped = decodedSubCategory.replace(/'/g, "''");
        whereParts.push(`sc.name = N'${escaped}'`);
      }
      
      if (startDate) whereParts.push(`COALESCE(i.occurrence_date, i.createdAt) >= '${startDate}'`);
      if (endDate) whereParts.push(`COALESCE(i.occurrence_date, i.createdAt) <= '${endDate}'`);
      
      // Add 12-month filter for operational loss metrics
      const operationalLossFilter = ` AND COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())`;
      
      const whereSql = `WHERE ${whereParts.join(' AND ')}${operationalLossFilter} ${functionFilter}`;
      
      const dataQuery = `
        SELECT 
          i.code,
          i.title AS name,
          f.name AS function_name,
          CASE 
            WHEN i.createdAt IS NOT NULL 
            THEN CONVERT(VARCHAR(23), i.createdAt, 126)
            ELSE NULL
          END as created_at,
          i.net_loss,
          i.recovery_amount
        FROM Incidents i
        LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
        INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
        ${whereSql}
        ORDER BY i.createdAt DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
      `;
      
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM Incidents i
        INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
        ${whereSql}
      `;
      
      const [rows, countRows] = await Promise.all([
        this.databaseService.query(dataQuery),
        this.databaseService.query(countQuery)
      ]);
      
      const total = countRows?.[0]?.total || 0;
      
      return {
        data: rows.map((r: any) => ({
          code: r.code || 'N/A',
          name: r.name || 'N/A',
          function_name: r.function_name || null,
          createdAt: r.created_at || null,
          netLoss: r.net_loss || null,
          recoveryAmount: r.recovery_amount || null
        })),
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages: Math.ceil(total / limitInt),
          hasNext: pageInt * limitInt < total,
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error fetching incidents by sub-category:', error);
      throw error;
    }
  }

  async getIncidentsWithRecognitionTime(
    user: any,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[]
  ) {
    try {
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
      // Get user function access
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
        'i',
        'function_id',
        access,
        selectedFunctionIds,
      );

      const whereParts: string[] = [
        'i.occurrence_date >= DATEADD(MONTH, -12, GETDATE())',
        'i.isDeleted = 0',
        'i.deletedAt IS NULL',
        'i.occurrence_date IS NOT NULL',
        'i.reported_date IS NOT NULL',
        'i.reported_date >= i.occurrence_date'
      ];
      
      if (startDate) whereParts.push(`i.occurrence_date >= '${startDate}'`);
      if (endDate) whereParts.push(`i.occurrence_date <= '${endDate}'`);
      
      const whereSql = `WHERE ${whereParts.join(' AND ')} ${functionFilter}`;
      
      const dataQuery = `
        SELECT 
          i.code,
          i.title AS name,
          f.name AS function_name,
          i.occurrence_date,
          i.reported_date,
          DATEDIFF(DAY, i.occurrence_date, i.reported_date) AS recognition_days,
          CAST(DATEDIFF(DAY, i.occurrence_date, i.reported_date) AS FLOAT) / 30.44 AS recognition_months
        FROM Incidents i
        LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
        ${whereSql}
        ORDER BY recognition_months DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
      `;
      
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM Incidents i
        ${whereSql}
      `;
      
      const [rows, countRows] = await Promise.all([
        this.databaseService.query(dataQuery),
        this.databaseService.query(countQuery)
      ]);
      
      const total = countRows?.[0]?.total || 0;
      
      return {
        data: rows.map((r: any) => ({
          code: r.code || 'N/A',
          name: r.name || 'N/A',
          function_name: r.function_name || null,
          occurrence_date: r.occurrence_date || null,
          reported_date: r.reported_date || null,
          recognition_time: r.recognition_days || null,
          recognition_months: r.recognition_months || null
        })),
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages: Math.ceil(total / limitInt),
          hasNext: pageInt * limitInt < total,
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error fetching incidents with recognition time:', error);
      throw error;
    }
  }

  async getIncidentsByPeriod(
    user: any,
    period: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[]
  ) {
    try {
      // Parse period format: "MM/YYYY" or "M/YYYY"
      const periodMatch = period.match(/^(\d{1,2})\/(\d{4})$/);
      if (!periodMatch) {
        throw new Error(`Invalid period format: ${period}. Expected MM/YYYY`);
      }
      
      const month = parseInt(periodMatch[1], 10);
      const year = parseInt(periodMatch[2], 10);
      
      if (month < 1 || month > 12) {
        throw new Error(`Invalid month: ${month}. Must be between 1 and 12`);
      }
      
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
      // Get user function access
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
        'i',
        'function_id',
        access,
        selectedFunctionIds,
      );

      const whereParts: string[] = [
        'i.isDeleted = 0',
        'i.deletedAt IS NULL',
        `YEAR(COALESCE(i.occurrence_date, i.createdAt)) = ${year}`,
        `MONTH(COALESCE(i.occurrence_date, i.createdAt)) = ${month}`
      ];
      
      if (startDate) whereParts.push(`COALESCE(i.occurrence_date, i.createdAt) >= '${startDate}'`);
      if (endDate) whereParts.push(`COALESCE(i.occurrence_date, i.createdAt) <= '${endDate}'`);
      
      const whereSql = `WHERE ${whereParts.join(' AND ')} ${functionFilter}`;
      
      const dataQuery = `
        SELECT 
          i.code,
          i.title AS name,
          f.name AS function_name,
          i.createdAt,
          i.net_loss,
          i.recovery_amount
        FROM Incidents i
        LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
        ${whereSql}
        ORDER BY i.createdAt DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
      `;
      
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM Incidents i
        ${whereSql}
      `;
      
      const [rows, countRows] = await Promise.all([
        this.databaseService.query(dataQuery),
        this.databaseService.query(countQuery)
      ]);
      
      const total = countRows?.[0]?.total || 0;
      
      return {
        data: rows.map((r: any) => ({
          code: r.code || 'N/A',
          name: r.name || 'N/A',
          function_name: r.function_name || null,
          createdAt: r.createdAt || null,
          netLoss: r.net_loss || null,
          recoveryAmount: r.recovery_amount || null
        })),
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages: Math.ceil(total / limitInt),
          hasNext: pageInt * limitInt < total,
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error fetching incidents by period:', error);
      throw error;
    }
  }

  async getIncidentsByPeriodAndType(
    user: any,
    period: string,
    incidentType: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[]
  ) {
    try {
      // Parse period format: "YYYY-MM" (from chart) or "MM/YYYY"
      let year: number | null = null;
      let month: number | null = null;
      
      // Try YYYY-MM format first (from chart)
      const yyyyMmMatch = period.match(/^(\d{4})-(\d{2})$/);
      if (yyyyMmMatch) {
        year = parseInt(yyyyMmMatch[1], 10);
        month = parseInt(yyyyMmMatch[2], 10);
      } else {
        // Try MM/YYYY format
        const mmYyyyMatch = period.match(/^(\d{1,2})\/(\d{4})$/);
        if (mmYyyyMatch) {
          month = parseInt(mmYyyyMatch[1], 10);
          year = parseInt(mmYyyyMatch[2], 10);
        }
      }
      
      if (!year || !month || month < 1 || month > 12) {
        throw new Error(`Invalid period format: ${period}. Expected YYYY-MM or MM/YYYY`);
      }
      
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
      // Get user function access
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
        'i',
        'function_id',
        access,
        selectedFunctionIds,
      );

      // Build WHERE clause - match chart query exactly
      const whereParts: string[] = [
        'i.isDeleted = 0',
        'i.deletedAt IS NULL',
        `YEAR(COALESCE(i.occurrence_date, i.createdAt)) = ${year}`,
        `MONTH(COALESCE(i.occurrence_date, i.createdAt)) = ${month}`
      ];
      
      // Apply 12-month filter if no startDate/endDate provided (matching chart behavior)
      if (!startDate && !endDate) {
        whereParts.push(`COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())`);
      }
      
      // Handle incident type filter - match chart's CASE statement logic exactly
      let typeFilter = '';
      if (incidentType === 'Internal Fraud') {
        typeFilter = `ie.name = N'Internal Fraud'`;
      } else if (incidentType === 'External Fraud') {
        typeFilter = `ie.name = N'External Fraud'`;
      } else if (incidentType === 'Damage to Physical Assets') {
        typeFilter = `ie.name = N'Damage to Physical Assets'`;
      } else if (incidentType === 'Human Mistake') {
        typeFilter = `sc.name = N'Human Mistake'`;
      } else if (incidentType === 'ATM issue') {
        typeFilter = `sc.name = N'ATM issue'`;
      } else if (incidentType === 'System Error') {
        typeFilter = `sc.name IN (N'System Error', N'Prime System Issue', N'Transaction system error (TRX BUG)')`;
      } else {
        throw new Error(`Unknown incident type: ${incidentType}`);
      }
      
      if (startDate) whereParts.push(`COALESCE(i.occurrence_date, i.createdAt) >= '${startDate}'`);
      if (endDate) whereParts.push(`COALESCE(i.occurrence_date, i.createdAt) <= '${endDate}'`);
      
      const whereSql = `WHERE ${whereParts.join(' AND ')} ${functionFilter} AND ${typeFilter}`;
      
      // Use LEFT JOINs on BOTH tables (matching chart query exactly)
      const joinClause = `
        LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
        LEFT JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        LEFT JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
          AND sc.deletedAt IS NULL
      `;
      
      const dataQuery = `
        SELECT 
          i.code,
          i.title AS name,
          f.name AS function_name,
          i.createdAt,
          i.net_loss,
          i.recovery_amount
        FROM Incidents i
        ${joinClause}
        ${whereSql}
        ORDER BY i.createdAt DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
      `;
      
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM Incidents i
        ${joinClause}
        ${whereSql}
      `;
      
      const [rows, countRows] = await Promise.all([
        this.databaseService.query(dataQuery),
        this.databaseService.query(countQuery)
      ]);
      
      const total = countRows?.[0]?.total || 0;
      
      return {
        data: rows.map((r: any) => ({
          code: r.code || 'N/A',
          name: r.name || 'N/A',
          function_name: r.function_name || null,
          createdAt: r.createdAt || null,
          netLoss: r.net_loss || null,
          recoveryAmount: r.recovery_amount || null
        })),
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages: Math.ceil(total / limitInt),
          hasNext: pageInt * limitInt < total,
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error fetching incidents by period and type:', error);
      throw error;
    }
  }

  async getIncidentsByComprehensiveMetric(
    user: any,
    metric: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[]
  ) {
    try {
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
      // Get user function access
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      const functionFilter = this.userFunctionAccess.buildDirectFunctionFilter(
        'i',
        'function_id',
        access,
        selectedFunctionIds,
      );

      // Build WHERE clause - match comprehensive query exactly
      const whereParts: string[] = [
        'i.isDeleted = 0',
        'i.deletedAt IS NULL'
      ];
      
      // Apply 12-month filter if no startDate/endDate provided (matching chart behavior)
      if (!startDate && !endDate) {
        whereParts.push(`COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())`);
      }
      
      if (startDate) whereParts.push(`COALESCE(i.occurrence_date, i.createdAt) >= '${startDate}'`);
      if (endDate) whereParts.push(`COALESCE(i.occurrence_date, i.createdAt) <= '${endDate}'`);
      
      // Determine which filter to apply based on metric type
      let joinClause = '';
      let metricFilter = '';
      
      if (metric === 'Total Operational Loss Incidents') {
        // No additional filter needed
        joinClause = '';
        metricFilter = '';
      } else if (metric === 'ATM Issues') {
        joinClause = `INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id AND sc.deletedAt IS NULL`;
        metricFilter = `AND sc.name = N'ATM issue'`;
      } else if (metric === 'Internal Fraud') {
        joinClause = `INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id AND ie.deletedAt IS NULL`;
        metricFilter = `AND ie.name = N'Internal Fraud'`;
      } else if (metric === 'External Fraud') {
        joinClause = `INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id AND ie.deletedAt IS NULL`;
        metricFilter = `AND ie.name = N'External Fraud'`;
      } else if (metric === 'Human Mistakes') {
        joinClause = `INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id AND sc.deletedAt IS NULL`;
        metricFilter = `AND sc.name = N'Human Mistake'`;
      } else if (metric === 'System Errors') {
        joinClause = `INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id AND sc.deletedAt IS NULL`;
        metricFilter = `AND sc.name IN (N'System Error', N'Prime System Issue', N'Transaction system error (TRX BUG)')`;
      } else {
        throw new Error(`Unknown metric type: ${metric}`);
      }
      
      const whereSql = `WHERE ${whereParts.join(' AND ')} ${functionFilter} ${metricFilter}`;
      
      const dataQuery = `
        SELECT 
          i.code,
          i.title AS name,
          f.name AS function_name,
          i.createdAt,
          i.net_loss,
          i.recovery_amount
        FROM Incidents i
        LEFT JOIN dbo.[Functions] f ON i.function_id = f.id
        ${joinClause}
        ${whereSql}
        ORDER BY i.createdAt DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
      `;
      
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM Incidents i
        ${joinClause}
        ${whereSql}
      `;
      
      const [rows, countRows] = await Promise.all([
        this.databaseService.query(dataQuery),
        this.databaseService.query(countQuery)
      ]);
      
      const total = countRows?.[0]?.total || 0;
      
      return {
        data: rows.map((r: any) => ({
          code: r.code || 'N/A',
          name: r.name || 'N/A',
          function_name: r.function_name || null,
          createdAt: r.createdAt || null,
          netLoss: r.net_loss || null,
          recoveryAmount: r.recovery_amount || null
        })),
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages: Math.ceil(total / limitInt),
          hasNext: pageInt * limitInt < total,
          hasPrev: pageInt > 1
        }
      };
    } catch (error) {
      console.error('Error fetching incidents by comprehensive metric:', error);
      throw error;
    }
  }

  private isValidDateStr(s?: string): boolean {
    return !!(s && /^\d{4}-\d{2}-\d{2}/.test(String(s).trim()));
  }

  private buildDateRangeFilter(startDate?: string, endDate?: string, field: string = 'createdAt'): string {
    let filter = '';
    if (this.isValidDateStr(startDate)) {
      filter += ` AND ${field} >= '${String(startDate).trim().slice(0, 10)}'`;
    }
    if (this.isValidDateStr(endDate)) {
      filter += ` AND ${field} <= '${String(endDate).trim().slice(0, 10)} 23:59:59'`;
    }
    return filter;
  }
}
