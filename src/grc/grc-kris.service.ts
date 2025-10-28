import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class GrcKrisService {
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

  async getKrisDashboard(timeframe?: string) {
    try {
      const dateFilter = ''; // use full dataset per validated SQL

      // Total KRIs (count)
      const totalKrisQuery = `
        SELECT COUNT(*) AS total
        FROM Kris k
        WHERE k.isDeleted = 0
          AND k.deletedAt IS NULL
      `;
      let totalKris = 0;
      try {
        const totalKrisResult = await this.databaseService.query(totalKrisQuery);
        totalKris = totalKrisResult[0]?.total || 0;
      } catch (e) {
        console.error('KRIs total query failed:', e);
      }

      // KRIs status counts (same logic as incidents - independent counts)
      const krisStatusCountsQuery = `
        SELECT 
          SUM(CASE WHEN k.preparerStatus = 'sent' THEN 1 ELSE 0 END) AS pendingPreparer,
          SUM(CASE WHEN k.checkerStatus = 'pending' THEN 1 ELSE 0 END) AS pendingChecker,
          SUM(CASE WHEN k.reviewerStatus = 'pending' THEN 1 ELSE 0 END) AS pendingReviewer,
          SUM(CASE WHEN k.acceptanceStatus = 'pending' THEN 1 ELSE 0 END) AS pendingAcceptance,
          SUM(CASE WHEN k.acceptanceStatus = 'approved' THEN 1 ELSE 0 END) AS approved
        FROM Kris k
        WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
      `;
      let statusCountsRow: any = {};
      try {
        const statusCountsResult = await this.databaseService.query(krisStatusCountsQuery);
        statusCountsRow = statusCountsResult[0] || {};
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
      `;
      let krisByLevel: any[] = [];
      try {
        krisByLevel = await this.databaseService.query(krisByLevelQuery);
      } catch (e) {
        console.error('KRIs by level query failed:', e);
      }

      // Breached KRIs by department (latest values, KriFunctions mapping, fallbacks to related_function_id, and kri_level="High")
      const breachedKRIsByDepartmentQuery = `
        WITH LatestKV AS (
          SELECT 
            COALESCE(kv.kriId, kv.kri_id) AS kriId,
            TRY_CONVERT(float, kv.value) AS val,
            ROW_NUMBER() OVER (
              PARTITION BY COALESCE(kv.kriId, kv.kri_id)
              ORDER BY COALESCE(CONVERT(datetime, CONCAT(kv.[year], '-', kv.[month], '-01')), kv.createdAt) DESC
            ) AS rn
          FROM KriValues kv
          WHERE kv.deletedAt IS NULL
        ),
        NormK AS (
          SELECT
            k.id,
            CAST(COALESCE(k.isAscending, k.is_ascending) AS int) AS isAscending,
            TRY_CONVERT(float, k.high_from)   AS high_thr,
            TRY_CONVERT(float, k.medium_from) AS med_thr,
            TRY_CONVERT(float, COALESCE(k.high_from, k.highFrom, k.threshold)) AS threshold_fallback,
            k.kri_level,
            k.related_function_id
          FROM Kris k
          WHERE k.isDeleted = 0
        ),
        KWithLatest AS (
          SELECT
            n.id,
            n.isAscending,
            n.high_thr,
            n.med_thr,
            n.threshold_fallback,
            n.kri_level,
            n.related_function_id,
            kv.val
          FROM NormK n
          LEFT JOIN LatestKV kv
            ON kv.kriId = n.id
           AND kv.rn = 1
        )
        SELECT 
          ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
          SUM(
            CASE 
              WHEN kl.kri_level IS NOT NULL AND LTRIM(RTRIM(LOWER(kl.kri_level))) = 'high' THEN 1
              WHEN kl.val IS NULL THEN 0
              -- prefer explicit high_thr when present
              WHEN kl.high_thr IS NOT NULL AND kl.isAscending = 1 AND kl.val > kl.high_thr THEN 1
              WHEN kl.high_thr IS NOT NULL AND kl.isAscending = 0 AND kl.val < kl.high_thr THEN 1
              -- fallback to medium threshold if high is missing
              WHEN kl.high_thr IS NULL AND kl.med_thr IS NOT NULL AND kl.isAscending = 1 AND kl.val > kl.med_thr THEN 1
              WHEN kl.high_thr IS NULL AND kl.med_thr IS NOT NULL AND kl.isAscending = 0 AND kl.val < kl.med_thr THEN 1
              -- final fallback to generic threshold
              WHEN kl.high_thr IS NULL AND kl.med_thr IS NULL AND kl.threshold_fallback IS NOT NULL AND kl.isAscending = 1 AND kl.val > kl.threshold_fallback THEN 1
              WHEN kl.high_thr IS NULL AND kl.med_thr IS NULL AND kl.threshold_fallback IS NOT NULL AND kl.isAscending = 0 AND kl.val < kl.threshold_fallback THEN 1
              ELSE 0
            END
          ) AS breached_count
        FROM KWithLatest kl
        LEFT JOIN KriFunctions kf
          ON kf.kri_id = kl.id
        LEFT JOIN Functions fkf
          ON fkf.id = kf.function_id
        LEFT JOIN Functions frel
          ON frel.id = kl.related_function_id
        GROUP BY ISNULL(COALESCE(fkf.name, frel.name), 'Unknown')
        HAVING SUM(
            CASE 
              WHEN kl.kri_level IS NOT NULL AND LTRIM(RTRIM(LOWER(kl.kri_level))) = 'high' THEN 1
              WHEN kl.val IS NULL THEN 0
              WHEN kl.high_thr IS NOT NULL AND kl.isAscending = 1 AND kl.val > kl.high_thr THEN 1
              WHEN kl.high_thr IS NOT NULL AND kl.isAscending = 0 AND kl.val < kl.high_thr THEN 1
              WHEN kl.high_thr IS NULL AND kl.med_thr IS NOT NULL AND kl.isAscending = 1 AND kl.val > kl.med_thr THEN 1
              WHEN kl.high_thr IS NULL AND kl.med_thr IS NOT NULL AND kl.isAscending = 0 AND kl.val < kl.med_thr THEN 1
              WHEN kl.high_thr IS NULL AND kl.med_thr IS NULL AND kl.threshold_fallback IS NOT NULL AND kl.isAscending = 1 AND kl.val > kl.threshold_fallback THEN 1
              WHEN kl.high_thr IS NULL AND kl.med_thr IS NULL AND kl.threshold_fallback IS NOT NULL AND kl.isAscending = 0 AND kl.val < kl.threshold_fallback THEN 1
              ELSE 0
            END
        ) > 0
        ORDER BY breached_count DESC
      `;
      let breachedKRIsByDepartment: any[] = [];
      try {
        breachedKRIsByDepartment = await this.databaseService.query(breachedKRIsByDepartmentQuery);
      } catch (e) {
        console.error('Breached KRIs by department query failed:', e);
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
        ORDER BY k.createdAt DESC
      `;
      let kriHealth: any[] = [];
      try {
        kriHealth = await this.databaseService.query(kriHealthQuery);
      } catch (e) {
        console.error('KRI health query failed:', e);
      }

      // KRI assessment count by department (latest kv per KRI)
      const kriAssessmentCountQuery = `
        WITH LatestKV AS (
          SELECT kv.kriId,
                 kv.assessment,
                 ROW_NUMBER() OVER (PARTITION BY kv.kriId ORDER BY COALESCE(CONVERT(datetime, CONCAT(kv.[year], '-', kv.[month], '-01')), kv.createdAt) DESC) rn
          FROM KriValues kv
          WHERE kv.deletedAt IS NULL
        )
        SELECT
          f.name AS function_name,
          COUNT(k.id) AS assessment_count
        FROM Kris k
        JOIN LatestKV kv ON kv.kriId = k.id AND kv.rn = 1
        JOIN KriFunctions kf ON k.id = kf.kri_id
        JOIN Functions f ON kf.function_id = f.id
        WHERE k.isDeleted = 0
        GROUP BY f.name
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
          CAST(DATEADD(month, DATEPART(month, k.createdAt) - 1, DATEFROMPARTS(YEAR(k.createdAt), 1, 1)) AS datetime2) AS createdAt,
          kv.assessment AS assessment,
          COUNT(DISTINCT k.id) AS count
        FROM Kris AS k
        INNER JOIN KriValues AS kv
          ON kv.kriId = k.id
          AND kv.deletedAt IS NULL
        WHERE
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          AND kv.assessment IS NOT NULL
        GROUP BY
          CAST(DATEADD(month, DATEPART(month, k.createdAt) - 1, DATEFROMPARTS(YEAR(k.createdAt), 1, 1)) AS datetime2),
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

      // Overdue KRIs with Department (from Actionplans or linked Function)
      const overdueKrisByDepartmentQuery = `
        SELECT DISTINCT 
          k.id        AS [KRI ID], 
          k.kriName   AS [KRI Name], 
          COALESCE(ap.business_unit, f.name) AS [Department]
        FROM Kris AS k
        INNER JOIN Actionplans AS ap
          ON ap.kri_id = k.id
          AND ap.deletedAt IS NULL
          AND ap.implementation_date < GETDATE()
          AND (ap.done = 0 OR ap.done IS NULL)
        LEFT JOIN KriFunctions AS kf
          ON kf.kri_id = k.id
          AND kf.deletedAt IS NULL
        LEFT JOIN Functions AS f
          ON f.id = kf.function_id
          AND f.isDeleted = 0
          AND f.deletedAt IS NULL
        WHERE 
          k.isDeleted = 0
          AND k.deletedAt IS NULL
        ORDER BY 
          [Department], [KRI Name]
      `;
      let overdueKrisByDepartmentRows: any[] = [];
      try {
        overdueKrisByDepartmentRows = await this.databaseService.query(overdueKrisByDepartmentQuery);
      } catch (e) {
        console.error('Overdue KRIs by department query failed:', e);
      }

      // All KRIs Submitted by Function
      const allKrisSubmittedByFunctionQuery = `
        WITH kri_function_map AS (
          SELECT
            f.name AS function_name,
            k.id   AS kri_id,
            k.kriName
          FROM Kris AS k
          INNER JOIN KriFunctions AS kf
            ON k.id = kf.kri_id
            AND kf.deletedAt IS NULL
          INNER JOIN Functions AS f
            ON f.id = kf.function_id
            AND f.isDeleted = 0
            AND f.deletedAt IS NULL
          WHERE
            k.isDeleted = 0
            AND k.deletedAt IS NULL
        ),
        kri_submission_status AS (
          SELECT
            ap.kri_id,
            MAX(CASE
                  WHEN ap.preparerStatus = 'sent'
                   AND ap.checkerStatus  = 'approved'
                   AND ap.reviewerStatus = 'sent'
                   AND ap.acceptanceStatus = 'approved'
                  THEN 1 ELSE 0
                END) AS is_submitted
          FROM Actionplans AS ap
          WHERE ap.deletedAt IS NULL
          GROUP BY ap.kri_id
        )
        SELECT
          kfm.function_name AS [Function Name],
          CASE
            WHEN COUNT(kfm.kri_id) = COUNT(CASE WHEN kss.is_submitted = 1 THEN 1 END)
            THEN 'Yes' ELSE 'No'
          END AS [All KRIs Submitted?],
          COUNT(kfm.kri_id) AS [Total KRIs],
          COUNT(CASE WHEN kss.is_submitted = 1 THEN 1 END) AS [Submitted KRIs]
        FROM kri_function_map AS kfm
        LEFT JOIN kri_submission_status AS kss
          ON kfm.kri_id = kss.kri_id
        GROUP BY kfm.function_name
        ORDER BY kfm.function_name
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
          DATENAME(month, k.createdAt) AS month_name, 
          YEAR(k.createdAt) AS [year], 
          COUNT(*) AS kri_count 
        FROM Kris k 
        WHERE k.isDeleted = 0 
          AND k.deletedAt IS NULL
        GROUP BY YEAR(k.createdAt), DATENAME(month, k.createdAt), MONTH(k.createdAt) 
        ORDER BY YEAR(k.createdAt), MONTH(k.createdAt)
      `;
      let kriCountsByMonthYear: any[] = [];
      try {
        kriCountsByMonthYear = await this.databaseService.query(kriCountsByMonthYearQuery);
      } catch (e) {
        console.error('KRI counts by Month/Year query failed:', e);
      }

      // KRI counts by frequency
      const kriCountsByFrequencyQuery = `
        SELECT 
          k.frequency AS frequency, 
          COUNT(*) AS count 
        FROM Kris k
        WHERE
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          AND k.frequency IS NOT NULL
        GROUP BY 
          k.frequency 
        ORDER BY 
          k.frequency ASC
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
          k.kriName AS kri_name, 
          r.name AS risk_name, 
          r.id AS risk_id
        FROM Kris k
        LEFT JOIN KriRisks kr
          ON kr.kri_id = k.id
          AND kr.deletedAt IS NULL
        LEFT JOIN Risks r
          ON r.id = kr.risk_id
          AND r.isDeleted = 0
          AND r.deletedAt IS NULL
        WHERE 
          k.isDeleted = 0
          AND k.deletedAt IS NULL
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
          k.id      AS kriId
        FROM Kris AS k
        WHERE  
          k.isDeleted = 0
          AND k.deletedAt IS NULL
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

      // Active KRIs details
      const activeKrisDetailsQuery = `
        SELECT
          k.kriName          AS kriName,
          k.preparerStatus   AS preparerStatus,
          k.checkerStatus    AS checkerStatus,
          k.reviewerStatus   AS reviewerStatus,
          k.acceptanceStatus AS acceptanceStatus,
          k.addedBy          AS addedBy,
          k.modifiedBy       AS modifiedBy,
          k.status           AS status,
          k.frequency        AS frequency,
          k.threshold        AS threshold,
          k.high_from        AS high_from,
          k.medium_from      AS medium_from,
          k.low_from         AS low_from
        FROM Kris k
        WHERE
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          AND k.status = 'active'
      `;
      let activeKrisDetailsRows: any[] = [];
      try {
        activeKrisDetailsRows = await this.databaseService.query(activeKrisDetailsQuery);
      } catch (e) {
        console.error('Active KRIs details query failed:', e);
      }

      // Calculate status counts from statusCountsRow
      const pendingPreparer = statusCountsRow?.pendingPreparer || 0;
      const pendingChecker = statusCountsRow?.pendingChecker || 0;
      const pendingReviewer = statusCountsRow?.pendingReviewer || 0;
      const pendingAcceptance = statusCountsRow?.pendingAcceptance || 0;
      const approved = statusCountsRow?.approved || 0;

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
          level: item.kri_level,
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
          kriId: item['KRI ID'] || null,
          kriName: item['KRI Name'] || 'Unknown',
          department: item['Department'] || 'Unknown'
        })),
        allKrisSubmittedByFunction: allKrisSubmittedByFunctionRows.map(item => ({
          function_name: item['Function Name'] || 'Unknown',
          all_submitted: item['All KRIs Submitted?'] || 'No',
          total_kris: item['Total KRIs'] || 0,
          submitted_kris: item['Submitted KRIs'] || 0
        })),
        kriCountsByMonthYear: kriCountsByMonthYear.map(item => ({
          month_name: item.month_name || 'Unknown',
          year: item.year || 0,
          kri_count: item.kri_count || 0
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
          kri_name: item.kri_name || 'Unknown',
          risk_name: item.risk_name || 'Unknown',
          risk_id: item.risk_id || null
        })),
        kriWithoutLinkedRisks: kriWithoutLinkedRisks.map(item => ({
          kriName: item.kriName || 'Unknown',
          kriId: item.kriId || null
        })),
        activeKrisDetails: activeKrisDetailsRows.map(item => ({
          kriName: item.kriName || 'Unknown',
          preparerStatus: item.preparerStatus || 'Unknown',
          checkerStatus: item.checkerStatus || 'Unknown',
          reviewerStatus: item.reviewerStatus || 'Unknown',
          acceptanceStatus: item.acceptanceStatus || 'Unknown',
          addedBy: item.addedBy || 'Unknown',
          modifiedBy: item.modifiedBy || 'Unknown',
          status: item.status || 'Unknown',
          frequency: item.frequency || 'Unknown',
          threshold: item.threshold || null,
          high_from: item.high_from || null,
          medium_from: item.medium_from || null,
          low_from: item.low_from || null
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

  async exportKris(format: string, timeframe?: string) {
    // This would integrate with the Python export service
    // For now, return a placeholder response
    return {
      message: `Exporting KRIs data in ${format} format`,
      timeframe: timeframe || 'all',
      status: 'success'
    };
  }
}
