import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UserFunctionAccessService, UserFunctionAccess } from '../shared/user-function-access.service';
import { fq } from '../shared/db-config';

@Injectable()
export class GrcKrisService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly userFunctionAccess: UserFunctionAccessService,
  ) {}

  private buildDateFilter(timeframe?: string, startDate?: string, endDate?: string): string {
    // If startDate and endDate are provided, use them
    if (startDate || endDate) {
      let filter = '';
      if (startDate) {
        filter += ` AND k.createdAt >= '${startDate}'`;
      }
      if (endDate) {
        // Add one day to endDate to include the entire end date
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        filter += ` AND k.createdAt < '${endDateObj.toISOString()}'`;
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
    
    return ` AND k.createdAt >= '${startDateObj.toISOString()}'`;
  }

  async getKrisDashboard(user: any, timeframe?: string, startDate?: string, endDate?: string, functionId?: string) {
    try {
      // console.log('[getKrisDashboard] Received parameters:', { timeframe, startDate, endDate, functionId, userId: user.id, groupName: user.groupName });
      
      const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
      // console.log('[getKrisDashboard] Date filter:', dateFilter);

      // Get user function access (super_admin_ sees everything)
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      // console.log('[getKrisDashboard] User access:', { isSuperAdmin: access.isSuperAdmin, functionIds: access.functionIds });
      
      const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
      // console.log('[getKrisDashboard] Function filter:', functionFilter);

      // Total KRIs (count)
      const totalKrisQuery = `
        SELECT COUNT(*) AS total
        FROM Kris k
        WHERE k.isDeleted = 0
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
      `;
      let totalKris = 0;
      try {
        const totalKrisResult = await this.databaseService.query(totalKrisQuery);
        totalKris = totalKrisResult[0]?.total || 0;
      } catch (e) {
        console.error('KRIs total query failed:', e);
      }

      // KRIs status counts (same logic as incidents - staged status counts, using CTE for accuracy)
      const krisStatusCountsQuery = `
        WITH KrisStatus AS (
          SELECT 
            CASE 
              WHEN ISNULL(k.preparerStatus, '') <> 'sent' THEN 'pendingPreparer'
              WHEN ISNULL(k.preparerStatus, '') = 'sent' AND ISNULL(k.checkerStatus, '') <> 'approved' AND ISNULL(k.acceptanceStatus, '') <> 'approved' THEN 'pendingChecker'
              WHEN ISNULL(k.checkerStatus, '') = 'approved' AND ISNULL(k.reviewerStatus, '') <> 'sent' AND ISNULL(k.acceptanceStatus, '') <> 'approved' THEN 'pendingReviewer'
              WHEN ISNULL(k.reviewerStatus, '') = 'sent' AND ISNULL(k.acceptanceStatus, '') <> 'approved' THEN 'pendingAcceptance'
              WHEN ISNULL(k.acceptanceStatus, '') = 'approved' THEN 'approved'
              ELSE 'Other'
            END AS status
          FROM Kris k
          WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
            ${dateFilter}
            ${functionFilter}
        )
        SELECT 
          CAST(SUM(CASE WHEN status = 'pendingPreparer' THEN 1 ELSE 0 END) AS INT) AS pendingPreparer,
          CAST(SUM(CASE WHEN status = 'pendingChecker' THEN 1 ELSE 0 END) AS INT) AS pendingChecker,
          CAST(SUM(CASE WHEN status = 'pendingReviewer' THEN 1 ELSE 0 END) AS INT) AS pendingReviewer,
          CAST(SUM(CASE WHEN status = 'pendingAcceptance' THEN 1 ELSE 0 END) AS INT) AS pendingAcceptance,
          CAST(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS INT) AS approved
        FROM KrisStatus
      `;
      let statusCountsRow: any = {};
      try {
        const [statusCountsResult] = await this.databaseService.query(krisStatusCountsQuery);
        statusCountsRow = statusCountsResult || {};
        // console.log('[KRI Dashboard] Status counts query result:', JSON.stringify(statusCountsRow));
      } catch (e) {
        console.error('KRIs status counts query failed:', e);
      }

      // KRIs by level (use kri_level if present else derive from latest kv vs thresholds)
      const krisByLevelQuery = `
        WITH LatestKV AS (
          SELECT kv.kriId,
                 kv.value,
                 ROW_NUMBER() OVER (PARTITION BY kv.kriId ORDER BY COALESCE(CONVERT(datetime, CONCAT(kv.[year], '-', kv.[month], '-01')), kv.createdAt) DESC) rn
          FROM KriValues kv
          WHERE kv.deletedAt IS NULL
        ),
        K AS (
          SELECT k.id,
                 k.kri_level,
                 CAST(k.isAscending AS int) AS isAscending,
                 TRY_CONVERT(float, k.medium_from) AS med_thr,
                 TRY_CONVERT(float, k.high_from)   AS high_thr
          FROM Kris k
          WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
            ${dateFilter}
            ${functionFilter}
        ),
        KL AS (
          SELECT K.id, K.kri_level, K.isAscending, K.med_thr, K.high_thr,
                 TRY_CONVERT(float, kv.value) AS val
          FROM K
          LEFT JOIN LatestKV kv ON kv.kriId = K.id AND kv.rn = 1
        ),
        Derived AS (
          SELECT CASE
                   WHEN kri_level IS NOT NULL AND LTRIM(RTRIM(kri_level)) <> '' THEN kri_level
                   WHEN val IS NULL OR med_thr IS NULL OR high_thr IS NULL THEN 'Unknown'
                   WHEN isAscending = 1 AND val >= high_thr THEN 'High'
                   WHEN isAscending = 1 AND val >= med_thr THEN 'Medium'
                   WHEN isAscending = 1 THEN 'Low'
                   WHEN isAscending = 0 AND val <= high_thr THEN 'High'
                   WHEN isAscending = 0 AND val <= med_thr THEN 'Medium'
                   ELSE 'Low'
                 END AS level_bucket
          FROM KL
        )
        SELECT level_bucket AS level, COUNT(*) AS count
        FROM Derived
        GROUP BY level_bucket
        ORDER BY count DESC
      `;
      let krisByLevel: any[] = [];
      try {
        krisByLevel = await this.databaseService.query(krisByLevelQuery);
      } catch (e) {
        console.error('KRIs by level query failed:', e);
      }

      // KRIs by function (simplified - just count KRIs per function)
      const breachedKRIsByDepartmentQuery = `
        SELECT 
          ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
          COUNT(k.id) AS breached_count
        FROM Kris k
        LEFT JOIN KriFunctions kf
          ON kf.kri_id = k.id
          AND kf.deletedAt IS NULL
        LEFT JOIN Functions fkf
          ON fkf.id = kf.function_id
          AND fkf.isDeleted = 0
          AND fkf.deletedAt IS NULL
        LEFT JOIN Functions frel
          ON frel.id = k.related_function_id
          AND frel.isDeleted = 0
          AND frel.deletedAt IS NULL
        WHERE k.isDeleted = 0 
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        GROUP BY ISNULL(COALESCE(fkf.name, frel.name), 'Unknown')
        ORDER BY breached_count DESC
      `;
      let breachedKRIsByDepartment: any[] = [];
      try {
        breachedKRIsByDepartment = await this.databaseService.query(breachedKRIsByDepartmentQuery);
      } catch (e) {
        console.error('Breached KRIs by function query failed:', e);
      }

      // KRI health status (list)
      const kriHealthQuery = `
        SELECT
          k.kriName,
          k.status,
          COALESCE(k.kri_level, 'Unknown') AS kri_level,
          COALESCE(fkf.name, frel.name, 'Unknown') AS function_name,
          k.threshold,
          k.frequency
        FROM Kris k
        LEFT JOIN KriFunctions kf ON k.id = kf.kri_id
        LEFT JOIN Functions fkf ON fkf.id = kf.function_id
        LEFT JOIN Functions frel ON frel.id = k.related_function_id
        WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        ORDER BY k.createdAt DESC
      `;
      let kriHealth: any[] = [];
      try {
        kriHealth = await this.databaseService.query(kriHealthQuery);
      } catch (e) {
        console.error('KRI health query failed:', e);
      }

      // KRI assessment count by function (count assessments from KriValues table)
      const kriAssessmentCountQuery = `
        SELECT
          ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
          COUNT(kv.id) AS assessment_count
        FROM KriValues kv
        INNER JOIN Kris k ON kv.kriId = k.id
          AND k.isDeleted = 0 
          AND k.deletedAt IS NULL
        LEFT JOIN KriFunctions kf ON k.id = kf.kri_id
          AND kf.deletedAt IS NULL
        LEFT JOIN Functions fkf ON fkf.id = kf.function_id
          AND fkf.isDeleted = 0
          AND fkf.deletedAt IS NULL
        LEFT JOIN Functions frel ON frel.id = k.related_function_id
          AND frel.isDeleted = 0
          AND frel.deletedAt IS NULL
        WHERE kv.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        GROUP BY ISNULL(COALESCE(fkf.name, frel.name), 'Unknown')
        ORDER BY assessment_count DESC
      `;
      let kriAssessmentCount: any[] = [];
      try {
        kriAssessmentCount = await this.databaseService.query(kriAssessmentCountQuery);
      } catch (e) {
        console.error('KRI assessment count query failed:', e);
      }

      // Monthly KRI counts grouped by assessment
      const kriMonthlyAssessmentQuery = `
        SELECT
          FORMAT(kv.createdAt, 'MMM yyyy') AS month,
          CAST(DATEADD(month, DATEPART(month, kv.createdAt) - 1, DATEFROMPARTS(YEAR(kv.createdAt), 1, 1)) AS datetime2) AS createdAt,
          kv.assessment AS assessment,
          COUNT(kv.id) AS count
        FROM Kris AS k
        INNER JOIN KriValues AS kv
          ON kv.kriId = k.id
          AND kv.deletedAt IS NULL
        WHERE
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          AND kv.assessment IS NOT NULL
          ${dateFilter}
          ${functionFilter}
        GROUP BY
          FORMAT(kv.createdAt, 'MMM yyyy'),
          CAST(DATEADD(month, DATEPART(month, kv.createdAt) - 1, DATEFROMPARTS(YEAR(kv.createdAt), 1, 1)) AS datetime2),
          kv.assessment
        ORDER BY
          createdAt ASC,
          assessment ASC
      `;
      let kriMonthlyAssessment: any[] = [];
      try {
        kriMonthlyAssessment = await this.databaseService.query(kriMonthlyAssessmentQuery);
      } catch (e) {
        console.error('KRI monthly assessment query failed:', e);
      }

      // Number of Newly Created KRIs per Month
      const newlyCreatedKrisPerMonthQuery = `
        SELECT 
          CAST(DATEFROMPARTS(YEAR(k.createdAt), MONTH(k.createdAt), 1) AS datetime2) AS createdAt,
          COUNT(*) AS count
        FROM Kris k
        WHERE
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          ${functionFilter}
        GROUP BY
          CAST(DATEFROMPARTS(YEAR(k.createdAt), MONTH(k.createdAt), 1) AS datetime2)
        ORDER BY
          createdAt ASC
      `;
      let newlyCreatedKrisPerMonth: any[] = [];
      try {
        newlyCreatedKrisPerMonth = await this.databaseService.query(newlyCreatedKrisPerMonthQuery);
      } catch (e) {
        console.error('Newly created KRIs per month query failed:', e);
      }

      // Number of Deleted KRIs by Month
      const deletedKrisPerMonthQuery = `
        SELECT 
          CAST(DATEFROMPARTS(YEAR(k.createdAt), MONTH(k.createdAt), 1) AS datetime2) AS createdAt,
          COUNT(*) AS count
        FROM Kris k
        WHERE
          k.isDeleted = 1
          OR k.deletedAt IS NOT NULL
        GROUP BY 
          YEAR(k.createdAt),
          MONTH(k.createdAt)
        ORDER BY 
          YEAR(k.createdAt) ASC,
          MONTH(k.createdAt) ASC
      `;
      let deletedKrisPerMonth: any[] = [];
      try {
        deletedKrisPerMonth = await this.databaseService.query(deletedKrisPerMonthQuery);
      } catch (e) {
        console.error('Deleted KRIs per month query failed:', e);
      }

      // KRIs Overdue vs Not Overdue based on related Action Plans
      const kriOverdueStatusCountsQuery = `
        WITH classified AS (
          SELECT
            k.id,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM Actionplans ap
                WHERE ap.kri_id = k.id
                  AND ap.deletedAt IS NULL
                  AND ap.implementation_date < GETDATE()
                  AND (ap.done = 0 OR ap.done IS NULL)
              ) THEN 'Overdue'
              ELSE 'Not Overdue'
            END AS KRIStatus
          FROM Kris AS k
          WHERE k.isDeleted = 0
            AND k.deletedAt IS NULL
            ${dateFilter}
            ${functionFilter}
        )
        SELECT
          KRIStatus AS [KRI Status],
          COUNT(*)  AS [Count]
        FROM classified
        GROUP BY KRIStatus
      `;
      let kriOverdueStatusCountsRows: any[] = [];
      try {
        kriOverdueStatusCountsRows = await this.databaseService.query(kriOverdueStatusCountsQuery);
      } catch (e) {
        console.error('KRI overdue status counts query failed:', e);
      }

      // Overdue KRIs by Function
      const overdueKrisByDepartmentQuery = `
        SELECT DISTINCT 
          k.code      AS [KRI Code], 
          k.kriName   AS [KRI Name], 
          ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS [Function]
        FROM Kris AS k
        INNER JOIN Actionplans AS ap
          ON ap.kri_id = k.id
          AND ap.deletedAt IS NULL
          AND ap.implementation_date < GETDATE()
          AND (ap.done = 0 OR ap.done IS NULL)
        LEFT JOIN KriFunctions AS kf
          ON k.id = kf.kri_id
          AND kf.deletedAt IS NULL
        LEFT JOIN Functions AS fkf
          ON fkf.id = kf.function_id
          AND fkf.isDeleted = 0
          AND fkf.deletedAt IS NULL
        LEFT JOIN Functions AS frel
          ON frel.id = k.related_function_id
          AND frel.isDeleted = 0
          AND frel.deletedAt IS NULL
        WHERE 
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        ORDER BY 
          [Function], [KRI Name]
      `;
      let overdueKrisByDepartmentRows: any[] = [];
      try {
        overdueKrisByDepartmentRows = await this.databaseService.query(overdueKrisByDepartmentQuery);
      } catch (e) {
        console.error('Overdue KRIs by department query failed:', e);
      }

      // All KRIs Submitted by Function
      const allKrisSubmittedByFunctionQuery = `
        SELECT
          ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS [Function Name],
          COUNT(k.id) AS [Total KRIs],
          COUNT(CASE
            WHEN ISNULL(k.preparerStatus, '') = 'sent'
             AND ISNULL(k.acceptanceStatus, '') = 'approved'
            THEN 1 END) AS [Submitted KRIs],
          CASE
            WHEN COUNT(k.id) = COUNT(CASE
              WHEN ISNULL(k.preparerStatus, '') = 'sent'
               AND ISNULL(k.acceptanceStatus, '') = 'approved'
              THEN 1 END)
            THEN 'Yes' ELSE 'No'
          END AS [All KRIs Submitted?]
        FROM Kris AS k
        LEFT JOIN KriFunctions AS kf
          ON k.id = kf.kri_id
          AND kf.deletedAt IS NULL
        LEFT JOIN Functions AS fkf
          ON fkf.id = kf.function_id
          AND fkf.isDeleted = 0
          AND fkf.deletedAt IS NULL
        LEFT JOIN Functions AS frel
          ON frel.id = k.related_function_id
          AND frel.isDeleted = 0
          AND frel.deletedAt IS NULL
        WHERE
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        GROUP BY ISNULL(COALESCE(fkf.name, frel.name), 'Unknown')
        ORDER BY ISNULL(COALESCE(fkf.name, frel.name), 'Unknown')
      `;
      let allKrisSubmittedByFunctionRows: any[] = [];
      try {
        allKrisSubmittedByFunctionRows = await this.databaseService.query(allKrisSubmittedByFunctionQuery);
      } catch (e) {
        console.error('All KRIs submitted by function query failed:', e);
      }

      // KRI counts by Month and Year
      const kriCountsByMonthYearQuery = `
        SELECT  
          FORMAT(k.createdAt, 'MMM yyyy') AS month_year,
          DATENAME(month, k.createdAt) AS month_name, 
          YEAR(k.createdAt) AS year, 
          COUNT(*) AS kri_count 
        FROM Kris k 
        WHERE k.isDeleted = 0 
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        GROUP BY FORMAT(k.createdAt, 'MMM yyyy'), YEAR(k.createdAt), DATENAME(month, k.createdAt), MONTH(k.createdAt) 
        ORDER BY YEAR(k.createdAt), MONTH(k.createdAt)
      `;
      let kriCountsByMonthYear: any[] = [];
      try {
        kriCountsByMonthYear = await this.databaseService.query(kriCountsByMonthYearQuery);
        // console.log('[KRI Dashboard] kriCountsByMonthYear query result:', JSON.stringify(kriCountsByMonthYear.slice(0, 3)));
      } catch (e) {
        console.error('KRI counts by Month/Year query failed:', e);
      }

      // KRI counts by frequency
      const kriCountsByFrequencyQuery = `
        SELECT 
          ISNULL(k.frequency, 'Unknown') AS frequency, 
          COUNT(*) AS count 
        FROM Kris k
        WHERE
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        GROUP BY 
          ISNULL(k.frequency, 'Unknown')
        ORDER BY 
          frequency ASC
      `;
      let kriCountsByFrequency: any[] = [];
      try {
        kriCountsByFrequency = await this.databaseService.query(kriCountsByFrequencyQuery);
      } catch (e) {
        console.error('KRI counts by frequency query failed:', e);
      }

      // Risks linked to KRIs (count per KRI name)
      const kriRisksByKriNameQuery = `
        SELECT 
          k.kriName AS kriName,
          COUNT(*) AS count
        FROM Risks r
        INNER JOIN KriRisks kr
          ON r.id = kr.risk_id
          AND kr.deletedAt IS NULL
        INNER JOIN Kris k
          ON kr.kri_id = k.id
          AND k.isDeleted = 0
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        WHERE 
          r.isDeleted = 0
          AND r.deletedAt IS NULL
          AND k.kriName IS NOT NULL
        GROUP BY 
          k.kriName
        ORDER BY 
          k.kriName ASC
      `;
      let kriRisksByKriName: any[] = [];
      try {
        kriRisksByKriName = await this.databaseService.query(kriRisksByKriNameQuery);
      } catch (e) {
        console.error('KRI risks by KRI name query failed:', e);
      }

      // KRI and Risk relationships (detailed list)
      const kriRiskRelationshipsQuery = `
        SELECT 
          k.code AS kri_code,
          k.kriName AS kri_name, 
          r.code AS risk_code,
          r.name AS risk_name
        FROM Kris k
        INNER JOIN KriRisks kr
          ON kr.kri_id = k.id
          AND kr.deletedAt IS NULL
        INNER JOIN Risks r
          ON r.id = kr.risk_id
          AND r.isDeleted = 0
          AND r.deletedAt IS NULL
        WHERE 
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        ORDER BY 
          k.kriName, r.name
      `;
      let kriRiskRelationships: any[] = [];
      try {
        kriRiskRelationships = await this.databaseService.query(kriRiskRelationshipsQuery);
      } catch (e) {
        console.error('KRI risk relationships query failed:', e);
      }

      // KRIs without linked risks
      const kriWithoutLinkedRisksQuery = `
        SELECT  
          k.kriName AS kriName, 
          k.code    AS kriCode
        FROM Kris AS k
        WHERE  
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
          AND NOT EXISTS (
            SELECT 1
            FROM KriRisks AS kr
            WHERE kr.kri_id = k.id
              AND kr.deletedAt IS NULL
          )
        ORDER BY  
          k.kriName
      `;
      let kriWithoutLinkedRisks: any[] = [];
      try {
        kriWithoutLinkedRisks = await this.databaseService.query(kriWithoutLinkedRisksQuery);
      } catch (e) {
        console.error('KRIs without linked risks query failed:', e);
      }

      // Overall KRI Statuses (all KRIs with combined status)
      const kriStatusQuery = `
        SELECT
          k.code             AS code,
          k.kriName          AS kri_name,
          ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
          CASE 
            WHEN ISNULL(k.preparerStatus, '') <> 'sent' THEN 'Pending Preparer'
            WHEN ISNULL(k.preparerStatus, '') = 'sent' AND ISNULL(k.checkerStatus, '') <> 'approved' AND ISNULL(k.acceptanceStatus, '') <> 'approved' THEN 'Pending Checker'
            WHEN ISNULL(k.checkerStatus, '') = 'approved' AND ISNULL(k.reviewerStatus, '') <> 'sent' AND ISNULL(k.acceptanceStatus, '') <> 'approved' THEN 'Pending Reviewer'
            WHEN ISNULL(k.reviewerStatus, '') = 'sent' AND ISNULL(k.acceptanceStatus, '') <> 'approved' THEN 'Pending Acceptance'
            WHEN ISNULL(k.acceptanceStatus, '') = 'approved' THEN 'Approved'
            ELSE 'Unknown'
          END AS status
        FROM Kris k
        LEFT JOIN KriFunctions kf ON k.id = kf.kri_id
          AND kf.deletedAt IS NULL
        LEFT JOIN Functions fkf ON fkf.id = kf.function_id
          AND fkf.isDeleted = 0
          AND fkf.deletedAt IS NULL
        LEFT JOIN Functions frel ON frel.id = k.related_function_id
          AND frel.isDeleted = 0
          AND frel.deletedAt IS NULL
        WHERE
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        ORDER BY k.kriName
      `;
      let kriStatusRows: any[] = [];
      try {
        kriStatusRows = await this.databaseService.query(kriStatusQuery);
      } catch (e) {
        console.error('Overall KRI statuses query failed:', e);
      }

      // Active KRIs details
      const activeKrisDetailsQuery = `
        SELECT
          k.kriName          AS kriName,
          CASE 
            WHEN ISNULL(k.preparerStatus, '') <> 'sent' THEN 'Pending Preparer'
            WHEN ISNULL(k.preparerStatus, '') = 'sent' AND ISNULL(k.checkerStatus, '') <> 'approved' AND ISNULL(k.acceptanceStatus, '') <> 'approved' THEN 'Pending Checker'
            WHEN ISNULL(k.checkerStatus, '') = 'approved' AND ISNULL(k.reviewerStatus, '') <> 'sent' AND ISNULL(k.acceptanceStatus, '') <> 'approved' THEN 'Pending Reviewer'
            WHEN ISNULL(k.reviewerStatus, '') = 'sent' AND ISNULL(k.acceptanceStatus, '') <> 'approved' THEN 'Pending Acceptance'
            WHEN ISNULL(k.acceptanceStatus, '') = 'approved' THEN 'Approved'
            ELSE 'Unknown'
          END AS combined_status,
          u.name AS assignedPersonId,
          u2.name AS addedBy,
          k.status           AS status,
          k.frequency        AS frequency,
          k.threshold        AS threshold,
          k.high_from        AS high_from,
          k.medium_from      AS medium_from,
          k.low_from         AS low_from,
          ISNULL(f.name, NULL) AS function_name
        FROM Kris k
        LEFT JOIN KriFunctions kf ON k.id = kf.kri_id
          AND kf.deletedAt IS NULL
        LEFT JOIN Functions f ON f.id = kf.function_id
          AND f.isDeleted = 0
          AND f.deletedAt IS NULL
        LEFT JOIN users u ON k.assignedPersonId = u.id
          AND u.deletedAt IS NULL
        LEFT JOIN users u2 ON k.addedBy = u2.id
          AND u2.deletedAt IS NULL
        WHERE
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          AND k.status = 'active'
          ${dateFilter}
          ${functionFilter}
      `;
      let activeKrisDetailsRows: any[] = [];
      try {
        activeKrisDetailsRows = await this.databaseService.query(activeKrisDetailsQuery);
      } catch (e) {
        console.error('Active KRIs details query failed:', e);
      }

      // Calculate status counts from statusCountsRow (convert to integers)
      const pendingPreparer = Number(statusCountsRow?.pendingPreparer || 0);
      const pendingChecker = Number(statusCountsRow?.pendingChecker || 0);
      const pendingReviewer = Number(statusCountsRow?.pendingReviewer || 0);
      const pendingAcceptance = Number(statusCountsRow?.pendingAcceptance || 0);
      const approved = Number(statusCountsRow?.approved || 0);

      return {
        totalKris,
        pendingPreparer,
        pendingChecker,
        pendingReviewer,
        pendingAcceptance,
        approved,
        krisByStatus: [
          { status: 'Pending Preparer', count: pendingPreparer },
          { status: 'Pending Checker', count: pendingChecker },
          { status: 'Pending Reviewer', count: pendingReviewer },
          { status: 'Pending Acceptance', count: pendingAcceptance },
          { status: 'Approved', count: approved }
        ],
        krisByLevel: krisByLevel.map(item => ({
          level: item.level || item.kri_level || 'Unknown',
          count: item.count
        })),
        breachedKRIsByDepartment: breachedKRIsByDepartment.map(item => ({
          function_name: item.function_name || 'Unknown',
          breached_count: item.breached_count
        })),
        kriHealth: kriHealth.map(item => ({
          kriName: item.kriName || 'Unknown',
          status: item.status || 'Unknown',
          kri_level: item.kri_level || 'Unknown',
          function_name: item.function_name || 'Unknown',
          threshold: item.threshold || 'N/A',
          frequency: item.frequency || 'N/A'
        })),
        kriAssessmentCount: kriAssessmentCount.map(item => ({
          function_name: item.function_name || 'Unknown',
          assessment_count: item.assessment_count
        })),
        kriMonthlyAssessment: kriMonthlyAssessment.map(item => ({
          month: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : null,
          assessment: item.assessment || 'Unknown',
          count: item.count || 0
        })),
        newlyCreatedKrisPerMonth: newlyCreatedKrisPerMonth.map(item => ({
          month: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : null,
          count: item.count || 0
        })),
        deletedKrisPerMonth: deletedKrisPerMonth.map(item => ({
          month: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : null,
          count: item.count || 0
        })),
        kriOverdueStatusCounts: kriOverdueStatusCountsRows.map(item => ({
          status: item['KRI Status'] || 'Unknown',
          count: item['Count'] || 0
        })),
        overdueKrisByDepartment: overdueKrisByDepartmentRows.map(item => ({
          kriCode: item['KRI Code'] || null,
          kriName: item['KRI Name'] || 'Unknown',
          function_name: item['Function'] || 'Unknown'
        })),
        allKrisSubmittedByFunction: allKrisSubmittedByFunctionRows.map(item => ({
          function_name: item['Function Name'] || 'Unknown',
          all_submitted: item['All KRIs Submitted?'] || 'No',
          total_kris: item['Total KRIs'] || 0,
          submitted_kris: item['Submitted KRIs'] || 0
        })),
        kriCountsByMonthYear: kriCountsByMonthYear.map(item => ({
          month_year: item.month_year || `${item.month_name || item.month || ''} ${item.year || item['year'] || ''}`.trim() || 'Unknown',
          month_name: item.month_name || item.month || 'Unknown',
          year: item.year || item['year'] || 0,
          kri_count: item.kri_count || item.count || 0
        })),
        kriCountsByFrequency: kriCountsByFrequency.map(item => ({
          frequency: item.frequency || 'Unknown',
          count: item.count || 0
        })),
        kriRisksByKriName: kriRisksByKriName.map(item => ({
          kriName: item.kriName || 'Unknown',
          count: item.count || 0
        })),
        kriRiskRelationships: kriRiskRelationships.map(item => ({
          kri_code: item.kri_code || null,
          kri_name: item.kri_name || 'Unknown',
          risk_code: item.risk_code || null,
          risk_name: item.risk_name || 'Unknown'
        })),
        kriWithoutLinkedRisks: kriWithoutLinkedRisks.map(item => ({
          kriName: item.kriName || 'Unknown',
          kriCode: item.kriCode || null
        })),
        kriStatus: kriStatusRows.map(item => ({
          code: item.code || null,
          kri_name: item.kri_name || 'Unknown',
          function_name: item.function_name || 'Unknown',
          status: item.status || 'Unknown'
        })),
        activeKrisDetails: activeKrisDetailsRows.map(item => ({
          kriName: item.kriName || 'Unknown',
          combined_status: item.combined_status || 'Unknown',
          assignedPersonId: item.assignedPersonId || null,
          addedBy: item.addedBy || null,
          status: item.status || 'Unknown',
          frequency: item.frequency || 'Unknown',
          threshold: item.threshold || null,
          high_from: item.high_from || null,
          medium_from: item.medium_from || null,
          low_from: item.low_from || null,
          function_name: item.function_name || null
        }))
      };
    } catch (error) {
      console.error('Fatal error fetching KRIs dashboard data:', error);
      // Return an empty-but-valid payload instead of 500 so UI can load
      return {
        totalKris: 0,
        pendingPreparer: 0,
        pendingChecker: 0,
        pendingReviewer: 0,
        pendingAcceptance: 0,
        approved: 0,
        krisByStatus: [],
        krisByLevel: [],
        breachedKRIsByDepartment: [],
        kriHealth: [],
        kriAssessmentCount: []
      };
    }
  }

  async getTotalKris(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = ["k.isDeleted = 0"];
    if (startDate) where.push(`k.createdAt >= '${startDate}'`);
    if (endDate) where.push(`k.createdAt <= '${endDate}'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`;

    const countQuery = `SELECT COUNT(*) as total FROM Kris k ${whereSql}`;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    const dataQuery = `
      SELECT 
        k.kriName as title,
        CASE 
          WHEN k.acceptanceStatus = 'approved' THEN 'approved'
          WHEN k.reviewerStatus = 'sent' THEN 'sent'
          WHEN k.checkerStatus = 'approved' THEN 'approved'
          ELSE ISNULL(k.preparerStatus, k.acceptanceStatus)
        END as status,
        k.createdAt
      FROM Kris k
      ${whereSql}
      ORDER BY k.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const data = await this.databaseService.query(dataQuery);

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
    };
  }
  async getPendingPreparerKris(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = ["k.isDeleted = 0", "k.deletedAt IS NULL", "ISNULL(k.preparerStatus, '') <> 'sent'"];
    if (startDate) where.push(`k.createdAt >= '${startDate}'`);
    if (endDate) where.push(`k.createdAt <= '${endDate}'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`;

    const countQuery = `SELECT COUNT(*) as total FROM Kris k ${whereSql}`;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    const dataQuery = `
      SELECT 
        k.code,
        k.kriName as title,
        'Pending Preparer' as status,
        k.createdAt
      FROM Kris k
      ${whereSql}
      ORDER BY k.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const data = await this.databaseService.query(dataQuery);

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
    };
  }

  async getPendingCheckerKris(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = [
      "k.isDeleted = 0",
      "k.deletedAt IS NULL",
      "ISNULL(k.preparerStatus, '') = 'sent'",
      "ISNULL(k.checkerStatus, '') <> 'approved'",
      "ISNULL(k.acceptanceStatus, '') <> 'approved'"
    ];
    if (startDate) where.push(`k.createdAt >= '${startDate}'`);
    if (endDate) where.push(`k.createdAt <= '${endDate}'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`;

    const countQuery = `SELECT COUNT(*) as total FROM Kris k ${whereSql}`;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    const dataQuery = `
      SELECT 
        k.code,
        k.kriName as title,
        'Pending Checker' as status,
        k.createdAt
      FROM Kris k
      ${whereSql}
      ORDER BY k.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const data = await this.databaseService.query(dataQuery);

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
    };
  }

  async getPendingReviewerKris(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = [
      "k.isDeleted = 0",
      "k.deletedAt IS NULL",
      "ISNULL(k.checkerStatus, '') = 'approved'",
      "ISNULL(k.reviewerStatus, '') <> 'sent'",
      "ISNULL(k.acceptanceStatus, '') <> 'approved'"
    ];
    if (startDate) where.push(`k.createdAt >= '${startDate}'`);
    if (endDate) where.push(`k.createdAt <= '${endDate}'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`;

    const countQuery = `SELECT COUNT(*) as total FROM Kris k ${whereSql}`;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    const dataQuery = `
      SELECT 
        k.code,
        k.kriName as title,
        'Pending Reviewer' as status,
        k.createdAt
      FROM Kris k
      ${whereSql}
      ORDER BY k.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const data = await this.databaseService.query(dataQuery);

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
    };
  }

  async getPendingAcceptanceKris(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = [
      "k.isDeleted = 0",
      "k.deletedAt IS NULL",
      "ISNULL(k.reviewerStatus, '') = 'sent'",
      "ISNULL(k.acceptanceStatus, '') <> 'approved'"
    ];
    if (startDate) where.push(`k.createdAt >= '${startDate}'`);
    if (endDate) where.push(`k.createdAt <= '${endDate}'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`;

    const countQuery = `SELECT COUNT(*) as total FROM Kris k ${whereSql}`;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    const dataQuery = `
      SELECT 
        k.code,
        k.kriName as title,
        'Pending Acceptance' as status,
        k.createdAt
      FROM Kris k
      ${whereSql}
      ORDER BY k.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const data = await this.databaseService.query(dataQuery);

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
    };
  }

  async exportKris(user: any, format: string, timeframe?: string) {
    // This would integrate with the Python export service
    // For now, return a placeholder response
    return {
      message: `Exporting KRIs data in ${format} format`,
      timeframe: timeframe || 'all',
      status: 'success'
    };
  }

  // Detail endpoints for info icons
  async getKrisByStatus(user: any, status: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = ["k.isDeleted = 0", "k.deletedAt IS NULL"];
    
    // Map status to SQL conditions
    switch (status) {
      case 'Pending Preparer':
        where.push("ISNULL(k.preparerStatus, '') <> 'sent'");
        break;
      case 'Pending Checker':
        where.push("ISNULL(k.preparerStatus, '') = 'sent'");
        where.push("ISNULL(k.checkerStatus, '') <> 'approved'");
        where.push("ISNULL(k.acceptanceStatus, '') <> 'approved'");
        break;
      case 'Pending Reviewer':
        where.push("ISNULL(k.checkerStatus, '') = 'approved'");
        where.push("ISNULL(k.reviewerStatus, '') <> 'sent'");
        where.push("ISNULL(k.acceptanceStatus, '') <> 'approved'");
        break;
      case 'Pending Acceptance':
        where.push("ISNULL(k.reviewerStatus, '') = 'sent'");
        where.push("ISNULL(k.acceptanceStatus, '') <> 'approved'");
        break;
      case 'Approved':
        where.push("ISNULL(k.acceptanceStatus, '') = 'approved'");
        break;
      default:
        // Unknown status - return empty
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
    
    if (startDate) where.push(`k.createdAt >= '${startDate}'`);
    if (endDate) where.push(`k.createdAt <= '${endDate}'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`;

    const countQuery = `SELECT COUNT(*) as total FROM Kris k ${whereSql}`;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    const dataQuery = `
      SELECT 
        k.code,
        k.kriName as name,
        k.createdAt as createdAt
      FROM Kris k
      ${whereSql}
      ORDER BY k.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const data = await this.databaseService.query(dataQuery);

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
    };
  }

  async getKrisByLevel(user: any, level: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    // Build date filter
    let dateFilter = '';
    if (startDate) dateFilter += `AND k.createdAt >= '${startDate}'`;
    if (endDate) dateFilter += `AND k.createdAt <= '${endDate}'`;
    
    // Use the same logic as the dashboard query to derive risk levels from thresholds
    // This ensures consistency between the chart and the detail view
    const query = `
      WITH LatestKV AS (
        SELECT kv.kriId,
               kv.value,
               ROW_NUMBER() OVER (PARTITION BY kv.kriId ORDER BY COALESCE(CONVERT(datetime, CONCAT(kv.[year], '-', kv.[month], '-01')), kv.createdAt) DESC) rn
        FROM KriValues kv
        WHERE kv.deletedAt IS NULL
      ),
      K AS (
        SELECT k.id,
               k.code,
               k.kriName,
               k.createdAt,
               k.kri_level,
               CAST(k.isAscending AS int) AS isAscending,
               TRY_CONVERT(float, k.medium_from) AS med_thr,
               TRY_CONVERT(float, k.high_from)   AS high_thr
        FROM Kris k
        WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
      ),
      KL AS (
        SELECT K.id, K.code, K.kriName, K.createdAt, K.kri_level, K.isAscending, K.med_thr, K.high_thr,
               TRY_CONVERT(float, kv.value) AS val
        FROM K
        LEFT JOIN LatestKV kv ON kv.kriId = K.id AND kv.rn = 1
      ),
      Derived AS (
        SELECT 
          code,
          kriName AS name,
          createdAt,
          CASE
            WHEN kri_level IS NOT NULL AND LTRIM(RTRIM(kri_level)) <> '' THEN kri_level
            WHEN val IS NULL OR med_thr IS NULL OR high_thr IS NULL THEN 'Unknown'
            WHEN isAscending = 1 AND val >= high_thr THEN 'High'
            WHEN isAscending = 1 AND val >= med_thr THEN 'Medium'
            WHEN isAscending = 1 THEN 'Low'
            WHEN isAscending = 0 AND val <= high_thr THEN 'High'
            WHEN isAscending = 0 AND val <= med_thr THEN 'Medium'
            ELSE 'Low'
          END AS level_bucket
        FROM KL
      )
      SELECT 
        code,
        name,
        createdAt
      FROM Derived
      WHERE level_bucket = '${level === 'Unknown' ? 'Unknown' : level.replace(/'/g, "''")}'
      ORDER BY createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    
    const countQuery = `
      WITH LatestKV AS (
        SELECT kv.kriId,
               kv.value,
               ROW_NUMBER() OVER (PARTITION BY kv.kriId ORDER BY COALESCE(CONVERT(datetime, CONCAT(kv.[year], '-', kv.[month], '-01')), kv.createdAt) DESC) rn
        FROM KriValues kv
        WHERE kv.deletedAt IS NULL
      ),
      K AS (
        SELECT k.id,
               k.kri_level,
               CAST(k.isAscending AS int) AS isAscending,
               TRY_CONVERT(float, k.medium_from) AS med_thr,
               TRY_CONVERT(float, k.high_from)   AS high_thr
        FROM Kris k
        WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
      ),
      KL AS (
        SELECT K.id, K.kri_level, K.isAscending, K.med_thr, K.high_thr,
               TRY_CONVERT(float, kv.value) AS val
        FROM K
        LEFT JOIN LatestKV kv ON kv.kriId = K.id AND kv.rn = 1
      ),
      Derived AS (
        SELECT 
          id,
          CASE
            WHEN kri_level IS NOT NULL AND LTRIM(RTRIM(kri_level)) <> '' THEN kri_level
            WHEN val IS NULL OR med_thr IS NULL OR high_thr IS NULL THEN 'Unknown'
            WHEN isAscending = 1 AND val >= high_thr THEN 'High'
            WHEN isAscending = 1 AND val >= med_thr THEN 'Medium'
            WHEN isAscending = 1 THEN 'Low'
            WHEN isAscending = 0 AND val <= high_thr THEN 'High'
            WHEN isAscending = 0 AND val <= med_thr THEN 'Medium'
            ELSE 'Low'
          END AS level_bucket
        FROM KL
      )
      SELECT COUNT(*) as total
      FROM Derived
      WHERE level_bucket = '${level === 'Unknown' ? 'Unknown' : level.replace(/'/g, "''")}'
    `;
    
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;
    const data = await this.databaseService.query(query);

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
    };
  }

  async getKrisByFunction(user: any, functionName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, submissionStatus?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = ["k.isDeleted = 0", "k.deletedAt IS NULL"];
    
    // Handle function filter
    if (functionName === 'Unknown') {
      where.push("(COALESCE(fkf.name, frel.name) IS NULL OR COALESCE(fkf.name, frel.name) = '')");
    } else {
      where.push(`(fkf.name = '${functionName.replace(/'/g, "''")}' OR frel.name = '${functionName.replace(/'/g, "''")}')`);
    }
    
    // Handle submission status filter (for "Submitted KRIs" column)
    if (submissionStatus === 'submitted') {
      // Match the logic from allKrisSubmittedByFunctionQuery: preparerStatus = 'sent' (submitted means sent by preparer, not necessarily approved)
      where.push("ISNULL(k.preparerStatus, '') = 'sent'");
    }
    
    if (startDate) where.push(`k.createdAt >= '${startDate}'`);
    if (endDate) where.push(`k.createdAt <= '${endDate}'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`;

    const countQuery = `
      SELECT COUNT(DISTINCT k.id) as total 
      FROM Kris k
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
      LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
      LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
      ${whereSql}
    `;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    const dataQuery = `
      SELECT DISTINCT
        k.code,
        k.kriName as name,
        k.createdAt as createdAt
      FROM Kris k
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
      LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
      LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
      ${whereSql}
      ORDER BY k.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const data = await this.databaseService.query(dataQuery);

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
    };
  }

  async getKrisWithAssessmentsByFunction(user: any, functionName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const kriFunctionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    // Build date filter for assessments - MUST match kriAssessmentCountQuery
    let dateFilter = '';
    // Note: The dashboard query uses ${dateFilter} which is currently empty,
    // but if date filtering is enabled, it should filter on kv.createdAt
    // For now, we'll match the dashboard behavior
    if (startDate) dateFilter += `AND kv.createdAt >= '${startDate}'`;
    if (endDate) dateFilter += `AND kv.createdAt <= '${endDate}'`;
    
    // Handle function filter - MUST EXACTLY match kriAssessmentCountQuery logic
    // Dashboard groups by: ISNULL(COALESCE(fkf.name, frel.name), 'Unknown')
    // So we need to filter using the same expression
    let functionFilter = '';
    if (functionName === 'Unknown') {
      // For 'Unknown': COALESCE must be NULL or empty, so ISNULL will make it 'Unknown'
      functionFilter = "AND (COALESCE(fkf.name, frel.name) IS NULL OR COALESCE(fkf.name, frel.name) = '')";
    } else {
      const escapedFunctionName = functionName.replace(/'/g, "''");
      // For specific function: ISNULL(COALESCE(...), 'Unknown') = functionName
      // This means COALESCE(...) must equal functionName (not NULL, or ISNULL would make it 'Unknown')
      functionFilter = `AND ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') = '${escapedFunctionName}'`;
    }
    
    // IMPORTANT: The dashboard counts assessments (COUNT(kv.id)), not distinct KRIs
    // So the info icon should return assessment records to match the count
    // Each row represents one assessment record
    const query = `
      SELECT
        k.code,
        k.kriName as name,
        kv.createdAt as createdAt
      FROM KriValues kv
      INNER JOIN Kris k ON kv.kriId = k.id
        AND k.isDeleted = 0 
        AND k.deletedAt IS NULL
        ${kriFunctionFilter}
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id
        AND kf.deletedAt IS NULL
      LEFT JOIN Functions fkf ON fkf.id = kf.function_id
        AND fkf.isDeleted = 0
        AND fkf.deletedAt IS NULL
      LEFT JOIN Functions frel ON frel.id = k.related_function_id
        AND frel.isDeleted = 0
        AND frel.deletedAt IS NULL
      WHERE kv.deletedAt IS NULL
        ${functionFilter}
        ${dateFilter}
      ORDER BY kv.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    
    // Count total assessment records (not distinct KRIs) to match dashboard
    const countQuery = `
      SELECT COUNT(kv.id) as total
      FROM KriValues kv
      INNER JOIN Kris k ON kv.kriId = k.id
        AND k.isDeleted = 0 
        AND k.deletedAt IS NULL
        ${kriFunctionFilter}
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id
        AND kf.deletedAt IS NULL
      LEFT JOIN Functions fkf ON fkf.id = kf.function_id
        AND fkf.isDeleted = 0
        AND fkf.deletedAt IS NULL
      LEFT JOIN Functions frel ON frel.id = k.related_function_id
        AND frel.isDeleted = 0
        AND frel.deletedAt IS NULL
      WHERE kv.deletedAt IS NULL
        ${functionFilter}
        ${dateFilter}
    `;
    
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;
    const data = await this.databaseService.query(query);

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
    };
  }

  async getKrisByFrequency(user: any, frequency: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = ["k.isDeleted = 0", "k.deletedAt IS NULL"];
    
    // Handle frequency filter
    if (frequency === 'Unknown') {
      where.push("(k.frequency IS NULL OR k.frequency = '')");
    } else {
      where.push(`k.frequency = '${frequency}'`);
    }
    
    if (startDate) where.push(`k.createdAt >= '${startDate}'`);
    if (endDate) where.push(`k.createdAt <= '${endDate}'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`;

    const countQuery = `SELECT COUNT(*) as total FROM Kris k ${whereSql}`;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    const dataQuery = `
      SELECT 
        k.code,
        k.kriName as name,
        k.createdAt as createdAt
      FROM Kris k
      ${whereSql}
      ORDER BY k.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const data = await this.databaseService.query(dataQuery);

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
    };
  }

  async getRisksByKriName(user: any, kriName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    // Handle KRI name filter
    // Decode URL-encoded parameter (handles Arabic and special characters)
    let decodedKriName = kriName;
    try {
      // Try decoding multiple times in case it's double-encoded
      decodedKriName = decodeURIComponent(kriName);
      try {
        decodedKriName = decodeURIComponent(decodedKriName);
      } catch (e) {
        // Already decoded, keep as is
      }
    } catch (e) {
      // If decoding fails, use original
      decodedKriName = kriName;
    }
    
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Log for debugging
    // console.log('[getRisksByKriName] Received kriName:', kriName);
    // console.log('[getRisksByKriName] Decoded kriName:', decodedKriName);
    
    // Escape special characters for SQL
    // SQL Server requires escaping single quotes by doubling them
    // Also escape wildcards for LIKE queries: % -> [%], _ -> [_]
    const escapedForExact = decodedKriName.replace(/'/g, "''");
    const escapedForLike = decodedKriName
      .replace(/'/g, "''")  // Escape single quotes
      .replace(/%/g, '[%]') // Escape % wildcard
      .replace(/_/g, '[_]') // Escape _ wildcard
      .replace(/\[/g, '[[]'); // Escape [ character

    // Use multiple matching strategies to find the KRI name
    // 1. Exact match (trimmed)
    // 2. Case-insensitive match (using UPPER)
    // 3. LIKE pattern match for partial/substring matching
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Risks r
      INNER JOIN KriRisks kr
        ON r.id = kr.risk_id
        AND kr.deletedAt IS NULL
      INNER JOIN Kris k
        ON kr.kri_id = k.id
        AND k.isDeleted = 0
        AND k.deletedAt IS NULL
        ${functionFilter}
      WHERE
        r.isDeleted = 0
        AND r.deletedAt IS NULL
        AND k.kriName IS NOT NULL
        ${decodedKriName === 'Unknown' ? '' : `AND (
          RTRIM(LTRIM(k.kriName)) = N'${escapedForExact}'
          OR UPPER(RTRIM(LTRIM(k.kriName))) = UPPER(N'${escapedForExact}')
          OR RTRIM(LTRIM(k.kriName)) LIKE N'%${escapedForLike}%'
          OR k.kriName = N'${escapedForExact}'
        )`}
        ${startDate ? `AND k.createdAt >= '${startDate}'` : ''}
        ${endDate ? `AND k.createdAt <= '${endDate}'` : ''}
    `;
    
    // console.log('[getRisksByKriName] Count query:', countQuery);
    
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;
    
    // console.log('[getRisksByKriName] Total count:', total);

    const dataQuery = `
      SELECT 
        r.code,
        r.name,
        r.createdAt as createdAt
      FROM Risks r
      INNER JOIN KriRisks kr
        ON r.id = kr.risk_id
        AND kr.deletedAt IS NULL
      INNER JOIN Kris k
        ON kr.kri_id = k.id
        AND k.isDeleted = 0
        AND k.deletedAt IS NULL
        ${functionFilter}
      WHERE
        r.isDeleted = 0
        AND r.deletedAt IS NULL
        AND k.kriName IS NOT NULL
        ${decodedKriName === 'Unknown' ? '' : `AND (
          RTRIM(LTRIM(k.kriName)) = N'${escapedForExact}'
          OR UPPER(RTRIM(LTRIM(k.kriName))) = UPPER(N'${escapedForExact}')
          OR RTRIM(LTRIM(k.kriName)) LIKE N'%${escapedForLike}%'
          OR k.kriName = N'${escapedForExact}'
        )`}
        ${startDate ? `AND k.createdAt >= '${startDate}'` : ''}
        ${endDate ? `AND k.createdAt <= '${endDate}'` : ''}
      ORDER BY r.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    
    // console.log('[getRisksByKriName] Data query:', dataQuery);
    
    const data = await this.databaseService.query(dataQuery);
    
    // console.log('[getRisksByKriName] Data returned:', data?.length || 0, 'rows');
    
    // Additional debugging: show what KRI names exist in the database for this pattern
    if (total === 0 && decodedKriName !== 'Unknown') {
      // console.log('[getRisksByKriName] No match found, checking database for similar names...');
      const debugQuery = `
        SELECT TOP 10 DISTINCT k.kriName, 
               LEN(k.kriName) as nameLength,
               DATALENGTH(k.kriName) as nameDataLength
        FROM Kris k
        WHERE k.isDeleted = 0
          AND k.deletedAt IS NULL
          AND k.kriName IS NOT NULL
          AND (
            k.kriName LIKE N'%CBE%' 
            OR k.kriName LIKE N'%reporting%'
            OR k.kriName LIKE N'%fine%'
          )
        ORDER BY k.kriName
      `;
      try {
        const debugResults = await this.databaseService.query(debugQuery);
        // console.log('[getRisksByKriName] Similar KRI names in database:', debugResults);
      } catch (e) {
        console.error('[getRisksByKriName] Debug query failed:', e);
      }
    }

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
    };
  }

  async getKrisByMonthYear(user: any, monthYear: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = ["k.isDeleted = 0", "k.deletedAt IS NULL"];
    
    // Parse month/year string (e.g., "Jan 2025" or "January 2025")
    // Try to extract month and year from the string
    let monthFilter = '';
    if (monthYear && monthYear !== 'Unknown') {
      // Try to match common month formats
      const monthYearPattern = /(\w+)\s+(\d{4})/i;
      const match = monthYear.match(monthYearPattern);
      if (match) {
        const monthName = match[1];
        const year = match[2];
        // Map month name to number (handle both short and long forms)
        const monthMap: Record<string, string> = {
          'jan': '01', 'january': '01',
          'feb': '02', 'february': '02',
          'mar': '03', 'march': '03',
          'apr': '04', 'april': '04',
          'may': '05',
          'jun': '06', 'june': '06',
          'jul': '07', 'july': '07',
          'aug': '08', 'august': '08',
          'sep': '09', 'september': '09',
          'oct': '10', 'october': '10',
          'nov': '11', 'november': '11',
          'dec': '12', 'december': '12'
        };
        const monthNum = monthMap[monthName.toLowerCase()];
        if (monthNum && year) {
          // Use parameterized query for safety, but since we're building WHERE clause separately, 
          // we'll use the year and monthNum after validation
          const yearNum = parseInt(year, 10);
          const monthNumInt = parseInt(monthNum, 10);
          if (!isNaN(yearNum) && !isNaN(monthNumInt) && monthNumInt >= 1 && monthNumInt <= 12) {
            monthFilter = `AND YEAR(k.createdAt) = ${yearNum} AND MONTH(k.createdAt) = ${monthNumInt}`;
          }
        }
      }
    }
    
    if (startDate) where.push(`k.createdAt >= '${startDate}'`);
    if (endDate) where.push(`k.createdAt <= '${endDate}'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM Kris k ${whereSql} ${monthFilter}`;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    const dataQuery = `
      SELECT 
        k.code,
        k.kriName as name,
        k.createdAt as createdAt
      FROM Kris k
      ${whereSql}
      ${monthFilter}
      ORDER BY k.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const data = await this.databaseService.query(dataQuery);

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
    };
  }

  async getKriAssessmentsByMonthAndLevel(user: any, monthYear: string, assessmentLevel: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    
    // Build date filter for assessments - matching the chart query format
    let dateFilter = '';
    if (startDate) dateFilter += `AND kv.createdAt >= '${startDate}'`;
    if (endDate) dateFilter += `AND kv.createdAt <= '${endDate}'`;
    
    // Parse month/year string - handle both formats:
    // 1. Formatted string: "Jan 2025" or "March 2025"
    // 2. Date string: "2025-03-01" or "2025-03-01T00:00:00"
    let monthFilter = '';
    if (monthYear && monthYear !== 'Unknown') {
      let yearNum: number | null = null;
      let monthNumInt: number | null = null;
      
      // Try to parse as date string first (e.g., "2025-03-01")
      const dateMatch = monthYear.match(/^(\d{4})-(\d{1,2})/);
      if (dateMatch) {
        yearNum = parseInt(dateMatch[1], 10);
        monthNumInt = parseInt(dateMatch[2], 10);
      } else {
        // Try to parse as formatted month string (e.g., "Jan 2025" or "March 2025")
        const monthYearPattern = /(\w+)\s+(\d{4})/i;
        const match = monthYear.match(monthYearPattern);
        if (match) {
          const monthName = match[1];
          const year = match[2];
          const monthMap: Record<string, string> = {
            'jan': '01', 'january': '01',
            'feb': '02', 'february': '02',
            'mar': '03', 'march': '03',
            'apr': '04', 'april': '04',
            'may': '05',
            'jun': '06', 'june': '06',
            'jul': '07', 'july': '07',
            'aug': '08', 'august': '08',
            'sep': '09', 'september': '09',
            'oct': '10', 'october': '10',
            'nov': '11', 'november': '11',
            'dec': '12', 'december': '12'
          };
          const monthNum = monthMap[monthName.toLowerCase()];
          if (monthNum && year) {
            yearNum = parseInt(year, 10);
            monthNumInt = parseInt(monthNum, 10);
          }
        }
      }
      
      if (yearNum !== null && monthNumInt !== null && !isNaN(yearNum) && !isNaN(monthNumInt) && monthNumInt >= 1 && monthNumInt <= 12) {
        // Filter on assessment creation date (kv.createdAt), matching the chart's grouping logic
        // Use exact same logic as chart query: filter by year and month
        monthFilter = `AND YEAR(kv.createdAt) = ${yearNum} AND MONTH(kv.createdAt) = ${monthNumInt}`;
      }
    }
    
    // Handle assessment level filter - MUST match chart query logic EXACTLY
    // Chart query has: AND kv.assessment IS NOT NULL (line 230)
    // So we need to filter by specific assessment level AND ensure it's not NULL
    let assessmentFilter = '';
    if (assessmentLevel && assessmentLevel !== 'Unknown') {
      const escapedLevel = assessmentLevel.replace(/'/g, "''");
      // Filter by specific level - this implicitly excludes NULL, matching chart logic
      assessmentFilter = `AND kv.assessment = '${escapedLevel}'`;
    } else if (assessmentLevel === 'Unknown') {
      // Chart query excludes NULL assessments, but if user clicked "Unknown", show NULL
      assessmentFilter = "AND (kv.assessment IS NULL OR kv.assessment = '')";
    }
    // Note: Chart query always has "AND kv.assessment IS NOT NULL", so if assessmentLevel is not provided,
    // we don't add any filter (would return all non-null assessments, which might be too broad)
    
    // Query to get assessment records (from KriValues) filtered by month and assessment level
    // MUST match the chart query logic exactly:
    // - INNER JOIN with same conditions
    // - Same WHERE conditions (k.isDeleted = 0, k.deletedAt IS NULL, kv.deletedAt IS NULL)
    // - Same date filtering
    const query = `
      SELECT
        k.code,
        k.kriName as name,
        kv.createdAt as createdAt
      FROM Kris AS k
      INNER JOIN KriValues AS kv
        ON kv.kriId = k.id
        AND kv.deletedAt IS NULL
      WHERE
        k.isDeleted = 0
        AND k.deletedAt IS NULL
        ${functionFilter}
        ${assessmentFilter}
        ${monthFilter}
        ${dateFilter}
      ORDER BY kv.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(kv.id) as total
      FROM Kris AS k
      INNER JOIN KriValues AS kv
        ON kv.kriId = k.id
        AND kv.deletedAt IS NULL
      WHERE
        k.isDeleted = 0
        AND k.deletedAt IS NULL
        ${functionFilter}
        ${assessmentFilter}
        ${monthFilter}
        ${dateFilter}
    `;
    
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;
    const data = await this.databaseService.query(query);

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
    };
  }

  async getKrisByOverdueStatus(user: any, overdueStatus: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = ["k.isDeleted = 0", "k.deletedAt IS NULL"];
    
    if (startDate) where.push(`k.createdAt >= '${startDate}'`);
    if (endDate) where.push(`k.createdAt <= '${endDate}'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`;

    let statusFilter = '';
    if (overdueStatus === 'Overdue') {
      statusFilter = `AND EXISTS (
        SELECT 1
        FROM Actionplans ap
        WHERE ap.kri_id = k.id
          AND ap.deletedAt IS NULL
          AND ap.implementation_date < GETDATE()
          AND (ap.done = 0 OR ap.done IS NULL)
      )`;
    } else if (overdueStatus === 'Not Overdue') {
      statusFilter = `AND NOT EXISTS (
        SELECT 1
        FROM Actionplans ap
        WHERE ap.kri_id = k.id
          AND ap.deletedAt IS NULL
          AND ap.implementation_date < GETDATE()
          AND (ap.done = 0 OR ap.done IS NULL)
      )`;
    } else {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Kris k
      ${whereSql}
      ${statusFilter}
    `;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    const dataQuery = `
      SELECT 
        k.code,
        k.kriName as name,
        k.createdAt as createdAt
      FROM Kris k
      ${whereSql}
      ${statusFilter}
      ORDER BY k.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const data = await this.databaseService.query(dataQuery);

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
    };
  }
}
