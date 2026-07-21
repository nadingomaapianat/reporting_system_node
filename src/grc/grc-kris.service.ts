import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UserFunctionAccessService, UserFunctionAccess } from '../shared/user-function-access.service';
import { fq } from '../shared/db-config';
import { sortRowsByFunctionAsc } from '../shared/order-by-function';

const DASHBOARD_PREVIEW_LIMIT = 10;

@Injectable()
export class GrcKrisService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly userFunctionAccess: UserFunctionAccessService,
  ) {}

  /**
   * Scalar subquery: comma-separated function name(s) for a KRI (via KriFunctions,
   * falling back to related_function_id). Use instead of LEFT JOIN KriFunctions/Functions
   * for a displayed function_name column — a plain join duplicates the KRI's row once
   * per linked function when a KRI has more than one function.
   */
  private kriFunctionNameSubquery(kriAlias: string = 'k'): string {
    return `ISNULL(
      (SELECT STRING_AGG(f2.name, ', ') WITHIN GROUP (ORDER BY f2.name)
       FROM KriFunctions kf2
       INNER JOIN Functions f2 ON f2.id = kf2.function_id AND f2.isDeleted = 0 AND f2.deletedAt IS NULL
       WHERE kf2.kri_id = ${kriAlias}.id AND kf2.deletedAt IS NULL),
      (SELECT frel2.name FROM Functions frel2 WHERE frel2.id = ${kriAlias}.related_function_id AND frel2.isDeleted = 0 AND frel2.deletedAt IS NULL)
    )`;
  }

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

  /** Filter KriValues by period (year/month) within startDate..endDate. Used on the JOIN for KRI Details & Action Plans. */
  private buildKriValueDateFilter(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) return '';
    let filter = '';
    if (startDate) {
      filter += ` AND CONVERT(datetime, CONCAT(kv.[year], '-', kv.[month], '-01')) >= '${startDate}'`;
    }
    if (endDate) {
      filter += ` AND CONVERT(datetime, CONCAT(kv.[year], '-', kv.[month], '-01')) <= '${endDate}'`;
    }
    return filter;
  }

  /**
   * Filter KriValues by SUBMISSION date (the row's createdAt) within
   * submissionStartDate..submissionEndDate. This is independent of the KRI
   * creation-date filter (buildDateFilter) and is applied to every query that
   * reads the KriValues table. Assumes the KriValues alias is `kv`.
   */
  private buildKriValueSubmissionFilter(submissionStartDate?: string, submissionEndDate?: string): string {
    if (!submissionStartDate && !submissionEndDate) return '';
    let filter = '';
    if (submissionStartDate) {
      filter += ` AND kv.createdAt >= '${submissionStartDate}'`;
    }
    if (submissionEndDate) {
      // Add one day so the whole end date is included.
      const endDateObj = new Date(submissionEndDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      filter += ` AND kv.createdAt < '${endDateObj.toISOString()}'`;
    }
    return filter;
  }

  private previewRows<T>(rows: T[]): T[] {
    return Array.isArray(rows) ? rows : [];
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

  /**
   * Run independent dashboard queries in small batches so the first load is
   * faster without sending the entire dashboard workload to SQL Server at once.
   */
  private async runQueryBatches<T>(tasks: Array<() => Promise<T>>, batchSize = 4): Promise<T[]> {
    const results: T[] = [];
    for (let index = 0; index < tasks.length; index += batchSize) {
      const batch = tasks.slice(index, index + batchSize);
      results.push(...await Promise.all(batch.map((task) => task())));
    }
    return results;
  }

  private async getKriDetailsWithActionPlansGrouped(access: UserFunctionAccess, selectedFunctionIds: string[] | undefined, kriValueDateFilter: string, kriValueSubmissionFilter: string = '') {
    const selected = selectedFunctionIds?.length
      ? [...new Set(selectedFunctionIds.map((id) => String(id).trim()).filter(Boolean))]
      : [];
    const allowed = selected.length
      ? selected
      : access.isSuperAdmin
        ? []
        : access.functionIds;
    const quotedIds = allowed.map((id) => `'${String(id).replace(/'/g, "''")}'`).join(', ');
    const detailsFunctionFilter = selected.length
      ? ` AND (
            k.related_function_id IN (${quotedIds})
            OR EXISTS (
              SELECT 1
              FROM KriFunctions kf_filter
              WHERE kf_filter.kri_id = k.id
                AND kf_filter.function_id IN (${quotedIds})
                AND kf_filter.deletedAt IS NULL
            )
          )`
      : access.isSuperAdmin
        ? ''
        : access.functionIds.length
          ? ` AND (
                k.related_function_id IN (${quotedIds})
                OR EXISTS (
                  SELECT 1
                  FROM KriFunctions kf_filter
                  WHERE kf_filter.kri_id = k.id
                    AND kf_filter.function_id IN (${quotedIds})
                    AND kf_filter.deletedAt IS NULL
                )
              )`
          : (process.env.REPORTS_EMPTY_FUNCTIONS_SEE_ALL === 'true' ? '' : ' AND 1 = 0');
    const kriDetailsWithActionPlansQuery = `
        WITH TopKris AS (
          SELECT k.id
          FROM Kris k
          WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
            ${detailsFunctionFilter}
        )
        SELECT
          k.id AS kri_id,
          k.code AS kri_code,
          k.kriName AS kri_name,
          k.createdAt AS kri_created_at,
          ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
          u_assigned.name AS assigned_person_name,
          k.type AS kri_type,
          u_added.name AS added_by_name,
          k.status AS kri_status,
          k.frequency AS kri_frequency,
          CASE WHEN k.typePercentageOrFigure = '%' THEN 'percentage' ELSE ISNULL(k.typePercentageOrFigure, 'N/A') END AS measurable_unit,
          k.low_from,
          k.medium_from,
          k.high_from,
          k.threshold AS defining_threshold,
          kv.[month] AS value_month,
          kv.[year] AS value_year,
          kv.value AS value_value,
          kv.assessment AS value_assessment,
          a.control_procedure AS action_taken,
          f_owner.name AS action_owner_name,
          a.business_unit AS action_plan_status,
          a.implementation_date AS expected_implementation_date,
          a.[year] AS action_year,
          a.[month] AS action_month
        FROM Kris k
        INNER JOIN TopKris tk ON tk.id = k.id
        LEFT JOIN KriValues kv ON kv.kriId = k.id AND kv.deletedAt IS NULL
          ${kriValueDateFilter}
          ${kriValueSubmissionFilter}
        LEFT JOIN Actionplans a ON a.kri_id = k.id AND a.deletedAt IS NULL
          AND LTRIM(RTRIM(ISNULL(a.[from], ''))) IN (N'kri', N'KRI', N'Kri')
        LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
        LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
        LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
        LEFT JOIN users u_assigned ON k.assignedPersonId = u_assigned.id AND u_assigned.deletedAt IS NULL
        LEFT JOIN users u_added ON k.addedBy = u_added.id AND u_added.deletedAt IS NULL
        LEFT JOIN Functions f_owner ON a.actionOwner = f_owner.id
          AND f_owner.isDeleted = 0
          AND f_owner.deletedAt IS NULL
        WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
          ${detailsFunctionFilter}
        ORDER BY k.createdAt DESC, k.id DESC, kv.[year] DESC, kv.[month] DESC, a.createdAt DESC
      `;
    const kriDetailsWithActionPlansRows = await this.runDashboardQuery<any[]>(
      'KRI details with action plans',
      kriDetailsWithActionPlansQuery,
      [],
    );

    const kriDetailsMap = new Map<string, {
      kri_code: string;
      kri_name: string;
      function_name: string;
      kri_created_at: any;
      assigned_person_name: string;
      kri_type: string;
      added_by_name: string;
      kri_status: string;
      kri_frequency: string;
      measurable_unit: string;
      low_from: any;
      medium_from: any;
      high_from: any;
      defining_threshold: string;
      valuesByPeriod: Array<{
        month: number;
        year: number;
        value: number | null;
        assessment: string | null;
        actionPlans: Array<{
          control_procedure: string;
          implementation_date: string | null;
          business_unit: string;
        }>;
      }>;
    }>();

    for (const row of kriDetailsWithActionPlansRows || []) {
      const kriId = String(row.kri_id ?? '');
      if (!kriId) continue;
      if (!kriDetailsMap.has(kriId)) {
        kriDetailsMap.set(kriId, {
          kri_code: row.kri_code ?? 'N/A',
          kri_name: row.kri_name ?? 'N/A',
          function_name: row.function_name ?? 'N/A',
          kri_created_at: row.kri_created_at ?? null,
          assigned_person_name: row.assigned_person_name ?? 'N/A',
          kri_type: row.kri_type ?? 'N/A',
          added_by_name: row.added_by_name ?? 'N/A',
          kri_status: row.kri_status ?? 'N/A',
          kri_frequency: row.kri_frequency ?? 'N/A',
          measurable_unit: row.measurable_unit ?? 'N/A',
          low_from: row.low_from ?? null,
          medium_from: row.medium_from ?? null,
          high_from: row.high_from ?? null,
          defining_threshold: row.defining_threshold ?? 'N/A',
          valuesByPeriod: [],
        });
      }
      const rec = kriDetailsMap.get(kriId)!;
      const valueMonth = row.value_month != null ? Number(row.value_month) : null;
      const valueYear = row.value_year != null ? Number(row.value_year) : null;
      const actionMonth = row.action_month != null ? Number(row.action_month) : null;
      const actionYear = row.action_year != null ? Number(row.action_year) : null;
      let valuePeriod = null as null | {
        month: number;
        year: number;
        value: number | null;
        assessment: string | null;
        actionPlans: Array<{
          control_procedure: string;
          implementation_date: string | null;
          business_unit: string;
        }>;
      };
      if (valueYear != null && valueMonth != null) {
        valuePeriod = rec.valuesByPeriod.find((p) => p.year === valueYear && p.month === valueMonth) || null;
        if (!valuePeriod) {
          valuePeriod = {
            month: valueMonth,
            year: valueYear,
            value: row.value_value != null ? Number(row.value_value) : null,
            assessment: row.value_assessment ?? null,
            actionPlans: [],
          };
          rec.valuesByPeriod.push(valuePeriod);
        } else {
          if (row.value_value != null) valuePeriod.value = Number(row.value_value);
          if (row.value_assessment != null) valuePeriod.assessment = row.value_assessment;
        }
      }
      const hasAction = row.action_taken != null && String(row.action_taken).trim() !== '';
      if (hasAction) {
        const targetYear = actionYear ?? valueYear;
        const targetMonth = actionMonth ?? valueMonth;
        if (targetYear == null || targetMonth == null) {
          continue;
        }
        let actionPeriod = rec.valuesByPeriod.find((p) => p.year === targetYear && p.month === targetMonth);
        if (!actionPeriod) {
          actionPeriod = {
            month: targetMonth,
            year: targetYear,
            value: targetYear === valueYear && targetMonth === valueMonth ? (valuePeriod?.value ?? null) : null,
            assessment: targetYear === valueYear && targetMonth === valueMonth ? (valuePeriod?.assessment ?? null) : null,
            actionPlans: [],
          };
          rec.valuesByPeriod.push(actionPeriod);
        }
        actionPeriod.actionPlans.push({
          control_procedure: row.action_taken ?? 'N/A',
          implementation_date: row.expected_implementation_date ?? null,
          business_unit: row.action_plan_status ?? 'N/A',
        });
      }
    }

    for (const rec of kriDetailsMap.values()) {
      for (const period of rec.valuesByPeriod) {
        const seen = new Set<string>();
        period.actionPlans = period.actionPlans.filter((ap) => {
          const key = `${ap.control_procedure}|${ap.implementation_date}|${ap.business_unit}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    }

    return Array.from(kriDetailsMap.values())
      .map((rec) => ({
        ...rec,
        valuesByPeriod: rec.valuesByPeriod.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month),
      }))
      .sort((a, b) => {
        const aTime = a.kri_created_at ? new Date(a.kri_created_at).getTime() : 0;
        const bTime = b.kri_created_at ? new Date(b.kri_created_at).getTime() : 0;
        return bTime - aTime;
      });
  }

  async getKrisDashboard(
    user: any,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    section?: 'cards' | 'charts' | 'tables',
    submissionStartDate?: string,
    submissionEndDate?: string,
  ) {
    try {
      // console.log('[getKrisDashboard] Received parameters:', { timeframe, startDate, endDate, selectedFunctionIds, userId: user.id, groupName: user.groupName });

      const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
      const kriValueDateFilter = this.buildKriValueDateFilter(startDate, endDate);
      // Submission-date filter (KriValues.createdAt), independent of the KRI creation-date filter above.
      const kriValueSubmissionFilter = this.buildKriValueSubmissionFilter(submissionStartDate, submissionEndDate);
      // console.log('[getKrisDashboard] Date filter:', dateFilter);

      // Get user function access (super_admin_ sees everything)
      const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
      // console.log('[getKrisDashboard] User access:', { isSuperAdmin: access.isSuperAdmin, functionIds: access.functionIds });
      
      const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);
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
      const totalKrisTask = () => this.runDashboardQuery<any[]>('KRIs total', totalKrisQuery, []);

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
      const statusCountsTask = () => this.runDashboardQuery<any[]>('KRIs status counts', krisStatusCountsQuery, []);

      // KRIs by level (mirror the GRC app: bucket each KRI by the assessment
      // recorded on its latest KRI value, rather than re-deriving from thresholds).
      const krisByLevelQuery = `
        WITH LatestKV AS (
          SELECT kv.kriId,
                 UPPER(LTRIM(RTRIM(kv.assessment))) AS assessment,
                 ROW_NUMBER() OVER (PARTITION BY kv.kriId ORDER BY COALESCE(CONVERT(datetime, CONCAT(kv.[year], '-', kv.[month], '-01')), kv.createdAt) DESC) rn
          FROM KriValues kv
          WHERE kv.deletedAt IS NULL
            ${kriValueSubmissionFilter}
        ),
        K AS (
          SELECT k.id
          FROM Kris k
          WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
            ${dateFilter}
            ${functionFilter}
        ),
        Derived AS (
          SELECT CASE lk.assessment
                   WHEN 'HIGH'   THEN 'High'
                   WHEN 'MEDIUM' THEN 'Medium'
                   WHEN 'LOW'    THEN 'Low'
                   ELSE 'Unknown'
                 END AS level_bucket
          FROM K
          LEFT JOIN LatestKV lk ON lk.kriId = K.id AND lk.rn = 1
        )
        SELECT level_bucket AS level, COUNT(*) AS count
        FROM Derived
        GROUP BY level_bucket
        ORDER BY count DESC
      `;
      const krisByLevelTask = () => this.runDashboardQuery<any[]>('KRIs by level', krisByLevelQuery, []);

      // Breached KRIs by function: a KRI is "breached" when its latest assessment
      // sits in the High-risk band (or an explicit High kri_level). Mirrors the
      // level logic used by the "KRIs by Risk Level" chart.
      const breachedKRIsByDepartmentQuery = `
        WITH LatestKV AS (
          SELECT kv.kriId, kv.value,
                 ROW_NUMBER() OVER (PARTITION BY kv.kriId ORDER BY COALESCE(CONVERT(datetime, CONCAT(kv.[year], '-', kv.[month], '-01')), kv.createdAt) DESC) rn
          FROM KriValues kv
          WHERE kv.deletedAt IS NULL
            ${kriValueSubmissionFilter}
        ),
        K AS (
          SELECT k.id,
                 ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
                 k.kri_level,
                 CAST(k.isAscending AS int) AS isAscending,
                 TRY_CONVERT(float, k.medium_from) AS med_thr,
                 TRY_CONVERT(float, k.high_from)   AS high_thr
          FROM Kris k
          LEFT JOIN KriFunctions kf ON kf.kri_id = k.id AND kf.deletedAt IS NULL
          LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
          LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
          WHERE k.isDeleted = 0
            AND k.deletedAt IS NULL
            ${dateFilter}
            ${functionFilter}
        ),
        KL AS (
          SELECT K.id, K.function_name, K.kri_level, K.isAscending, K.med_thr, K.high_thr,
                 TRY_CONVERT(float, kv.value) AS val
          FROM K
          LEFT JOIN LatestKV kv ON kv.kriId = K.id AND kv.rn = 1
        ),
        Derived AS (
          SELECT function_name,
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
        SELECT function_name, COUNT(*) AS breached_count
        FROM Derived
        WHERE UPPER(LTRIM(RTRIM(level_bucket))) = 'HIGH'
        GROUP BY function_name
        ORDER BY breached_count DESC
      `;
      const breachedKRIsByDepartmentTask = () => this.runDashboardQuery<any[]>('Breached KRIs by function', breachedKRIsByDepartmentQuery, []);

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
      const kriHealthTask = () => this.runDashboardQuery<any[]>('KRI health', kriHealthQuery, []);

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
          ${kriValueSubmissionFilter}
        GROUP BY ISNULL(COALESCE(fkf.name, frel.name), 'Unknown')
        ORDER BY assessment_count DESC
      `;
      const kriAssessmentCountTask = () => this.runDashboardQuery<any[]>('KRI assessment count', kriAssessmentCountQuery, []);

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
          ${kriValueSubmissionFilter}
        GROUP BY
          FORMAT(kv.createdAt, 'MMM yyyy'),
          CAST(DATEADD(month, DATEPART(month, kv.createdAt) - 1, DATEFROMPARTS(YEAR(kv.createdAt), 1, 1)) AS datetime2),
          kv.assessment
        ORDER BY
          createdAt ASC,
          assessment ASC
      `;
      const kriMonthlyAssessmentTask = () => this.runDashboardQuery<any[]>('KRI monthly assessment', kriMonthlyAssessmentQuery, []);

      // Assessment History by Risk Level: count EVERY assessment record (all periods,
      // not just the latest per KRI) grouped by its recorded risk level.
      const assessmentHistoryByLevelQuery = `
        SELECT
          CASE UPPER(LTRIM(RTRIM(kv.assessment)))
            WHEN 'HIGH'   THEN 'High'
            WHEN 'MEDIUM' THEN 'Medium'
            WHEN 'LOW'    THEN 'Low'
            ELSE 'Unknown'
          END AS level,
          COUNT(kv.id) AS count
        FROM Kris k
        INNER JOIN KriValues kv ON kv.kriId = k.id AND kv.deletedAt IS NULL
        WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
          ${kriValueSubmissionFilter}
        GROUP BY
          CASE UPPER(LTRIM(RTRIM(kv.assessment)))
            WHEN 'HIGH'   THEN 'High'
            WHEN 'MEDIUM' THEN 'Medium'
            WHEN 'LOW'    THEN 'Low'
            ELSE 'Unknown'
          END
        ORDER BY count DESC
      `;
      const assessmentHistoryByLevelTask = () => this.runDashboardQuery<any[]>('Assessment history by level', assessmentHistoryByLevelQuery, []);

      // Number of Newly Created KRIs per Month
      const newlyCreatedKrisPerMonthQuery = `
        SELECT 
          CAST(DATEFROMPARTS(YEAR(k.createdAt), MONTH(k.createdAt), 1) AS datetime2) AS createdAt,
          COUNT(*) AS count
        FROM Kris k
        WHERE
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        GROUP BY
          CAST(DATEFROMPARTS(YEAR(k.createdAt), MONTH(k.createdAt), 1) AS datetime2)
        ORDER BY
          createdAt ASC
      `;
      const newlyCreatedKrisPerMonthTask = () => this.runDashboardQuery<any[]>('Newly created KRIs per month', newlyCreatedKrisPerMonthQuery, []);

      // Number of Deleted KRIs by Month
      const deletedKrisPerMonthQuery = `
        SELECT 
          CAST(
            DATEFROMPARTS(
              YEAR(COALESCE(k.deletedAt, k.createdAt)),
              MONTH(COALESCE(k.deletedAt, k.createdAt)),
              1
            ) AS datetime2
          ) AS deletedMonth,
          COUNT(*) AS count
        FROM Kris k
        WHERE
          (k.isDeleted = 1 OR k.deletedAt IS NOT NULL)
          AND COALESCE(k.deletedAt, k.createdAt) IS NOT NULL
        GROUP BY 
          YEAR(COALESCE(k.deletedAt, k.createdAt)),
          MONTH(COALESCE(k.deletedAt, k.createdAt))
        ORDER BY 
          YEAR(COALESCE(k.deletedAt, k.createdAt)) ASC,
          MONTH(COALESCE(k.deletedAt, k.createdAt)) ASC
      `;
      const deletedKrisPerMonthTask = () => this.runDashboardQuery<any[]>('Deleted KRIs per month', deletedKrisPerMonthQuery, []);

      // KRIs Submitted vs Not Submitted per month. Months run continuously from the earliest
      // KRI's creation month through the later of "now" or the latest month that actually has
      // data, so zero-submission months still appear (as Not Submitted) instead of being
      // silently skipped, and no real (even future-dated) submission is ever dropped.
      const krisSubmittedMonthlyQuery = `
        WITH MonthsBase AS (
          SELECT
            (SELECT MIN(createdAt) FROM Kris WHERE isDeleted = 0 AND deletedAt IS NULL) AS start_date,
            (SELECT MAX(DATEFROMPARTS(TRY_CONVERT(int, [year]), TRY_CONVERT(int, [month]), 1))
             FROM KriValues WHERE deletedAt IS NULL AND [year] IS NOT NULL AND [month] IS NOT NULL) AS max_data_period
        ),
        Months AS (
          SELECT
            YEAR(DATEFROMPARTS(YEAR(start_date), MONTH(start_date), 1)) AS yr,
            MONTH(DATEFROMPARTS(YEAR(start_date), MONTH(start_date), 1)) AS mo,
            DATEFROMPARTS(YEAR(start_date), MONTH(start_date), 1) AS period,
            CASE WHEN max_data_period > DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
                 THEN max_data_period ELSE DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1) END AS end_period
          FROM MonthsBase
          UNION ALL
          SELECT YEAR(DATEADD(MONTH, 1, period)), MONTH(DATEADD(MONTH, 1, period)), DATEADD(MONTH, 1, period), end_period
          FROM Months
          WHERE period < end_period
        ),
        Expected AS (
          SELECT m.yr, m.mo, k.id AS kri_id
          FROM Months m
          INNER JOIN Kris k
            ON k.isDeleted = 0 AND k.deletedAt IS NULL
            AND k.createdAt < DATEADD(MONTH, 1, DATEFROMPARTS(m.yr, m.mo, 1))
            ${functionFilter}
        ),
        Sub AS (
          SELECT DISTINCT kv.kriId, TRY_CONVERT(int, kv.[year]) AS yr, TRY_CONVERT(int, kv.[month]) AS mo
          FROM KriValues kv WHERE kv.deletedAt IS NULL
            ${kriValueSubmissionFilter}
        )
        SELECT
          e.yr AS [year],
          e.mo AS [month],
          FORMAT(DATEFROMPARTS(e.yr, e.mo, 1), 'MMM yyyy') AS month_year,
          SUM(CASE WHEN s.kriId IS NOT NULL THEN 1 ELSE 0 END) AS submitted,
          SUM(CASE WHEN s.kriId IS NULL THEN 1 ELSE 0 END) AS not_submitted
        FROM Expected e
        LEFT JOIN Sub s ON s.kriId = e.kri_id AND s.yr = e.yr AND s.mo = e.mo
        GROUP BY e.yr, e.mo
        ORDER BY e.yr, e.mo
        OPTION (MAXRECURSION 1000)
      `;
      const krisSubmittedMonthlyTask = () => this.runDashboardQuery<any[]>('KRIs submitted vs not submitted (monthly)', krisSubmittedMonthlyQuery, []);

      // Overdue KRIs by Function (KRIs Target Date by Function) — mirrors the Excel/PDF
      // export column set (Threshold, Low/Medium/High, Month, Year, Value, Action Plan, Status).
      const overdueKrisByDepartmentQuery = `
        SELECT
          k.code      AS [KRI Code],
          k.kriName   AS [KRI Name],
          ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS [Function],
          ISNULL(k.threshold, '') AS [Threshold],
          k.low_from AS [Low From],
          k.medium_from AS [Medium From],
          k.high_from AS [High From],
          CASE
            -- Actionplans.year/month are 0 (not NULL) as a sentinel on many rows,
            -- and DATEFROMPARTS errors on an out-of-range month/year, so check ranges
            -- explicitly rather than just IS NOT NULL.
            WHEN ap.[month] BETWEEN 1 AND 12 AND ap.[year] BETWEEN 1 AND 9999
            THEN DATENAME(MONTH, DATEFROMPARTS(ap.[year], ap.[month], 1))
            ELSE ''
          END AS [Month],
          CASE WHEN ap.[year] BETWEEN 1 AND 9999 THEN ap.[year] ELSE NULL END AS [Year],
          kv.value AS [Value],
          ISNULL(ap.control_procedure, '') AS [Action Plan],
          FORMAT(CONVERT(datetime, ap.implementation_date), 'yyyy-MM-dd') AS [Target Date],
          CASE
            WHEN ap.id IS NULL THEN ''
            WHEN ISNULL(ap.business_unit, '') = '' THEN 'Pending'
            ELSE ap.business_unit
          END AS [Status]
        FROM Kris AS k
        LEFT JOIN Actionplans AS ap
          ON ap.kri_id = k.id
          AND ap.deletedAt IS NULL
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
        LEFT JOIN KriValues AS kv
          ON kv.kriId = k.id
          AND kv.[year] = ap.[year]
          AND kv.[month] = ap.[month]
          AND kv.deletedAt IS NULL
          ${kriValueSubmissionFilter}
        WHERE
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        ORDER BY
          CASE WHEN ap.implementation_date IS NULL THEN 1 ELSE 0 END,
          ap.implementation_date ASC, [Function], [KRI Name]
      `;
      const overdueKrisByDepartmentTask = () => this.runDashboardQuery<any[]>('Overdue KRIs by department', overdueKrisByDepartmentQuery, []);

      // All KRIs Submitted by Function
      // Total KRIs = sum, per KRI, of how many months it has been active (createdAt -> now,
      // inclusive) — i.e. total expected monthly reporting slots for that function, not a count
      // of KRI definitions. Submitted KRIs = sum of months that actually have a recorded value.
      // Function attribution prioritizes related_function_id over KriFunctions, matching the
      // main app/heatmap's authoritative logic (adib_backend kri.service.ts), so a KRI is never
      // silently reassigned to a different function here than it belongs to there.
      const allKrisSubmittedByFunctionQuery = `
        SELECT
          ISNULL(COALESCE(frel.name, fkf.name), 'Unknown') AS [Function Name],
          SUM(DATEDIFF(MONTH, k.createdAt, GETDATE()) + 1) AS [Total KRIs],
          SUM(ISNULL(kv_counts.months_submitted, 0)) AS [Submitted KRIs],
          CASE
            WHEN SUM(DATEDIFF(MONTH, k.createdAt, GETDATE()) + 1) = SUM(ISNULL(kv_counts.months_submitted, 0))
            THEN 'Yes' ELSE 'No'
          END AS [All KRIs Submitted?]
        FROM Kris AS k
        LEFT JOIN Functions AS frel
          ON frel.id = k.related_function_id
          AND frel.isDeleted = 0
          AND frel.deletedAt IS NULL
        OUTER APPLY (
          -- A KRI can have several KriFunctions rows; TOP 1 keeps this to one row per KRI so
          -- SUM() below never double/triple-counts a KRI linked to multiple functions.
          SELECT TOP 1 f2.name
          FROM KriFunctions kf2
          INNER JOIN Functions f2 ON f2.id = kf2.function_id AND f2.isDeleted = 0 AND f2.deletedAt IS NULL
          WHERE kf2.kri_id = k.id AND kf2.deletedAt IS NULL
          ORDER BY kf2.function_id
        ) fkf(name)
        OUTER APPLY (
          SELECT COUNT(DISTINCT CONCAT(kv.[year], '-', kv.[month])) AS months_submitted
          FROM KriValues kv
          WHERE kv.kriId = k.id AND kv.deletedAt IS NULL
            ${kriValueSubmissionFilter}
        ) kv_counts
        WHERE
          k.isDeleted = 0
          AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
        GROUP BY ISNULL(COALESCE(frel.name, fkf.name), 'Unknown')
        ORDER BY ISNULL(COALESCE(frel.name, fkf.name), 'Unknown')
      `;
      const allKrisSubmittedByFunctionTask = () => this.runDashboardQuery<any[]>('All KRIs submitted by function', allKrisSubmittedByFunctionQuery, []);

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
      const kriCountsByMonthYearTask = () => this.runDashboardQuery<any[]>('KRI counts by Month/Year', kriCountsByMonthYearQuery, []);

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
      const kriCountsByFrequencyTask = () => this.runDashboardQuery<any[]>('KRI counts by frequency', kriCountsByFrequencyQuery, []);

      // Count of KRIs linked vs not linked to risks
      const kriRiskLinkageCountsQuery = `
        SELECT
          SUM(CASE WHEN linked_flag = 1 THEN 1 ELSE 0 END) AS linked,
          SUM(CASE WHEN linked_flag = 0 THEN 1 ELSE 0 END) AS notLinked
        FROM (
          SELECT
            CASE WHEN EXISTS (
              SELECT 1 FROM KriRisks kr WHERE kr.kri_id = k.id AND kr.deletedAt IS NULL
            ) THEN 1 ELSE 0 END AS linked_flag
          FROM Kris k
          WHERE
            k.isDeleted = 0
            AND k.deletedAt IS NULL
            ${dateFilter}
            ${functionFilter}
        ) t
      `;
      const kriRiskLinkageCountsTask = () => this.runDashboardQuery<any[]>('KRI risk linkage counts', kriRiskLinkageCountsQuery, []);

      // KRI and Risk relationships (detailed list)
      const kriRiskRelationshipsQuery = `
        SELECT
          k.code AS kri_code,
          k.kriName AS kri_name,
          ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
          r.code AS risk_code,
          r.name AS risk_name
        FROM Kris k
        LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
        LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
        LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
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
      const kriRiskRelationshipsTask = () => this.runDashboardQuery<any[]>('KRI risk relationships', kriRiskRelationshipsQuery, []);

      // KRIs without linked risks
      const kriWithoutLinkedRisksQuery = `
        SELECT 
          k.kriName AS kriName, 
          k.code    AS kriCode,
          ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name
        FROM Kris AS k
        LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
        LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
        LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
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
      const kriWithoutLinkedRisksTask = () => this.runDashboardQuery<any[]>('KRIs without linked risks', kriWithoutLinkedRisksQuery, []);

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
      const kriStatusTask = () => this.runDashboardQuery<any[]>('Overall KRI statuses', kriStatusQuery, []);

      // Active KRIs details
      const activeKrisDetailsQuery = `
        SELECT
          k.code             AS code,
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
      const activeKrisDetailsTask = () => this.runDashboardQuery<any[]>('Active KRIs details', activeKrisDetailsQuery, []);

      if (section === 'cards') {
        const [totalKrisResult, statusCountsResults] = await this.runQueryBatches<any[]>([
          totalKrisTask,
          statusCountsTask,
        ]);
        const totalKris = Number(totalKrisResult[0]?.total || 0);
        const statusCountsRow = statusCountsResults[0] || {};
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
        };
      }

      if (section === 'charts') {
        const [
          statusCountsResults,
          krisByLevel,
          breachedKRIsByDepartment,
          kriAssessmentCount,
          kriMonthlyAssessment,
          assessmentHistoryByLevel,
          deletedKrisPerMonth,
          krisSubmittedMonthlyRows,
          kriCountsByMonthYear,
          kriCountsByFrequency,
          kriRiskLinkageCountsRows,
        ] = await this.runQueryBatches<any[]>([
          statusCountsTask,
          krisByLevelTask,
          breachedKRIsByDepartmentTask,
          kriAssessmentCountTask,
          kriMonthlyAssessmentTask,
          assessmentHistoryByLevelTask,
          deletedKrisPerMonthTask,
          krisSubmittedMonthlyTask,
          kriCountsByMonthYearTask,
          kriCountsByFrequencyTask,
          kriRiskLinkageCountsTask,
        ]);
        const statusCountsRow = statusCountsResults[0] || {};
        const pendingPreparer = Number(statusCountsRow?.pendingPreparer || 0);
        const pendingChecker = Number(statusCountsRow?.pendingChecker || 0);
        const pendingReviewer = Number(statusCountsRow?.pendingReviewer || 0);
        const pendingAcceptance = Number(statusCountsRow?.pendingAcceptance || 0);
        const approved = Number(statusCountsRow?.approved || 0);

        return {
          krisByStatus: [
            { status: 'Pending Preparer', count: pendingPreparer },
            { status: 'Pending Checker', count: pendingChecker },
            { status: 'Pending Reviewer', count: pendingReviewer },
            { status: 'Pending Acceptance', count: pendingAcceptance },
            { status: 'Approved', count: approved },
          ],
          krisByLevel: krisByLevel.map((item) => ({
            level: item.level || item.kri_level || 'Unknown',
            count: item.count,
          })),
          breachedKRIsByDepartment: breachedKRIsByDepartment.map((item) => ({
            function_name: item.function_name || 'Unknown',
            breached_count: item.breached_count,
          })),
          kriAssessmentCount: kriAssessmentCount.map((item) => ({
            function_name: item.function_name || 'Unknown',
            assessment_count: item.assessment_count,
          })),
          kriMonthlyAssessment: kriMonthlyAssessment.map((item) => ({
            month: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : null,
            assessment: item.assessment || 'Unknown',
            count: item.count || 0,
          })),
          assessmentHistoryByLevel: assessmentHistoryByLevel.map((item) => ({
            level: item.level || 'Unknown',
            count: Number(item.count || 0),
          })),
          deletedKrisPerMonth: deletedKrisPerMonth.map((item) => ({
            month: item.deletedMonth ? new Date(item.deletedMonth).toISOString().split('T')[0] : null,
            count: item.count || 0,
          })),
          krisSubmittedMonthly: krisSubmittedMonthlyRows.map((item) => ({
            month_year: item.month_year || `${item.month || ''}/${item.year || ''}`,
            year: Number(item.year || 0),
            month: Number(item.month || 0),
            submitted: Number(item.submitted || 0),
            not_submitted: Number(item.not_submitted || 0),
          })),
          kriCountsByMonthYear: kriCountsByMonthYear.map((item) => ({
            month_year: item.month_year || `${item.month_name || item.month || ''} ${item.year || item['year'] || ''}`.trim() || 'Unknown',
            month_name: item.month_name || item.month || 'Unknown',
            year: item.year || item['year'] || 0,
            kri_count: item.kri_count || item.count || 0,
          })),
          kriCountsByFrequency: kriCountsByFrequency.map((item) => ({
            frequency: item.frequency || 'Unknown',
            count: item.count || 0,
          })),
          kriRiskLinkageCounts: [
            { name: 'Linked with Risks', value: Number(kriRiskLinkageCountsRows[0]?.linked || 0), color: '#4472C4' },
            { name: 'Not Linked with Risks', value: Number(kriRiskLinkageCountsRows[0]?.notLinked || 0), color: '#EF3D3D' },
          ],
        };
      }

      if (section === 'tables') {
        const [
          overdueKrisByDepartmentRows,
          allKrisSubmittedByFunctionRows,
          kriRiskRelationships,
          kriWithoutLinkedRisks,
          kriStatusRows,
          activeKrisDetailsRows,
        ] = await this.runQueryBatches<any[]>([
          overdueKrisByDepartmentTask,
          allKrisSubmittedByFunctionTask,
          kriRiskRelationshipsTask,
          kriWithoutLinkedRisksTask,
          kriStatusTask,
          activeKrisDetailsTask,
        ]);
        const kriDetailsWithActionPlansGrouped = await this.getKriDetailsWithActionPlansGrouped(
          access,
          selectedFunctionIds,
          kriValueDateFilter,
          kriValueSubmissionFilter,
        );
        // Large per-KRI-per-month table: send only page 1 + total; the rest is fetched
        // server-side via getMonthlyKriSubmissionByFunctionTablePage on page change.
        const monthlyKriSubmissionByFunction = await this.getMonthlyKriSubmissionByFunctionTablePage(
          user, 1, 10, timeframe, startDate, endDate, selectedFunctionIds, false,
        );

        return {
          monthlyKriSubmissionByFunction,
          overdueKrisByDepartment: overdueKrisByDepartmentRows.map((item) => ({
            kriCode: item['KRI Code'] || null,
            kriName: item['KRI Name'] || 'Unknown',
            function_name: item['Function'] || 'Unknown',
            threshold: item['Threshold'] ?? '',
            low_from: item['Low From'] ?? null,
            medium_from: item['Medium From'] ?? null,
            high_from: item['High From'] ?? null,
            month: item['Month'] || '',
            year: item['Year'] ?? '',
            value: item['Value'] ?? null,
            action_plan: item['Action Plan'] || '',
            target_date: item['Target Date'] || '',
            status: item['Status'] || '',
          })),
          allKrisSubmittedByFunction: allKrisSubmittedByFunctionRows.map((item) => ({
            function_name: item['Function Name'] || 'Unknown',
            all_submitted: item['All KRIs Submitted?'] || 'No',
            total_kris: item['Total KRIs'] || 0,
            submitted_kris: item['Submitted KRIs'] || 0,
          })),
          kriRiskRelationships: kriRiskRelationships.map((item) => ({
            kri_code: item.kri_code || null,
            kri_name: item.kri_name || 'Unknown',
            function_name: item.function_name || 'Unknown',
            risk_code: item.risk_code || null,
            risk_name: item.risk_name || 'Unknown',
          })),
          kriWithoutLinkedRisks: kriWithoutLinkedRisks.map((item) => ({
            kriName: item.kriName || 'Unknown',
            kriCode: item.kriCode || null,
            function_name: item.function_name || 'Unknown',
          })),
          kriStatus: kriStatusRows.map((item) => ({
            code: item.code || null,
            kri_name: item.kri_name || 'Unknown',
            function_name: item.function_name || 'Unknown',
            status: item.status || 'Unknown',
          })),
          kriDetailsWithActionPlans: kriDetailsWithActionPlansGrouped,
          activeKrisDetails: activeKrisDetailsRows.map((item) => ({
            code: item.code || null,
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
            function_name: item.function_name || null,
          })),
        };
      }

      const [
        totalKrisResult,
        statusCountsResults,
        krisByLevel,
        breachedKRIsByDepartment,
        kriHealth,
        kriAssessmentCount,
        kriMonthlyAssessment,
        assessmentHistoryByLevel,
        newlyCreatedKrisPerMonth,
        deletedKrisPerMonth,
        krisSubmittedMonthlyRows,
        overdueKrisByDepartmentRows,
        allKrisSubmittedByFunctionRows,
        kriCountsByMonthYear,
        kriCountsByFrequency,
        kriRiskLinkageCountsRows,
        kriRiskRelationships,
        kriWithoutLinkedRisks,
        kriStatusRows,
        activeKrisDetailsRows,
      ] = await this.runQueryBatches<any[]>([
        totalKrisTask,
        statusCountsTask,
        krisByLevelTask,
        breachedKRIsByDepartmentTask,
        kriHealthTask,
        kriAssessmentCountTask,
        kriMonthlyAssessmentTask,
        assessmentHistoryByLevelTask,
        newlyCreatedKrisPerMonthTask,
        deletedKrisPerMonthTask,
        krisSubmittedMonthlyTask,
        overdueKrisByDepartmentTask,
        allKrisSubmittedByFunctionTask,
        kriCountsByMonthYearTask,
        kriCountsByFrequencyTask,
        kriRiskLinkageCountsTask,
        kriRiskRelationshipsTask,
        kriWithoutLinkedRisksTask,
        kriStatusTask,
        activeKrisDetailsTask,
      ]);
      const totalKris = Number(totalKrisResult[0]?.total || 0);
      const statusCountsRow = statusCountsResults[0] || {};
      const kriDetailsWithActionPlansGrouped = await this.getKriDetailsWithActionPlansGrouped(
        access,
        selectedFunctionIds,
        kriValueDateFilter,
        kriValueSubmissionFilter,
      );

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
        assessmentHistoryByLevel: assessmentHistoryByLevel.map(item => ({
          level: item.level || 'Unknown',
          count: Number(item.count || 0)
        })),
        newlyCreatedKrisPerMonth: newlyCreatedKrisPerMonth.map(item => ({
          month: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : null,
          count: item.count || 0
        })),
        deletedKrisPerMonth: deletedKrisPerMonth.map(item => ({
          month: item.deletedMonth ? new Date(item.deletedMonth).toISOString().split('T')[0] : null,
          count: item.count || 0
        })),
        krisSubmittedMonthly: krisSubmittedMonthlyRows.map(item => ({
          month_year: item.month_year || `${item.month || ''}/${item.year || ''}`,
          year: Number(item.year || 0),
          month: Number(item.month || 0),
          submitted: Number(item.submitted || 0),
          not_submitted: Number(item.not_submitted || 0)
        })),
        overdueKrisByDepartment: overdueKrisByDepartmentRows.map(item => ({
          kriCode: item['KRI Code'] || null,
          kriName: item['KRI Name'] || 'Unknown',
          function_name: item['Function'] || 'Unknown',
          threshold: item['Threshold'] ?? '',
          low_from: item['Low From'] ?? null,
          medium_from: item['Medium From'] ?? null,
          high_from: item['High From'] ?? null,
          month: item['Month'] || '',
          year: item['Year'] ?? '',
          value: item['Value'] ?? null,
          action_plan: item['Action Plan'] || '',
          target_date: item['Target Date'] || '',
          status: item['Status'] || ''
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
        kriRiskLinkageCounts: [
          { name: 'Linked with Risks', value: Number(kriRiskLinkageCountsRows[0]?.linked || 0), color: '#4472C4' },
          { name: 'Not Linked with Risks', value: Number(kriRiskLinkageCountsRows[0]?.notLinked || 0), color: '#EF3D3D' },
        ],
        kriRiskRelationships: kriRiskRelationships.map(item => ({
          kri_code: item.kri_code || null,
          kri_name: item.kri_name || 'Unknown',
          function_name: item.function_name || 'Unknown',
          risk_code: item.risk_code || null,
          risk_name: item.risk_name || 'Unknown'
        })),
        kriWithoutLinkedRisks: kriWithoutLinkedRisks.map(item => ({
          kriName: item.kriName || 'Unknown',
          kriCode: item.kriCode || null,
          function_name: item.function_name || 'Unknown'
        })),
        kriStatus: kriStatusRows.map(item => ({
          code: item.code || null,
          kri_name: item.kri_name || 'Unknown',
          function_name: item.function_name || 'Unknown',
          status: item.status || 'Unknown'
        })),
        kriDetailsWithActionPlans: kriDetailsWithActionPlansGrouped,
        activeKrisDetails: activeKrisDetailsRows.map(item => ({
          code: item.code || null,
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
        kriAssessmentCount: [],
        assessmentHistoryByLevel: []
      };
    }
  }

  async getKrisDashboardTablePage(
    user: any,
    tableId: string,
    page = 1,
    limit = 10,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
    submissionStartDate?: string,
    submissionEndDate?: string,
  ) {
    if (tableId === 'overallKris') {
      return this.getOverallKrisTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'allKrisSubmittedByFunction') {
      return this.getAllKrisSubmittedByFunctionTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, orderByFunctionAsc, submissionStartDate, submissionEndDate);
    }
    if (tableId === 'activeKrisDetails') {
      return this.getActiveKrisDetailsTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'overdueKrisByDepartment') {
      return this.getOverdueKrisByDepartmentTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, orderByFunctionAsc, submissionStartDate, submissionEndDate);
    }
    if (tableId === 'kriWithoutLinkedRisks') {
      return this.getKriWithoutLinkedRisksTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'kriRiskRelationships') {
      return this.getKriRiskRelationshipsTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, orderByFunctionAsc);
    }
    if (tableId === 'monthlyKriSubmissionByFunction') {
      return this.getMonthlyKriSubmissionByFunctionTablePage(user, page, limit, timeframe, startDate, endDate, selectedFunctionIds, orderByFunctionAsc, submissionStartDate, submissionEndDate);
    }

    const tablesPayload = await this.getKrisDashboard(
      user,
      timeframe,
      startDate,
      endDate,
      selectedFunctionIds,
      'tables',
      submissionStartDate,
      submissionEndDate,
    ) as Record<string, any[]>;

    const tableRows = {
      overallKris: tablesPayload.kriStatus || [],
      allKrisSubmittedByFunction: tablesPayload.allKrisSubmittedByFunction || [],
      activeKrisDetails: tablesPayload.activeKrisDetails || [],
      overdueKrisByDepartment: tablesPayload.overdueKrisByDepartment || [],
      kriWithoutLinkedRisks: tablesPayload.kriWithoutLinkedRisks || [],
      kriRiskRelationships: tablesPayload.kriRiskRelationships || [],
      kriDetailsWithActionPlans: tablesPayload.kriDetailsWithActionPlans || [],
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

  private async getKriDetailsWithActionPlansTablePage(
    user: any,
    page = 1,
    limit = 10,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const kriValueDateFilter = this.buildKriValueDateFilter(startDate, endDate);
    const rows = await this.getKriDetailsWithActionPlansGrouped(
      access,
      selectedFunctionIds,
      kriValueDateFilter,
    );
    const sortedRows = orderByFunctionAsc
      ? sortRowsByFunctionAsc(rows as Record<string, unknown>[])
      : rows;
    return this.paginateRows(sortedRows, page, limit);
  }

  private async getOverallKrisTablePage(
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
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);
    const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const countQuery = `SELECT COUNT(*) as total FROM Kris k WHERE k.isDeleted = 0 AND k.deletedAt IS NULL ${dateFilter} ${functionFilter}`;
    const dataQuery = `
      SELECT
        k.code AS code,
        k.kriName AS kri_name,
        ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
        k.createdAt AS createdAt,
        CASE 
          WHEN ISNULL(k.preparerStatus, '') <> 'sent' THEN 'Pending Preparer'
          WHEN ISNULL(k.preparerStatus, '') = 'sent' AND ISNULL(k.checkerStatus, '') <> 'approved' AND ISNULL(k.acceptanceStatus, '') <> 'approved' THEN 'Pending Checker'
          WHEN ISNULL(k.checkerStatus, '') = 'approved' AND ISNULL(k.reviewerStatus, '') <> 'sent' AND ISNULL(k.acceptanceStatus, '') <> 'approved' THEN 'Pending Reviewer'
          WHEN ISNULL(k.reviewerStatus, '') = 'sent' AND ISNULL(k.acceptanceStatus, '') <> 'approved' THEN 'Pending Acceptance'
          WHEN ISNULL(k.acceptanceStatus, '') = 'approved' THEN 'Approved'
          ELSE 'Unknown'
        END AS status
      FROM Kris k
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
      LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
      LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
      WHERE k.isDeleted = 0
        AND k.deletedAt IS NULL
        ${dateFilter}
        ${functionFilter}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, createdAt DESC' : 'createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: rows.map((item: any) => ({
        code: item.code || null,
        kri_name: item.kri_name || 'Unknown',
        function_name: item.function_name || 'Unknown',
        status: item.status || 'Unknown',
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getAllKrisSubmittedByFunctionTablePage(
    user: any,
    page = 1,
    limit = 10,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
    submissionStartDate?: string,
    submissionEndDate?: string,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);
    const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
    const kriValueSubmissionFilter = this.buildKriValueSubmissionFilter(submissionStartDate, submissionEndDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const groupedQuery = `
      SELECT
        ISNULL(COALESCE(frel.name, fkf.name), 'Unknown') AS [Function Name],
        MAX(k.createdAt) AS latest_created_at,
        SUM(DATEDIFF(MONTH, k.createdAt, GETDATE()) + 1) AS [Total KRIs],
        SUM(ISNULL(kv_counts.months_submitted, 0)) AS [Submitted KRIs],
        CASE
          WHEN SUM(DATEDIFF(MONTH, k.createdAt, GETDATE()) + 1) = SUM(ISNULL(kv_counts.months_submitted, 0))
          THEN 'Yes' ELSE 'No'
        END AS [All KRIs Submitted?]
      FROM Kris AS k
      LEFT JOIN Functions AS frel
        ON frel.id = k.related_function_id
        AND frel.isDeleted = 0
        AND frel.deletedAt IS NULL
      OUTER APPLY (
        -- A KRI can have several KriFunctions rows; TOP 1 keeps this to one row per KRI so
        -- SUM() below never double/triple-counts a KRI linked to multiple functions.
        SELECT TOP 1 f2.name
        FROM KriFunctions kf2
        INNER JOIN Functions f2 ON f2.id = kf2.function_id AND f2.isDeleted = 0 AND f2.deletedAt IS NULL
        WHERE kf2.kri_id = k.id AND kf2.deletedAt IS NULL
        ORDER BY kf2.function_id
      ) fkf(name)
      OUTER APPLY (
        SELECT COUNT(DISTINCT CONCAT(kv.[year], '-', kv.[month])) AS months_submitted
        FROM KriValues kv
        WHERE kv.kriId = k.id AND kv.deletedAt IS NULL
          ${kriValueSubmissionFilter}
      ) kv_counts
      WHERE
        k.isDeleted = 0
        AND k.deletedAt IS NULL
        ${dateFilter}
        ${functionFilter}
      GROUP BY ISNULL(COALESCE(frel.name, fkf.name), 'Unknown')
    `;
    const countQuery = `SELECT COUNT(*) as total FROM (${groupedQuery}) as grouped_kris`;
    const dataQuery = `
      ${groupedQuery}
      ORDER BY ${orderByFunctionAsc ? '[Function Name] ASC' : 'latest_created_at DESC, [Function Name] ASC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: rows.map((item: any) => ({
        function_name: item['Function Name'] || 'Unknown',
        all_submitted: item['All KRIs Submitted?'] || 'No',
        total_kris: item['Total KRIs'] || 0,
        submitted_kris: item['Submitted KRIs'] || 0,
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getActiveKrisDetailsTablePage(
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
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);
    const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const countQuery = `SELECT COUNT(*) as total FROM Kris k WHERE k.isDeleted = 0 AND k.deletedAt IS NULL AND k.status = 'active' ${dateFilter} ${functionFilter}`;
    const dataQuery = `
      SELECT
        k.code AS code,
        k.kriName AS kriName,
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
        k.status AS status,
        k.frequency AS frequency,
        k.threshold AS threshold,
        k.high_from AS high_from,
        k.medium_from AS medium_from,
        k.low_from AS low_from,
        ISNULL(f.name, NULL) AS function_name,
        k.createdAt AS createdAt
      FROM Kris k
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
      LEFT JOIN Functions f ON f.id = kf.function_id AND f.isDeleted = 0 AND f.deletedAt IS NULL
      LEFT JOIN users u ON k.assignedPersonId = u.id AND u.deletedAt IS NULL
      LEFT JOIN users u2 ON k.addedBy = u2.id AND u2.deletedAt IS NULL
      WHERE k.isDeleted = 0
        AND k.deletedAt IS NULL
        AND k.status = 'active'
        ${dateFilter}
        ${functionFilter}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, createdAt DESC' : 'createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: rows.map((item: any) => ({
        code: item.code || null,
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
        function_name: item.function_name || null,
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getOverdueKrisByDepartmentTablePage(
    user: any,
    page = 1,
    limit = 10,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
    submissionStartDate?: string,
    submissionEndDate?: string,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);
    const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
    const kriValueSubmissionFilter = this.buildKriValueSubmissionFilter(submissionStartDate, submissionEndDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const baseQuery = `
      SELECT
        k.code AS [KRI Code],
        k.kriName AS [KRI Name],
        k.createdAt AS createdAt,
        ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS [Function],
        ISNULL(k.threshold, '') AS [Threshold],
        k.low_from AS [Low From],
        k.medium_from AS [Medium From],
        k.high_from AS [High From],
        CASE
          WHEN ap.[month] BETWEEN 1 AND 12 AND ap.[year] BETWEEN 1 AND 9999
          THEN DATENAME(MONTH, DATEFROMPARTS(ap.[year], ap.[month], 1))
          ELSE ''
        END AS [Month],
        CASE WHEN ap.[year] BETWEEN 1 AND 9999 THEN ap.[year] ELSE NULL END AS [Year],
        kv.value AS [Value],
        ISNULL(ap.control_procedure, '') AS [Action Plan],
        FORMAT(CONVERT(datetime, ap.implementation_date), 'yyyy-MM-dd') AS [Target Date],
        CASE
          WHEN ap.id IS NULL THEN ''
          WHEN ISNULL(ap.business_unit, '') = '' THEN 'Pending'
          ELSE ap.business_unit
        END AS [Status]
      FROM Kris AS k
      LEFT JOIN Actionplans AS ap
        ON ap.kri_id = k.id
        AND ap.deletedAt IS NULL
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
      LEFT JOIN KriValues AS kv
        ON kv.kriId = k.id
        AND kv.[year] = ap.[year]
        AND kv.[month] = ap.[month]
        AND kv.deletedAt IS NULL
        ${kriValueSubmissionFilter}
      WHERE k.isDeleted = 0
        AND k.deletedAt IS NULL
        ${dateFilter}
        ${functionFilter}
    `;
    const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as overdue_kris`;
    const dataQuery = `
      ${baseQuery}
      ORDER BY CASE WHEN ap.implementation_date IS NULL THEN 1 ELSE 0 END,
               ap.implementation_date ASC, [Function], [KRI Name]
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: rows.map((item: any) => ({
        kriCode: item['KRI Code'] || null,
        kriName: item['KRI Name'] || 'Unknown',
        function_name: item['Function'] || 'Unknown',
        threshold: item['Threshold'] ?? '',
        low_from: item['Low From'] ?? null,
        medium_from: item['Medium From'] ?? null,
        high_from: item['High From'] ?? null,
        month: item['Month'] || '',
        year: item['Year'] ?? '',
        value: item['Value'] ?? null,
        action_plan: item['Action Plan'] || '',
        target_date: item['Target Date'] || '',
        status: item['Status'] || '',
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getKriWithoutLinkedRisksTablePage(
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
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);
    const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Kris AS k
      WHERE k.isDeleted = 0
        AND k.deletedAt IS NULL
        ${dateFilter}
        ${functionFilter}
        AND NOT EXISTS (
          SELECT 1
          FROM KriRisks AS kr
          WHERE kr.kri_id = k.id
            AND kr.deletedAt IS NULL
        )
    `;
    const dataQuery = `
      SELECT 
        k.kriName AS kriName, 
        k.code AS kriCode,
        k.createdAt AS createdAt,
        ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name
      FROM Kris AS k
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
      LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
      LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
      WHERE k.isDeleted = 0
        AND k.deletedAt IS NULL
        ${dateFilter}
        ${functionFilter}
        AND NOT EXISTS (
          SELECT 1
          FROM KriRisks AS kr
          WHERE kr.kri_id = k.id
            AND kr.deletedAt IS NULL
        )
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, createdAt DESC' : 'createdAt DESC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: rows.map((item: any) => ({
        kriName: item.kriName || 'Unknown',
        kriCode: item.kriCode || null,
        function_name: item.function_name || 'Unknown',
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  private async getKriRiskRelationshipsTablePage(
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
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);
    const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const baseQuery = `
      SELECT
        k.code AS kri_code,
        k.kriName AS kri_name,
        k.createdAt AS createdAt,
        ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
        r.code AS risk_code,
        r.name AS risk_name
      FROM Kris k
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
      LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
      LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
      INNER JOIN KriRisks kr
        ON kr.kri_id = k.id
        AND kr.deletedAt IS NULL
      INNER JOIN Risks r
        ON r.id = kr.risk_id
        AND r.isDeleted = 0
        AND r.deletedAt IS NULL
      WHERE k.isDeleted = 0
        AND k.deletedAt IS NULL
        ${dateFilter}
        ${functionFilter}
    `;
    const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as kri_risk_relationships`;
    const dataQuery = `
      ${baseQuery}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, createdAt DESC, kri_name ASC, risk_name ASC' : 'createdAt DESC, kri_name ASC, risk_name ASC'}
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;
    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: rows.map((item: any) => ({
        kri_code: item.kri_code || null,
        kri_name: item.kri_name || 'Unknown',
        function_name: item.function_name || 'Unknown',
        risk_code: item.risk_code || null,
        risk_name: item.risk_name || 'Unknown',
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  // Monthly KRI submission by function: one row per KRI per month (all months in the data),
  // ordered by function, showing whether a value was recorded that month (Submitted?).
  private async getMonthlyKriSubmissionByFunctionTablePage(
    user: any,
    page = 1,
    limit = 10,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    selectedFunctionIds?: string[],
    orderByFunctionAsc = false,
    submissionStartDate?: string,
    submissionEndDate?: string,
  ) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);
    const kriValueSubmissionFilter = this.buildKriValueSubmissionFilter(submissionStartDate, submissionEndDate);
    const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
    const limitInt = Math.max(1, Math.floor(Number(limit)) || 10);
    const offset = (pageInt - 1) * limitInt;
    const ctes = `
      WITH MonthsBase AS (
        SELECT
          (SELECT MIN(createdAt) FROM Kris WHERE isDeleted = 0 AND deletedAt IS NULL) AS start_date,
          (SELECT MAX(DATEFROMPARTS(TRY_CONVERT(int, [year]), TRY_CONVERT(int, [month]), 1))
           FROM KriValues WHERE deletedAt IS NULL AND [year] IS NOT NULL AND [month] IS NOT NULL) AS max_data_period
      ),
      Months AS (
        -- Continuous calendar months from the earliest KRI's creation month through the later
        -- of "now" or the latest month that actually has data, so zero-submission months still
        -- appear (as Not Submitted) and no real (even future-dated) submission is ever dropped.
        SELECT
          YEAR(DATEFROMPARTS(YEAR(start_date), MONTH(start_date), 1)) AS yr,
          MONTH(DATEFROMPARTS(YEAR(start_date), MONTH(start_date), 1)) AS mo,
          DATEFROMPARTS(YEAR(start_date), MONTH(start_date), 1) AS period,
          CASE WHEN max_data_period > DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
               THEN max_data_period ELSE DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1) END AS end_period
        FROM MonthsBase
        UNION ALL
        SELECT YEAR(DATEADD(MONTH, 1, period)), MONTH(DATEADD(MONTH, 1, period)), DATEADD(MONTH, 1, period), end_period
        FROM Months
        WHERE period < end_period
      ),
      Expected AS (
        SELECT m.yr, m.mo, k.id AS kri_id, k.code AS kri_code, k.kriName AS kri_name,
               ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name
        FROM Months m
        INNER JOIN Kris k
          ON k.isDeleted = 0 AND k.deletedAt IS NULL
          AND k.createdAt < DATEADD(MONTH, 1, DATEFROMPARTS(m.yr, m.mo, 1))
          ${functionFilter}
        LEFT JOIN KriFunctions kf ON kf.kri_id = k.id AND kf.deletedAt IS NULL
        LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
        LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
      ),
      Sub AS (
        SELECT kv.kriId, TRY_CONVERT(int, kv.[year]) AS yr, TRY_CONVERT(int, kv.[month]) AS mo,
               MAX(CASE WHEN kv.acceptanceStatus = 'approved' THEN 1 ELSE 0 END) AS is_approved
        FROM KriValues kv WHERE kv.deletedAt IS NULL
          ${kriValueSubmissionFilter}
        GROUP BY kv.kriId, TRY_CONVERT(int, kv.[year]), TRY_CONVERT(int, kv.[month])
      )`;
    const countQuery = `${ctes}
      SELECT COUNT(*) AS total
      FROM Expected e LEFT JOIN Sub s ON s.kriId = e.kri_id AND s.yr = e.yr AND s.mo = e.mo
      OPTION (MAXRECURSION 1000)`;
    const dataQuery = `${ctes}
      SELECT
        e.kri_code AS kri_code,
        e.kri_name AS kri_name,
        e.function_name AS function_name,
        DATENAME(MONTH, DATEFROMPARTS(e.yr, e.mo, 1)) AS month,
        e.yr AS year,
        CASE WHEN s.kriId IS NOT NULL THEN 'Yes' ELSE 'No' END AS submitted,
        CASE WHEN s.is_approved = 1 THEN 'Yes' ELSE 'No' END AS approved
      FROM Expected e
      LEFT JOIN Sub s ON s.kriId = e.kri_id AND s.yr = e.yr AND s.mo = e.mo
      ORDER BY e.function_name, e.kri_code, e.yr, e.mo
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
      OPTION (MAXRECURSION 1000)`;
    const [rows, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    return {
      data: rows.map((item: any) => ({
        kri_code: item.kri_code || null,
        kri_name: item.kri_name || 'Unknown',
        function_name: item.function_name || 'Unknown',
        month: item.month || '',
        year: item.year || '',
        submitted: item.submitted || 'No',
        approved: item.approved || 'No',
      })),
      pagination: this.buildPaginationMeta(pageInt, limitInt, total),
    };
  }

  async getTotalKris(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = ['k.isDeleted = 0', 'k.deletedAt IS NULL'];
    if (startDate) where.push(`k.createdAt >= '${startDate}'`);
    if (endDate) where.push(`k.createdAt <= '${endDate}'`);
    const whereSql = `WHERE ${where.join(' AND ')} ${functionFilter}`;

    const countQuery = `SELECT COUNT(*) as total FROM Kris k ${whereSql}`;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    // Catalog columns (same as ADIB /kris_catalog except Deleted): code, kri_name, function_name, frequency, threshold, added_by_name, assigned_person_name, type, type_percentage_or_figure, rcm_functions, risk_mapping, status, created_by_name, kri_status, first_approval, review, second_approval, createdAt
    const dataQuery = `
      SELECT
        k.code,
        k.kriName AS kri_name,
        ISNULL(f.name, '') AS function_name,
        ISNULL(k.frequency, '') AS frequency,
        ISNULL(k.threshold, '') AS threshold,
        k.low_from AS low_risk,
        k.medium_from AS medium_risk,
        k.high_from AS high_risk,
        ISNULL(added_by_u.name, '') AS added_by_name,
        ISNULL(assigned_u.name, '') AS assigned_person_name,
        ISNULL(k.type, '') AS type,
        ISNULL(k.typePercentageOrFigure, '') AS type_percentage_or_figure,
        (SELECT STUFF((
          SELECT ', ' + f2.name
          FROM KriFunctions kf
          INNER JOIN Functions f2 ON f2.id = kf.function_id AND f2.deletedAt IS NULL AND f2.isDeleted = 0
          WHERE kf.kri_id = k.id AND kf.deletedAt IS NULL
          ORDER BY f2.name
          FOR XML PATH(''), TYPE
        ).value('.', 'NVARCHAR(MAX)'), 1, 2, '')) AS rcm_functions,
        (SELECT STUFF((
          SELECT ', ' + r.name
          FROM KriRisks kr
          INNER JOIN Risks r ON r.id = kr.risk_id AND r.deletedAt IS NULL
          WHERE kr.kri_id = k.id AND kr.deletedAt IS NULL
          ORDER BY r.name
          FOR XML PATH(''), TYPE
        ).value('.', 'NVARCHAR(MAX)'), 1, 2, '')) AS risk_mapping,
        ISNULL(k.status, '') AS status,
        ISNULL(created_by_u.name, '') AS created_by_name,
        CASE 
          WHEN ISNULL(k.preparerStatus, '') <> 'sent' THEN 'Draft'
          WHEN ISNULL(k.reviewerStatus, '') = 'sent' THEN 'Review Sent'
          WHEN ISNULL(k.acceptanceStatus, '') = 'approved' THEN 'Approved'
          ELSE 'In Progress'
        END AS kri_status,
        CASE WHEN k.checkerStatus = 'approved' THEN 'Approved' WHEN k.checkerStatus = 'refused' THEN 'Refused' WHEN k.checkerStatus IS NULL THEN (CASE WHEN LOWER(k.preparerStart) LIKE '%orm%' THEN 'N/A' ELSE 'Pending' END) ELSE 'Pending' END AS first_approval,
        CASE WHEN k.reviewerStatus = 'sent' THEN 'Sent' WHEN k.reviewerStatus IS NULL THEN (CASE WHEN LOWER(k.preparerStart) LIKE '%orm%' THEN 'N/A' ELSE 'Pending' END) ELSE 'Pending' END AS review,
        CASE WHEN ISNULL(k.acceptanceStatus, '') = 'approved' THEN 'Approved' WHEN ISNULL(k.acceptanceStatus, '') = 'refused' THEN 'Refused' ELSE 'Pending' END AS second_approval,
        k.createdAt AS createdAt
      FROM Kris k
      LEFT JOIN Functions f ON k.related_function_id = f.id AND f.isDeleted = 0 AND f.deletedAt IS NULL
      LEFT JOIN users added_by_u ON k.addedBy = added_by_u.id AND added_by_u.deletedAt IS NULL
      LEFT JOIN users assigned_u ON k.assignedPersonId = assigned_u.id AND assigned_u.deletedAt IS NULL
      LEFT JOIN users created_by_u ON k.created_by = created_by_u.id AND created_by_u.deletedAt IS NULL
      ${whereSql}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, createdAt DESC' : 'k.createdAt DESC'}
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
  async getPendingPreparerKris(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

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
        ISNULL(${this.kriFunctionNameSubquery('k')}, 'Unknown') AS function_name,
        'Pending Preparer' as status,
        k.createdAt
      FROM Kris k
      ${whereSql}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, createdAt DESC' : 'k.createdAt DESC'}
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

  async getPendingCheckerKris(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

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
        ISNULL(${this.kriFunctionNameSubquery('k')}, 'Unknown') AS function_name,
        'Pending Checker' as status,
        k.createdAt
      FROM Kris k
      ${whereSql}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, createdAt DESC' : 'k.createdAt DESC'}
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

  async getPendingReviewerKris(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

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
        ISNULL(${this.kriFunctionNameSubquery('k')}, 'Unknown') AS function_name,
        'Pending Reviewer' as status,
        k.createdAt
      FROM Kris k
      ${whereSql}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, createdAt DESC' : 'k.createdAt DESC'}
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

  async getPendingAcceptanceKris(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], orderByFunctionAsc: boolean = false) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

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
        ISNULL(${this.kriFunctionNameSubquery('k')}, 'Unknown') AS function_name,
        'Pending Acceptance' as status,
        k.createdAt
      FROM Kris k
      ${whereSql}
      ORDER BY ${orderByFunctionAsc ? 'function_name ASC, createdAt DESC' : 'k.createdAt DESC'}
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
  async getKrisByStatus(user: any, status: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

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
        ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
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

  async getKrisByLevel(user: any, level: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], submissionStartDate?: string, submissionEndDate?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);

    // Build date filter
    let dateFilter = '';
    if (startDate) dateFilter += `AND k.createdAt >= '${startDate}'`;
    if (endDate) dateFilter += `AND k.createdAt <= '${endDate}'`;
    const kriValueSubmissionFilter = this.buildKriValueSubmissionFilter(submissionStartDate, submissionEndDate);

    // Use the same logic as the dashboard chart: bucket each KRI by the assessment
    // recorded on its latest KRI value. This keeps the detail view consistent with
    // the "KRIs by Risk Level" chart.
    const levelFilter = `level_bucket = '${level === 'Unknown' ? 'Unknown' : level.replace(/'/g, "''")}'`;
    const query = `
      WITH LatestKV AS (
        SELECT kv.kriId,
               UPPER(LTRIM(RTRIM(kv.assessment))) AS assessment,
               ROW_NUMBER() OVER (PARTITION BY kv.kriId ORDER BY COALESCE(CONVERT(datetime, CONCAT(kv.[year], '-', kv.[month], '-01')), kv.createdAt) DESC) rn
        FROM KriValues kv
        WHERE kv.deletedAt IS NULL
          ${kriValueSubmissionFilter}
      ),
      K AS (
        SELECT k.id,
               k.code,
               k.kriName,
               k.createdAt,
               ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name
        FROM Kris k
        LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
        LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
        LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
        WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
      ),
      Derived AS (
        SELECT
          K.code,
          K.kriName AS name,
          K.createdAt,
          K.function_name,
          CASE lk.assessment
            WHEN 'HIGH'   THEN 'High'
            WHEN 'MEDIUM' THEN 'Medium'
            WHEN 'LOW'    THEN 'Low'
            ELSE 'Unknown'
          END AS level_bucket
        FROM K
        LEFT JOIN LatestKV lk ON lk.kriId = K.id AND lk.rn = 1
      )
      SELECT
        code,
        name,
        function_name,
        createdAt
      FROM Derived
      WHERE ${levelFilter}
      ORDER BY createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      WITH LatestKV AS (
        SELECT kv.kriId,
               UPPER(LTRIM(RTRIM(kv.assessment))) AS assessment,
               ROW_NUMBER() OVER (PARTITION BY kv.kriId ORDER BY COALESCE(CONVERT(datetime, CONCAT(kv.[year], '-', kv.[month], '-01')), kv.createdAt) DESC) rn
        FROM KriValues kv
        WHERE kv.deletedAt IS NULL
          ${kriValueSubmissionFilter}
      ),
      K AS (
        SELECT k.id
        FROM Kris k
        WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
          ${dateFilter}
          ${functionFilter}
      ),
      Derived AS (
        SELECT
          CASE lk.assessment
            WHEN 'HIGH'   THEN 'High'
            WHEN 'MEDIUM' THEN 'Medium'
            WHEN 'LOW'    THEN 'Low'
            ELSE 'Unknown'
          END AS level_bucket
        FROM K
        LEFT JOIN LatestKV lk ON lk.kriId = K.id AND lk.rn = 1
      )
      SELECT COUNT(*) as total
      FROM Derived
      WHERE ${levelFilter}
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

  async getKrisByFunction(user: any, functionName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, submissionStatus?: string, selectedFunctionIds?: string[], submissionStartDate?: string, submissionEndDate?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const kriValueSubmissionFilter = this.buildKriValueSubmissionFilter(submissionStartDate, submissionEndDate);

    if (submissionStatus === 'submitted') {
      // "Submitted KRIs" on the parent table is a sum of submitted MONTHS, not a count of KRIs,
      // so this drill-down must return one row per (KRI, month) to match that number exactly —
      // unlike the default path below (KRI-level), which is shared with Breached KRIs by Function
      // and must stay untouched.
      return this.getSubmittedKriMonthsByFunction(functionName, pageInt, limitInt, offset, functionFilter, kriValueSubmissionFilter);
    }
    if (submissionStatus === 'total') {
      // "Total KRIs" on the parent table is likewise a sum of active MONTHS (submitted or not),
      // gated behind its own param (only sent when clicking that table's "Total KRIs" column) so
      // the shared default path below — used by Breached KRIs by Function — stays untouched.
      return this.getTotalKriMonthsByFunction(functionName, pageInt, limitInt, offset, functionFilter);
    }

    const where: string[] = ["k.isDeleted = 0", "k.deletedAt IS NULL"];

    // Handle function filter — match on the resolved function name (related_function_id
    // prioritized over KriFunctions, same as allKrisSubmittedByFunctionQuery) rather than an
    // OR of both raw fields, so a KRI is only matched under the one function it's bucketed as.
    if (functionName === 'Unknown') {
      where.push("(COALESCE(frel.name, fkf.name) IS NULL OR COALESCE(frel.name, fkf.name) = '')");
    } else {
      where.push(`ISNULL(COALESCE(frel.name, fkf.name), 'Unknown') = '${functionName.replace(/'/g, "''")}'`);
    }

    // Handle submission status filter (for "Submitted KRIs" column)
    if (submissionStatus === 'submitted') {
      // Match the logic from allKrisSubmittedByFunctionQuery: preparerStatus = 'sent' (submitted means sent by preparer, not necessarily approved)
      where.push("ISNULL(k.preparerStatus, '') = 'sent'");
    }

    if (startDate) where.push(`k.createdAt >= '${startDate}'`);
    if (endDate) where.push(`k.createdAt <= '${endDate}'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')} ${functionFilter}` : `WHERE 1=1 ${functionFilter}`;

    // A KRI can have several KriFunctions rows; TOP 1 keeps this to one row per KRI so a KRI
    // never appears multiple times under different function labels.
    const fkfApply = `
      OUTER APPLY (
        SELECT TOP 1 f2.name
        FROM KriFunctions kf2
        INNER JOIN Functions f2 ON f2.id = kf2.function_id AND f2.isDeleted = 0 AND f2.deletedAt IS NULL
        WHERE kf2.kri_id = k.id AND kf2.deletedAt IS NULL
        ORDER BY kf2.function_id
      ) fkf(name)
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Kris k
      LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
      ${fkfApply}
      ${whereSql}
    `;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    const dataQuery = `
      SELECT
        k.code,
        k.kriName as name,
        ISNULL(COALESCE(frel.name, fkf.name), 'Unknown') AS function_name,
        k.createdAt as createdAt
      FROM Kris k
      LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
      ${fkfApply}
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

  // One row per (KRI, month) that was actually submitted, for a single function — the exact
  // per-month breakdown behind "Submitted KRIs" in allKrisSubmittedByFunctionQuery, so the
  // drill-down's row count always matches that parent number.
  private async getSubmittedKriMonthsByFunction(
    functionName: string,
    pageInt: number,
    limitInt: number,
    offset: number,
    functionFilter: string,
    kriValueSubmissionFilter: string = '',
  ) {
    const functionMatch =
      functionName === 'Unknown'
        ? "(COALESCE(frel.name, fkf.name) IS NULL OR COALESCE(frel.name, fkf.name) = '')"
        : `ISNULL(COALESCE(frel.name, fkf.name), 'Unknown') = '${functionName.replace(/'/g, "''")}'`;
    const ctes = `
      WITH KriMonths AS (
        SELECT
          k.id AS kri_id, k.code AS kri_code, k.kriName AS kri_name, k.createdAt AS kri_created_at,
          DATEFROMPARTS(YEAR(k.createdAt), MONTH(k.createdAt), 1) AS period,
          DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1) AS end_period,
          ISNULL(COALESCE(frel.name, fkf.name), 'Unknown') AS function_name
        FROM Kris k
        LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
        OUTER APPLY (
          SELECT TOP 1 f2.name
          FROM KriFunctions kf2
          INNER JOIN Functions f2 ON f2.id = kf2.function_id AND f2.isDeleted = 0 AND f2.deletedAt IS NULL
          WHERE kf2.kri_id = k.id AND kf2.deletedAt IS NULL
          ORDER BY kf2.function_id
        ) fkf(name)
        WHERE k.isDeleted = 0 AND k.deletedAt IS NULL ${functionFilter}
          AND ${functionMatch}
        UNION ALL
        SELECT kri_id, kri_code, kri_name, kri_created_at, DATEADD(MONTH, 1, period), end_period, function_name
        FROM KriMonths
        WHERE period < end_period
      ),
      Expected AS (
        SELECT YEAR(period) AS yr, MONTH(period) AS mo, kri_id, kri_code, kri_name, kri_created_at, function_name
        FROM KriMonths
      ),
      Sub AS (
        SELECT DISTINCT kv.kriId, TRY_CONVERT(int, kv.[year]) AS yr, TRY_CONVERT(int, kv.[month]) AS mo
        FROM KriValues kv WHERE kv.deletedAt IS NULL
          ${kriValueSubmissionFilter}
      )`;
    const countQuery = `${ctes}
      SELECT COUNT(*) AS total, COUNT(DISTINCT e.kri_id) AS uniqueKris
      FROM Expected e INNER JOIN Sub s ON s.kriId = e.kri_id AND s.yr = e.yr AND s.mo = e.mo
      OPTION (MAXRECURSION 1000)`;
    const dataQuery = `${ctes}
      SELECT
        e.kri_code AS code,
        e.kri_name AS name,
        e.function_name AS function_name,
        DATENAME(MONTH, DATEFROMPARTS(e.yr, e.mo, 1)) AS month,
        e.yr AS year,
        e.kri_created_at AS createdAt
      FROM Expected e
      INNER JOIN Sub s ON s.kriId = e.kri_id AND s.yr = e.yr AND s.mo = e.mo
      ORDER BY e.yr DESC, e.mo DESC, e.kri_name
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
      OPTION (MAXRECURSION 1000)`;
    const [data, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    const uniqueKrisCount = Number(countResult?.[0]?.uniqueKris ?? 0);
    return {
      data,
      uniqueKrisCount,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages: Math.ceil(total / limitInt),
        hasNext: offset + limitInt < total,
        hasPrev: pageInt > 1,
      },
    };
  }

  // One row per (KRI, month) the KRI was active for, for a single function — the exact per-month
  // breakdown behind "Total KRIs" in allKrisSubmittedByFunctionQuery (submitted or not), so the
  // drill-down's row count always matches that parent number.
  private async getTotalKriMonthsByFunction(
    functionName: string,
    pageInt: number,
    limitInt: number,
    offset: number,
    functionFilter: string,
  ) {
    const functionMatch =
      functionName === 'Unknown'
        ? "(COALESCE(frel.name, fkf.name) IS NULL OR COALESCE(frel.name, fkf.name) = '')"
        : `ISNULL(COALESCE(frel.name, fkf.name), 'Unknown') = '${functionName.replace(/'/g, "''")}'`;
    const ctes = `
      WITH KriMonths AS (
        SELECT
          k.id AS kri_id, k.code AS kri_code, k.kriName AS kri_name, k.createdAt AS kri_created_at,
          DATEFROMPARTS(YEAR(k.createdAt), MONTH(k.createdAt), 1) AS period,
          DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1) AS end_period,
          ISNULL(COALESCE(frel.name, fkf.name), 'Unknown') AS function_name
        FROM Kris k
        LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
        OUTER APPLY (
          SELECT TOP 1 f2.name
          FROM KriFunctions kf2
          INNER JOIN Functions f2 ON f2.id = kf2.function_id AND f2.isDeleted = 0 AND f2.deletedAt IS NULL
          WHERE kf2.kri_id = k.id AND kf2.deletedAt IS NULL
          ORDER BY kf2.function_id
        ) fkf(name)
        WHERE k.isDeleted = 0 AND k.deletedAt IS NULL ${functionFilter}
          AND ${functionMatch}
        UNION ALL
        SELECT kri_id, kri_code, kri_name, kri_created_at, DATEADD(MONTH, 1, period), end_period, function_name
        FROM KriMonths
        WHERE period < end_period
      ),
      Expected AS (
        SELECT YEAR(period) AS yr, MONTH(period) AS mo, kri_id, kri_code, kri_name, kri_created_at, function_name
        FROM KriMonths
      ),
      Sub AS (
        SELECT DISTINCT kv.kriId, TRY_CONVERT(int, kv.[year]) AS yr, TRY_CONVERT(int, kv.[month]) AS mo
        FROM KriValues kv WHERE kv.deletedAt IS NULL
      )`;
    const countQuery = `${ctes}
      SELECT COUNT(*) AS total, COUNT(DISTINCT e.kri_id) AS uniqueKris
      FROM Expected e
      OPTION (MAXRECURSION 1000)`;
    const dataQuery = `${ctes}
      SELECT
        e.kri_code AS code,
        e.kri_name AS name,
        e.function_name AS function_name,
        DATENAME(MONTH, DATEFROMPARTS(e.yr, e.mo, 1)) AS month,
        e.yr AS year,
        CASE WHEN s.kriId IS NOT NULL THEN 'Yes' ELSE 'No' END AS submitted,
        e.kri_created_at AS createdAt
      FROM Expected e
      LEFT JOIN Sub s ON s.kriId = e.kri_id AND s.yr = e.yr AND s.mo = e.mo
      ORDER BY e.yr DESC, e.mo DESC, e.kri_name
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
      OPTION (MAXRECURSION 1000)`;
    const [data, countResult] = await Promise.all([
      this.databaseService.query(dataQuery),
      this.databaseService.query(countQuery),
    ]);
    const total = Number(countResult?.[0]?.total ?? 0);
    const uniqueKrisCount = Number(countResult?.[0]?.uniqueKris ?? 0);
    return {
      data,
      uniqueKrisCount,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages: Math.ceil(total / limitInt),
        hasNext: offset + limitInt < total,
        hasPrev: pageInt > 1,
      },
    };
  }

  async getKrisWithAssessmentsByFunction(user: any, functionName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], submissionStartDate?: string, submissionEndDate?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const kriFunctionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

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
    const kriValueSubmissionFilter = this.buildKriValueSubmissionFilter(submissionStartDate, submissionEndDate);

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
        ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
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
        ${kriValueSubmissionFilter}
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
        ${kriValueSubmissionFilter}
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

  async getKrisByFrequency(user: any, frequency: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

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
        ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
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

  async getRisksByKriName(user: any, kriName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
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
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

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
        ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
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
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
      LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
      LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
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

  async getKrisByMonthYear(user: any, monthYear: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

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
        ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
        k.createdAt as createdAt
      FROM Kris k
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
      LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
      LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
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

  async getDeletedKrisByMonthYear(user: any, monthYear: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);
    const where: string[] = [
      "(k.isDeleted = 1 OR k.deletedAt IS NOT NULL)",
      "COALESCE(k.deletedAt, k.createdAt) IS NOT NULL",
    ];

    let monthFilter = '';
    if (monthYear && monthYear !== 'Unknown') {
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
          const yearNum = parseInt(year, 10);
          const monthNumInt = parseInt(monthNum, 10);
          if (!isNaN(yearNum) && !isNaN(monthNumInt) && monthNumInt >= 1 && monthNumInt <= 12) {
            monthFilter = `AND YEAR(COALESCE(k.deletedAt, k.createdAt)) = ${yearNum} AND MONTH(COALESCE(k.deletedAt, k.createdAt)) = ${monthNumInt}`;
          }
        }
      }
    }

    if (startDate) where.push(`COALESCE(k.deletedAt, k.createdAt) >= '${startDate}'`);
    if (endDate) where.push(`COALESCE(k.deletedAt, k.createdAt) <= '${endDate}'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM Kris k ${whereSql} ${monthFilter} ${functionFilter}`;
    const totalRes = await this.databaseService.query(countQuery);
    const total = totalRes?.[0]?.total || 0;

    const dataQuery = `
      SELECT 
        k.code,
        k.kriName as name,
        ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
        COALESCE(k.deletedAt, k.createdAt) as deletedAt
      FROM Kris k
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
      LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
      LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
      ${whereSql}
      ${monthFilter}
      ${functionFilter}
      ORDER BY COALESCE(k.deletedAt, k.createdAt) DESC
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

  async getKriAssessmentsByMonthAndLevel(user: any, monthYear: string, assessmentLevel: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[], submissionStartDate?: string, submissionEndDate?: string) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

    // Ensure page and limit are integers
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.floor(Number(limit)) || 10;
    const offset = Math.floor((pageInt - 1) * limitInt);

    // Build date filter for assessments - matching the chart query format
    let dateFilter = '';
    if (startDate) dateFilter += `AND kv.createdAt >= '${startDate}'`;
    if (endDate) dateFilter += `AND kv.createdAt <= '${endDate}'`;
    const kriValueSubmissionFilter = this.buildKriValueSubmissionFilter(submissionStartDate, submissionEndDate);

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
        ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
        kv.createdAt as createdAt
      FROM Kris AS k
      INNER JOIN KriValues AS kv
        ON kv.kriId = k.id
        AND kv.deletedAt IS NULL
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
      LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
      LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
      WHERE
        k.isDeleted = 0
        AND k.deletedAt IS NULL
        ${functionFilter}
        ${assessmentFilter}
        ${monthFilter}
        ${dateFilter}
        ${kriValueSubmissionFilter}
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
        ${kriValueSubmissionFilter}
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

  async getKrisByOverdueStatus(user: any, overdueStatus: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, selectedFunctionIds?: string[]) {
    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(user);
    const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, selectedFunctionIds);

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
        ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') AS function_name,
        k.createdAt as createdAt
      FROM Kris k
      LEFT JOIN KriFunctions kf ON k.id = kf.kri_id AND kf.deletedAt IS NULL
      LEFT JOIN Functions fkf ON fkf.id = kf.function_id AND fkf.isDeleted = 0 AND fkf.deletedAt IS NULL
      LEFT JOIN Functions frel ON frel.id = k.related_function_id AND frel.isDeleted = 0 AND frel.deletedAt IS NULL
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
