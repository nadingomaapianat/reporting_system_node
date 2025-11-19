import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class GrcIncidentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private buildDateFilter(timeframe?: string): string {
    if (!timeframe) return '';
    
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return '';
    }
    
    return ` AND createdAt >= '${startDate.toISOString()}'`;
  }

  async getIncidentsDashboard(timeframe?: string) {
    try {
      const dateFilter = this.buildDateFilter(timeframe);

      // Get total incidents
      const totalIncidentsQuery = `
        SELECT COUNT(*) as total
        FROM Incidents
        WHERE isDeleted = 0 ${dateFilter}
      `;
      const totalIncidentsResult = await this.databaseService.query(totalIncidentsQuery);
      const totalIncidents = totalIncidentsResult[0]?.total || 0;

      // Get incidents status counts using standardized pending rules
      const incidentsStatusCountsQuery = `
        SELECT 
          SUM(CASE WHEN ISNULL(preparerStatus, '') <> 'sent' THEN 1 ELSE 0 END) AS pendingPreparer,
          SUM(CASE WHEN ISNULL(preparerStatus, '') = 'sent' AND ISNULL(checkerStatus, '') <> 'approved' AND ISNULL(acceptanceStatus, '') <> 'approved' THEN 1 ELSE 0 END) AS pendingChecker,
          SUM(CASE WHEN ISNULL(checkerStatus, '') = 'approved' AND ISNULL(reviewerStatus, '') <> 'sent' AND ISNULL(acceptanceStatus, '') <> 'approved' THEN 1 ELSE 0 END) AS pendingReviewer,
          SUM(CASE WHEN ISNULL(reviewerStatus, '') = 'sent' AND ISNULL(acceptanceStatus, '') <> 'approved' THEN 1 ELSE 0 END) AS pendingAcceptance,
          SUM(CASE WHEN ISNULL(acceptanceStatus, '') = 'approved' THEN 1 ELSE 0 END) AS approved
        FROM Incidents
        WHERE isDeleted = 0 AND deletedAt IS NULL ${dateFilter}
      `;
      const [statusCountsRow] = await this.databaseService.query(incidentsStatusCountsQuery);

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
          WHERE i.isDeleted = 0 AND i.deletedAt IS NULL ${dateFilter}
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
      const incidentsByStatusDistribution = await this.databaseService.query(incidentsByStatusDistributionQuery);

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
        GROUP BY ISNULL(c.name, 'Unknown')
        ORDER BY COUNT(i.id) DESC
      `;
      const incidentsByCategory = await this.databaseService.query(incidentsByCategoryQuery);

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
          AND i.net_loss IS NOT NULL
          AND i.net_loss > 0
        GROUP BY fi.name
        ORDER BY net_loss DESC
      `;
      const topFinancialImpacts = await this.databaseService.query(topFinancialImpactsQuery);

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
          AND (i.net_loss IS NOT NULL OR i.recovery_amount IS NOT NULL)
        ORDER BY i.net_loss DESC
      `;
      const netLossAndRecovery = await this.databaseService.query(netLossAndRecoveryQuery);

      // Get monthly trend
      const monthlyTrendQuery = `
        SELECT 
          FORMAT(i.createdAt, 'MMM yyyy') as month_year,
          COUNT(i.id) as incident_count
        FROM Incidents i
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${dateFilter}
          AND i.createdAt IS NOT NULL
        GROUP BY FORMAT(i.createdAt, 'MMM yyyy')
        ORDER BY MIN(i.createdAt)
      `;
      const monthlyTrend = await this.databaseService.query(monthlyTrendQuery);

      // Get incidents by status
      const incidentsByStatusQuery = `
        SELECT 
          i.status AS status, 
          COUNT(*) AS count 
        FROM 
          Incidents i
        WHERE 
          i.isDeleted = 0 ${dateFilter}
        GROUP BY 
          i.status 
        ORDER BY 
          i.status ASC
      `;
      const incidentsByStatus = await this.databaseService.query(incidentsByStatusQuery);

      // Calculate status counts
      const pendingPreparer = statusCountsRow?.pendingPreparer || 0;
      const pendingChecker = statusCountsRow?.pendingChecker || 0;
      const pendingReviewer = statusCountsRow?.pendingReviewer || 0;
      const pendingAcceptance = statusCountsRow?.pendingAcceptance || 0;

      // Fetch statusOverview (details list) using standardized staged status logic
      const listQuery = `
        SELECT 
          i.code,
          i.title,
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
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${dateFilter}
        ORDER BY i.createdAt DESC
      `;
      const statusOverview = await this.databaseService.query(listQuery);

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
      `;
      const incidentsFinancialDetails = await this.databaseService.query(incidentsFinancialDetailsQuery);

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
        GROUP BY 
          ISNULL(ie.name, 'Unknown')
        ORDER BY 
          COUNT(i.id) DESC
      `;
      const incidentsByEventType = await this.databaseService.query(incidentsByEventTypeQuery);

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
        GROUP BY 
          ISNULL(fi.name, 'Unknown')
        ORDER BY 
          COUNT(i.id) DESC
      `;
      const incidentsByFinancialImpact = await this.databaseService.query(incidentsByFinancialImpactQuery);

      // Get incidents time series by month
      const incidentsTimeSeriesQuery = `
        WITH month_series AS ( 
          SELECT  
            DATEFROMPARTS(YEAR(MIN(createdAt)), MONTH(MIN(createdAt)), 1) AS start_month, 
            DATEFROMPARTS(YEAR(MAX(createdAt)), MONTH(MAX(createdAt)), 1) AS end_month 
          FROM Incidents 
          WHERE isDeleted = 0 AND deletedAt IS NULL ${dateFilter}
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
        GROUP BY  
          m.month_date 
        ORDER BY  
          m.month_date 
        OPTION (MAXRECURSION 0)
      `;
      const incidentsTimeSeries = await this.databaseService.query(incidentsTimeSeriesQuery);

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
      const newIncidentsByMonth = await this.databaseService.query(newIncidentsByMonthQuery);

      // Get incidents with timeframe
      const incidentsWithTimeframeQuery = `
        SELECT 
          i.title AS incident_name, 
          i.timeFrame AS time_frame 
        FROM Incidents i
        WHERE i.isDeleted = 0 ${dateFilter}
          AND i.deletedAt IS NULL
        ORDER BY i.timeFrame DESC
      `;
      const incidentsWithTimeframe = await this.databaseService.query(incidentsWithTimeframeQuery);

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
          AND i.deletedAt IS NULL
      `;
      const incidentsWithFinancialAndFunction = await this.databaseService.query(incidentsWithFinancialAndFunctionQuery);

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
          AND i.net_loss IS NOT NULL
        GROUP BY YEAR(i.occurrence_date), MONTH(i.occurrence_date)
        ORDER BY [Year], [Month]
      `;
      const operationalLossValue = await this.databaseService.query(operationalLossValueQuery);

      // 2. Number of ATM theft events
      const atmTheftCountQuery = `
        SELECT COUNT(*) AS ATMTheftCount
        FROM Incidents i
        INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
          AND sc.deletedAt IS NULL
        WHERE i.isDeleted = 0
          AND i.deletedAt IS NULL
          ${operationalLossDateFilter}
          AND sc.name = N'ATM issue'
      `;
      const atmTheftResult = await this.databaseService.query(atmTheftCountQuery);
      const atmTheftCount = atmTheftResult[0]?.ATMTheftCount || 0;

      // 3. Average time to recognize operational losses (in months)
      const avgRecognitionTimeQuery = `
        SELECT CAST(AVG(CAST(DATEDIFF(DAY, i.occurrence_date, i.reported_date) AS FLOAT)) / 30.44 AS DECIMAL(10,2))
               AS AvgRecognitionTimeMonths
        FROM Incidents i
        WHERE i.occurrence_date >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL
          AND i.occurrence_date IS NOT NULL
          AND i.reported_date IS NOT NULL
          AND i.reported_date >= i.occurrence_date
      `;
      const avgRecognitionTimeResult = await this.databaseService.query(avgRecognitionTimeQuery);
      const avgRecognitionTime = avgRecognitionTimeResult[0]?.AvgRecognitionTimeMonths || 0;

      // 4. Number of internal frauds
      const internalFraudCountQuery = `
        SELECT COUNT(*) AS InternalFraudCount
        FROM Incidents i
        INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        WHERE COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0 
          AND i.deletedAt IS NULL
          AND ie.name = N'Internal Fraud'
      `;
      const internalFraudResult = await this.databaseService.query(internalFraudCountQuery);
      const internalFraudCount = internalFraudResult[0]?.InternalFraudCount || 0;

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
          AND ie.name = N'Internal Fraud'
          AND i.net_loss IS NOT NULL
      `;
      const internalFraudLossResult = await this.databaseService.query(internalFraudLossQuery);
      const internalFraudLoss = internalFraudLossResult[0]?.TotalInternalFraudLoss || 0;

      // 6. Number of external frauds
      const externalFraudCountQuery = `
        SELECT COUNT(*) AS ExternalFraudCount
        FROM Incidents i
        INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${operationalLossDateFilter}
          AND ie.name = N'External Fraud'
      `;
      const externalFraudResult = await this.databaseService.query(externalFraudCountQuery);
      const externalFraudCount = externalFraudResult[0]?.ExternalFraudCount || 0;

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
          AND ie.name = N'External Fraud'
          AND i.net_loss IS NOT NULL
      `;
      const externalFraudLossResult = await this.databaseService.query(externalFraudLossQuery);
      const externalFraudLoss = externalFraudLossResult[0]?.TotalExternalFraudLoss || 0;

      // 8. Number of events that caused damages to physical assets
      const physicalAssetDamageCountQuery = `
        SELECT COUNT(*) AS PhysicalAssetDamageCount
        FROM Incidents i
        INNER JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${operationalLossDateFilter}
          AND ie.name = N'Damage to Physical Assets'
      `;
      const physicalAssetDamageResult = await this.databaseService.query(physicalAssetDamageCountQuery);
      const physicalAssetDamageCount = physicalAssetDamageResult[0]?.PhysicalAssetDamageCount || 0;

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
          AND ie.name = N'Damage to Physical Assets'
          AND i.net_loss IS NOT NULL
      `;
      const physicalAssetLossResult = await this.databaseService.query(physicalAssetLossQuery);
      const physicalAssetLoss = physicalAssetLossResult[0]?.TotalPhysicalAssetLoss || 0;

      // 10. Number of loss events due to people errors
      const peopleErrorCountQuery = `
        SELECT COUNT(*) AS PeopleErrorCount
        FROM Incidents i
        INNER JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
          AND sc.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${operationalLossDateFilter}
          AND sc.name = N'Human Mistake'
      `;
      const peopleErrorResult = await this.databaseService.query(peopleErrorCountQuery);
      const peopleErrorCount = peopleErrorResult[0]?.PeopleErrorCount || 0;

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
          AND sc.name = N'Human Mistake'
          AND i.net_loss IS NOT NULL
      `;
      const peopleErrorLossResult = await this.databaseService.query(peopleErrorLossQuery);
      const peopleErrorLoss = peopleErrorLossResult[0]?.TotalPeopleErrorLoss || 0;

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
        GROUP BY FORMAT(COALESCE(i.occurrence_date, i.createdAt), 'yyyy-MM')
        ORDER BY Period
      `;
      const monthlyTrendByType = await this.databaseService.query(monthlyTrendByTypeQuery);

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
          AND i.net_loss IS NOT NULL
        GROUP BY c.name
        ORDER BY TotalLoss DESC
      `;
      const lossByRiskCategory = await this.databaseService.query(lossByRiskCategoryQuery);

      // 12. Comprehensive Operational Loss Dashboard (UNION ALL)
      const comprehensiveOperationalLossQuery = `
        SELECT 
          'Total Operational Loss Incidents' as Metric,
          COUNT(*) as Count,
          CAST(SUM(COALESCE(i.net_loss, 0)) AS DECIMAL(18,2)) as TotalValue
        FROM Incidents i
        WHERE COALESCE(i.occurrence_date, i.createdAt) >= DATEADD(MONTH, -12, GETDATE())
          AND i.isDeleted = 0
          AND i.deletedAt IS NULL

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
          AND sc.name IN (N'System Error', N'Prime System Issue', N'Transaction system error (TRX BUG)')
      `;
      const comprehensiveOperationalLoss = await this.databaseService.query(comprehensiveOperationalLossQuery);

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
          time_frame: item.time_frame || ''
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
        }))
      };
    } catch (error) {
      console.error('Error fetching incidents dashboard data:', error);
      throw error;
    }
  }

  async exportIncidents(format: string, timeframe?: string) {
    // This would integrate with the Python export service
    // For now, return a placeholder response
    return {
      message: `Exporting incidents data in ${format} format`,
      timeframe: timeframe || 'all',
      status: 'success'
    };
  }

  async getTotalIncidents(page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = ["i.isDeleted = 0"]
    if (startDate) where.push(`i.createdAt >= '${startDate}'`)
    if (endDate) where.push(`i.createdAt <= '${endDate}'`)
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`
    const totalRes = await this.databaseService.query(countQuery)
    const total = totalRes?.[0]?.total || 0

    const dataQuery = `
      SELECT 
        i.code,
        i.title,
        CASE 
          WHEN i.acceptanceStatus = 'approved' THEN 'approved'
          WHEN i.reviewerStatus = 'sent' THEN 'sent'
          WHEN i.checkerStatus = 'approved' THEN 'approved'
          ELSE ISNULL(i.preparerStatus, i.acceptanceStatus)
        END as status,
        i.createdAt
      FROM Incidents i
      ${whereSql}
      ORDER BY i.createdAt DESC
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

  async getPendingPreparerIncidents(page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = ["i.isDeleted = 0", "i.deletedAt IS NULL", "ISNULL(i.preparerStatus, '') <> 'sent'"]
    if (startDate) where.push(`i.createdAt >= '${startDate}'`)
    if (endDate) where.push(`i.createdAt <= '${endDate}'`)
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`
    const totalRes = await this.databaseService.query(countQuery)
    const total = totalRes?.[0]?.total || 0

    const dataQuery = `
      SELECT 
        i.code,
        i.title,
        'Pending Preparer' as status,
        i.createdAt
      FROM Incidents i
      ${whereSql}
      ORDER BY i.createdAt DESC
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

  async getPendingCheckerIncidents(page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
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
    if (startDate) where.push(`i.createdAt >= '${startDate}'`)
    if (endDate) where.push(`i.createdAt <= '${endDate}'`)
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`
    const totalRes = await this.databaseService.query(countQuery)
    const total = totalRes?.[0]?.total || 0

    const dataQuery = `
      SELECT 
        i.code,
        i.title,
        'Pending Checker' as status,
        i.createdAt
      FROM Incidents i
      ${whereSql}
      ORDER BY i.createdAt DESC
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

  async getPendingReviewerIncidents(page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
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
    if (startDate) where.push(`i.createdAt >= '${startDate}'`)
    if (endDate) where.push(`i.createdAt <= '${endDate}'`)
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`
    const totalRes = await this.databaseService.query(countQuery)
    const total = totalRes?.[0]?.total || 0

    const dataQuery = `
      SELECT 
        i.code,
        i.title,
        'Pending Reviewer' as status,
        i.createdAt
      FROM Incidents i
      ${whereSql}
      ORDER BY i.createdAt DESC
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

  async getPendingAcceptanceIncidents(page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
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
    if (startDate) where.push(`i.createdAt >= '${startDate}'`)
    if (endDate) where.push(`i.createdAt <= '${endDate}'`)
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`
    const totalRes = await this.databaseService.query(countQuery)
    const total = totalRes?.[0]?.total || 0

    const dataQuery = `
      SELECT 
        i.code,
        i.title,
        'Pending Acceptance' as status,
        i.createdAt
      FROM Incidents i
      ${whereSql}
      ORDER BY i.createdAt DESC
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
    category: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string
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
      console.log('[getIncidentsByCategory] Received category:', category);
      console.log('[getIncidentsByCategory] Decoded category:', decodedCategory);
      
      const dateFilter = this.buildDateRangeFilter(startDate, endDate, 'i.createdAt');
      
      // Escape special characters for SQL
      const escapedForExact = decodedCategory.replace(/'/g, "''");
      
      // Build WHERE clause - match chart query exactly (same as incidentsByCategoryQuery)
      const whereSql = `WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          AND ISNULL(c.name, 'Unknown') = N'${escapedForExact}'
          ${dateFilter}`;
      
      // Use LEFT JOIN with Categories table (matching chart query exactly)
      const query = `
        SELECT 
          i.code,
          i.title AS name,
          i.createdAt,
          i.net_loss,
          i.recovery_amount
        FROM Incidents i
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
      
      console.log('[getIncidentsByCategory] Total count:', total);

      return {
        data: result.map((row: any) => ({
          code: row.code || 'N/A',
          name: row.name || 'N/A',
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
    eventType: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ) {
    try {
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
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
          FORMAT(i.createdAt, 'yyyy-MM-ddTHH:mm:ss') as created_at,
          i.net_loss,
          i.recovery_amount
        FROM dbo.[Incidents] i
        LEFT JOIN dbo.[IncidentEvents] ie ON i.event_type_id = ie.id AND ie.isDeleted = 0 AND ie.deletedAt IS NULL
        WHERE i.isDeleted = 0 AND i.deletedAt IS NULL
          ${eventTypeFilter}
          ${dateFilter}
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
      `;
      
      const countParams = eventType === 'Unknown' || eventType === 'unknown' ? [] : [eventType];
      const countResult = await this.databaseService.query(countQuery, countParams);
      const total = countResult[0]?.total || 0;

      return {
        data: result.map((row: any) => ({
          code: row.incident_code || 'N/A',
          name: row.incident_title || 'N/A',
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
    financialImpact: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ) {
    try {
      const dateFilter = this.buildDateRangeFilter(startDate, endDate, 'i.createdAt');
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
      const query = `
        SELECT 
          i.code as incident_code,
          i.title as incident_title,
          FORMAT(i.createdAt, 'yyyy-MM-ddTHH:mm:ss') as created_at,
          ISNULL(i.net_loss, 0) as net_loss,
          ISNULL(i.recovery_amount, 0) as recovery_amount
        FROM dbo.[Incidents] i
        LEFT JOIN dbo.[FinancialImpacts] fi ON i.financial_impact_id = fi.id AND fi.isDeleted = 0 AND fi.deletedAt IS NULL
        WHERE i.isDeleted = 0 AND i.deletedAt IS NULL
          AND ISNULL(fi.name, 'Unknown') = @param0
          ${dateFilter}
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
      `;
      const countResult = await this.databaseService.query(countQuery, [financialImpact]);
      const total = countResult[0]?.total || 0;

      return {
        data: result.map((row: any) => ({
          code: row.incident_code || 'N/A',
          name: row.incident_title || 'N/A',
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
    status: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ) {
    try {
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
      console.log('[getIncidentsByStatus] Received status:', status);
      console.log('[getIncidentsByStatus] Decoded status:', decodedStatus);
      
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
          FORMAT(i.createdAt, 'yyyy-MM-ddTHH:mm:ss') as created_at
        FROM dbo.[Incidents] i
        WHERE i.isDeleted = 0 AND i.deletedAt IS NULL
          AND ${statusCondition}
          ${dateFilter}
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
      `;
      const countResult = await this.databaseService.query(countQuery);
      const total = countResult[0]?.total || 0;
      
      console.log('[getIncidentsByStatus] Total count:', total);

      return {
        data: result.map((row: any) => ({
          code: row.incident_code || 'N/A',
          name: row.incident_title || 'N/A',
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

  async getIncidentsByMonthYear(
    monthYear: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string
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

      const whereParts: string[] = [
        'i.isDeleted = 0',
        'i.deletedAt IS NULL',
        `YEAR(i.createdAt) = ${year}`,
        `MONTH(i.createdAt) = ${month}`
      ]
      if (startDate) whereParts.push(`i.createdAt >= '${startDate}'`)
      if (endDate) whereParts.push(`i.createdAt <= '${endDate}'`)
      const whereSql = `WHERE ${whereParts.join(' AND ')}`

      const dataQuery = `
        SELECT 
          i.code AS incident_code,
          i.title AS incident_title,
          FORMAT(i.createdAt, 'yyyy-MM-ddTHH:mm:ss') AS created_at
        FROM Incidents i
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
    subCategory: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ) {
    try {
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
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
      
      const whereSql = `WHERE ${whereParts.join(' AND ')}${operationalLossFilter}`;
      
      const dataQuery = `
        SELECT 
          i.code,
          i.title AS name,
          CASE 
            WHEN i.createdAt IS NOT NULL 
            THEN CONVERT(VARCHAR(23), i.createdAt, 126)
            ELSE NULL
          END as created_at,
          i.net_loss,
          i.recovery_amount
        FROM Incidents i
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
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ) {
    try {
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
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
      
      const whereSql = `WHERE ${whereParts.join(' AND ')}`;
      
      const dataQuery = `
        SELECT 
          i.code,
          i.title AS name,
          i.occurrence_date,
          i.reported_date,
          DATEDIFF(DAY, i.occurrence_date, i.reported_date) AS recognition_days,
          CAST(DATEDIFF(DAY, i.occurrence_date, i.reported_date) AS FLOAT) / 30.44 AS recognition_months
        FROM Incidents i
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
    period: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string
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
      
      const whereParts: string[] = [
        'i.isDeleted = 0',
        'i.deletedAt IS NULL',
        `YEAR(COALESCE(i.occurrence_date, i.createdAt)) = ${year}`,
        `MONTH(COALESCE(i.occurrence_date, i.createdAt)) = ${month}`
      ];
      
      if (startDate) whereParts.push(`COALESCE(i.occurrence_date, i.createdAt) >= '${startDate}'`);
      if (endDate) whereParts.push(`COALESCE(i.occurrence_date, i.createdAt) <= '${endDate}'`);
      
      const whereSql = `WHERE ${whereParts.join(' AND ')}`;
      
      const dataQuery = `
        SELECT 
          i.code,
          i.title AS name,
          i.createdAt,
          i.net_loss,
          i.recovery_amount
        FROM Incidents i
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
    period: string,
    incidentType: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string
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
      
      const whereSql = `WHERE ${whereParts.join(' AND ')} AND ${typeFilter}`;
      
      // Use LEFT JOINs on BOTH tables (matching chart query exactly)
      const joinClause = `
        LEFT JOIN IncidentEvents ie ON i.event_type_id = ie.id
          AND ie.deletedAt IS NULL
        LEFT JOIN IncidentSubCategories sc ON i.sub_category_id = sc.id
          AND sc.deletedAt IS NULL
      `;
      
      const dataQuery = `
        SELECT 
          i.code,
          i.title AS name,
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
    metric: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ) {
    try {
      // Ensure page and limit are integers
      const pageInt = Math.floor(Number(page)) || 1;
      const limitInt = Math.floor(Number(limit)) || 10;
      const offset = Math.floor((pageInt - 1) * limitInt);
      
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
      
      const whereSql = `WHERE ${whereParts.join(' AND ')} ${metricFilter}`;
      
      const dataQuery = `
        SELECT 
          i.code,
          i.title AS name,
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

  private buildDateRangeFilter(startDate?: string, endDate?: string, field: string = 'createdAt'): string {
    let filter = '';
    if (startDate) {
      filter += ` AND ${field} >= '${startDate}'`;
    }
    if (endDate) {
      filter += ` AND ${field} <= '${endDate}'`;
    }
    return filter;
  }
}
