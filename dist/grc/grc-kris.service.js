"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrcKrisService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const user_function_access_service_1 = require("../shared/user-function-access.service");
let GrcKrisService = class GrcKrisService {
    constructor(databaseService, userFunctionAccess) {
        this.databaseService = databaseService;
        this.userFunctionAccess = userFunctionAccess;
    }
    buildDateFilter(timeframe, startDate, endDate) {
        if (startDate || endDate) {
            let filter = '';
            if (startDate) {
                filter += ` AND k.createdAt >= '${startDate}'`;
            }
            if (endDate) {
                const endDateObj = new Date(endDate);
                endDateObj.setDate(endDateObj.getDate() + 1);
                filter += ` AND k.createdAt < '${endDateObj.toISOString()}'`;
            }
            return filter;
        }
        if (!timeframe)
            return '';
        const now = new Date();
        let startDateObj;
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
    async getKrisDashboard(user, timeframe, startDate, endDate, functionId) {
        try {
            console.log('[getKrisDashboard] Received parameters:', { timeframe, startDate, endDate, functionId, userId: user.id, groupName: user.groupName });
            const dateFilter = this.buildDateFilter(timeframe, startDate, endDate);
            console.log('[getKrisDashboard] Date filter:', dateFilter);
            const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
            console.log('[getKrisDashboard] User access:', { isSuperAdmin: access.isSuperAdmin, functionIds: access.functionIds });
            const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
            console.log('[getKrisDashboard] Function filter:', functionFilter);
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
            }
            catch (e) {
                console.error('KRIs total query failed:', e);
            }
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
            let statusCountsRow = {};
            try {
                const [statusCountsResult] = await this.databaseService.query(krisStatusCountsQuery);
                statusCountsRow = statusCountsResult || {};
                console.log('[KRI Dashboard] Status counts query result:', JSON.stringify(statusCountsRow));
            }
            catch (e) {
                console.error('KRIs status counts query failed:', e);
            }
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
            let krisByLevel = [];
            try {
                krisByLevel = await this.databaseService.query(krisByLevelQuery);
            }
            catch (e) {
                console.error('KRIs by level query failed:', e);
            }
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
            let breachedKRIsByDepartment = [];
            try {
                breachedKRIsByDepartment = await this.databaseService.query(breachedKRIsByDepartmentQuery);
            }
            catch (e) {
                console.error('Breached KRIs by function query failed:', e);
            }
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
            let kriHealth = [];
            try {
                kriHealth = await this.databaseService.query(kriHealthQuery);
            }
            catch (e) {
                console.error('KRI health query failed:', e);
            }
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
            let kriAssessmentCount = [];
            try {
                kriAssessmentCount = await this.databaseService.query(kriAssessmentCountQuery);
            }
            catch (e) {
                console.error('KRI assessment count query failed:', e);
            }
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
            let kriMonthlyAssessment = [];
            try {
                kriMonthlyAssessment = await this.databaseService.query(kriMonthlyAssessmentQuery);
            }
            catch (e) {
                console.error('KRI monthly assessment query failed:', e);
            }
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
            let newlyCreatedKrisPerMonth = [];
            try {
                newlyCreatedKrisPerMonth = await this.databaseService.query(newlyCreatedKrisPerMonthQuery);
            }
            catch (e) {
                console.error('Newly created KRIs per month query failed:', e);
            }
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
            let deletedKrisPerMonth = [];
            try {
                deletedKrisPerMonth = await this.databaseService.query(deletedKrisPerMonthQuery);
            }
            catch (e) {
                console.error('Deleted KRIs per month query failed:', e);
            }
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
            let kriOverdueStatusCountsRows = [];
            try {
                kriOverdueStatusCountsRows = await this.databaseService.query(kriOverdueStatusCountsQuery);
            }
            catch (e) {
                console.error('KRI overdue status counts query failed:', e);
            }
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
            let overdueKrisByDepartmentRows = [];
            try {
                overdueKrisByDepartmentRows = await this.databaseService.query(overdueKrisByDepartmentQuery);
            }
            catch (e) {
                console.error('Overdue KRIs by department query failed:', e);
            }
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
            let allKrisSubmittedByFunctionRows = [];
            try {
                allKrisSubmittedByFunctionRows = await this.databaseService.query(allKrisSubmittedByFunctionQuery);
            }
            catch (e) {
                console.error('All KRIs submitted by function query failed:', e);
            }
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
            let kriCountsByMonthYear = [];
            try {
                kriCountsByMonthYear = await this.databaseService.query(kriCountsByMonthYearQuery);
                console.log('[KRI Dashboard] kriCountsByMonthYear query result:', JSON.stringify(kriCountsByMonthYear.slice(0, 3)));
            }
            catch (e) {
                console.error('KRI counts by Month/Year query failed:', e);
            }
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
            let kriCountsByFrequency = [];
            try {
                kriCountsByFrequency = await this.databaseService.query(kriCountsByFrequencyQuery);
            }
            catch (e) {
                console.error('KRI counts by frequency query failed:', e);
            }
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
            let kriRisksByKriName = [];
            try {
                kriRisksByKriName = await this.databaseService.query(kriRisksByKriNameQuery);
            }
            catch (e) {
                console.error('KRI risks by KRI name query failed:', e);
            }
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
            let kriRiskRelationships = [];
            try {
                kriRiskRelationships = await this.databaseService.query(kriRiskRelationshipsQuery);
            }
            catch (e) {
                console.error('KRI risk relationships query failed:', e);
            }
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
            let kriWithoutLinkedRisks = [];
            try {
                kriWithoutLinkedRisks = await this.databaseService.query(kriWithoutLinkedRisksQuery);
            }
            catch (e) {
                console.error('KRIs without linked risks query failed:', e);
            }
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
            let kriStatusRows = [];
            try {
                kriStatusRows = await this.databaseService.query(kriStatusQuery);
            }
            catch (e) {
                console.error('Overall KRI statuses query failed:', e);
            }
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
      `;
            let activeKrisDetailsRows = [];
            try {
                activeKrisDetailsRows = await this.databaseService.query(activeKrisDetailsQuery);
            }
            catch (e) {
                console.error('Active KRIs details query failed:', e);
            }
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
        }
        catch (error) {
            console.error('Fatal error fetching KRIs dashboard data:', error);
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
    async getTotalKris(user, page = 1, limit = 10, startDate, endDate, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        const where = ["k.isDeleted = 0"];
        if (startDate)
            where.push(`k.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`k.createdAt <= '${endDate}'`);
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
    async getPendingPreparerKris(user, page = 1, limit = 10, startDate, endDate, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        const where = ["k.isDeleted = 0", "k.deletedAt IS NULL", "ISNULL(k.preparerStatus, '') <> 'sent'"];
        if (startDate)
            where.push(`k.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`k.createdAt <= '${endDate}'`);
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
    async getPendingCheckerKris(user, page = 1, limit = 10, startDate, endDate, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        const where = [
            "k.isDeleted = 0",
            "k.deletedAt IS NULL",
            "ISNULL(k.preparerStatus, '') = 'sent'",
            "ISNULL(k.checkerStatus, '') <> 'approved'",
            "ISNULL(k.acceptanceStatus, '') <> 'approved'"
        ];
        if (startDate)
            where.push(`k.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`k.createdAt <= '${endDate}'`);
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
    async getPendingReviewerKris(user, page = 1, limit = 10, startDate, endDate, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        const where = [
            "k.isDeleted = 0",
            "k.deletedAt IS NULL",
            "ISNULL(k.checkerStatus, '') = 'approved'",
            "ISNULL(k.reviewerStatus, '') <> 'sent'",
            "ISNULL(k.acceptanceStatus, '') <> 'approved'"
        ];
        if (startDate)
            where.push(`k.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`k.createdAt <= '${endDate}'`);
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
    async getPendingAcceptanceKris(user, page = 1, limit = 10, startDate, endDate, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        const where = [
            "k.isDeleted = 0",
            "k.deletedAt IS NULL",
            "ISNULL(k.reviewerStatus, '') = 'sent'",
            "ISNULL(k.acceptanceStatus, '') <> 'approved'"
        ];
        if (startDate)
            where.push(`k.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`k.createdAt <= '${endDate}'`);
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
    async exportKris(user, format, timeframe) {
        return {
            message: `Exporting KRIs data in ${format} format`,
            timeframe: timeframe || 'all',
            status: 'success'
        };
    }
    async getKrisByStatus(user, status, page = 1, limit = 10, startDate, endDate, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        const where = ["k.isDeleted = 0", "k.deletedAt IS NULL"];
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
                return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
        }
        if (startDate)
            where.push(`k.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`k.createdAt <= '${endDate}'`);
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
    async getKrisByLevel(user, level, page = 1, limit = 10, startDate, endDate, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        let dateFilter = '';
        if (startDate)
            dateFilter += `AND k.createdAt >= '${startDate}'`;
        if (endDate)
            dateFilter += `AND k.createdAt <= '${endDate}'`;
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
    async getKrisByFunction(user, functionName, page = 1, limit = 10, startDate, endDate, submissionStatus, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        const where = ["k.isDeleted = 0", "k.deletedAt IS NULL"];
        if (functionName === 'Unknown') {
            where.push("(COALESCE(fkf.name, frel.name) IS NULL OR COALESCE(fkf.name, frel.name) = '')");
        }
        else {
            where.push(`(fkf.name = '${functionName.replace(/'/g, "''")}' OR frel.name = '${functionName.replace(/'/g, "''")}')`);
        }
        if (submissionStatus === 'submitted') {
            where.push("ISNULL(k.preparerStatus, '') = 'sent'");
        }
        if (startDate)
            where.push(`k.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`k.createdAt <= '${endDate}'`);
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
    async getKrisWithAssessmentsByFunction(user, functionName, page = 1, limit = 10, startDate, endDate, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const kriFunctionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        let dateFilter = '';
        if (startDate)
            dateFilter += `AND kv.createdAt >= '${startDate}'`;
        if (endDate)
            dateFilter += `AND kv.createdAt <= '${endDate}'`;
        let functionFilter = '';
        if (functionName === 'Unknown') {
            functionFilter = "AND (COALESCE(fkf.name, frel.name) IS NULL OR COALESCE(fkf.name, frel.name) = '')";
        }
        else {
            const escapedFunctionName = functionName.replace(/'/g, "''");
            functionFilter = `AND ISNULL(COALESCE(fkf.name, frel.name), 'Unknown') = '${escapedFunctionName}'`;
        }
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
    async getKrisByFrequency(user, frequency, page = 1, limit = 10, startDate, endDate, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        const where = ["k.isDeleted = 0", "k.deletedAt IS NULL"];
        if (frequency === 'Unknown') {
            where.push("(k.frequency IS NULL OR k.frequency = '')");
        }
        else {
            where.push(`k.frequency = '${frequency}'`);
        }
        if (startDate)
            where.push(`k.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`k.createdAt <= '${endDate}'`);
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
    async getRisksByKriName(user, kriName, page = 1, limit = 10, startDate, endDate, functionId) {
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        let decodedKriName = kriName;
        try {
            decodedKriName = decodeURIComponent(kriName);
            try {
                decodedKriName = decodeURIComponent(decodedKriName);
            }
            catch (e) {
            }
        }
        catch (e) {
            decodedKriName = kriName;
        }
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        console.log('[getRisksByKriName] Received kriName:', kriName);
        console.log('[getRisksByKriName] Decoded kriName:', decodedKriName);
        const escapedForExact = decodedKriName.replace(/'/g, "''");
        const escapedForLike = decodedKriName
            .replace(/'/g, "''")
            .replace(/%/g, '[%]')
            .replace(/_/g, '[_]')
            .replace(/\[/g, '[[]');
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
        console.log('[getRisksByKriName] Count query:', countQuery);
        const totalRes = await this.databaseService.query(countQuery);
        const total = totalRes?.[0]?.total || 0;
        console.log('[getRisksByKriName] Total count:', total);
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
        console.log('[getRisksByKriName] Data query:', dataQuery);
        const data = await this.databaseService.query(dataQuery);
        console.log('[getRisksByKriName] Data returned:', data?.length || 0, 'rows');
        if (total === 0 && decodedKriName !== 'Unknown') {
            console.log('[getRisksByKriName] No match found, checking database for similar names...');
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
                console.log('[getRisksByKriName] Similar KRI names in database:', debugResults);
            }
            catch (e) {
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
    async getKrisByMonthYear(user, monthYear, page = 1, limit = 10, startDate, endDate, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        const where = ["k.isDeleted = 0", "k.deletedAt IS NULL"];
        let monthFilter = '';
        if (monthYear && monthYear !== 'Unknown') {
            const monthYearPattern = /(\w+)\s+(\d{4})/i;
            const match = monthYear.match(monthYearPattern);
            if (match) {
                const monthName = match[1];
                const year = match[2];
                const monthMap = {
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
                        monthFilter = `AND YEAR(k.createdAt) = ${yearNum} AND MONTH(k.createdAt) = ${monthNumInt}`;
                    }
                }
            }
        }
        if (startDate)
            where.push(`k.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`k.createdAt <= '${endDate}'`);
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
    async getKriAssessmentsByMonthAndLevel(user, monthYear, assessmentLevel, page = 1, limit = 10, startDate, endDate, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        let dateFilter = '';
        if (startDate)
            dateFilter += `AND kv.createdAt >= '${startDate}'`;
        if (endDate)
            dateFilter += `AND kv.createdAt <= '${endDate}'`;
        let monthFilter = '';
        if (monthYear && monthYear !== 'Unknown') {
            let yearNum = null;
            let monthNumInt = null;
            const dateMatch = monthYear.match(/^(\d{4})-(\d{1,2})/);
            if (dateMatch) {
                yearNum = parseInt(dateMatch[1], 10);
                monthNumInt = parseInt(dateMatch[2], 10);
            }
            else {
                const monthYearPattern = /(\w+)\s+(\d{4})/i;
                const match = monthYear.match(monthYearPattern);
                if (match) {
                    const monthName = match[1];
                    const year = match[2];
                    const monthMap = {
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
                monthFilter = `AND YEAR(kv.createdAt) = ${yearNum} AND MONTH(kv.createdAt) = ${monthNumInt}`;
            }
        }
        let assessmentFilter = '';
        if (assessmentLevel && assessmentLevel !== 'Unknown') {
            const escapedLevel = assessmentLevel.replace(/'/g, "''");
            assessmentFilter = `AND kv.assessment = '${escapedLevel}'`;
        }
        else if (assessmentLevel === 'Unknown') {
            assessmentFilter = "AND (kv.assessment IS NULL OR kv.assessment = '')";
        }
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
    async getKrisByOverdueStatus(user, overdueStatus, page = 1, limit = 10, startDate, endDate, functionId) {
        const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
        const functionFilter = this.userFunctionAccess.buildKriFunctionFilter('k', access, functionId);
        const pageInt = Math.floor(Number(page)) || 1;
        const limitInt = Math.floor(Number(limit)) || 10;
        const offset = Math.floor((pageInt - 1) * limitInt);
        const where = ["k.isDeleted = 0", "k.deletedAt IS NULL"];
        if (startDate)
            where.push(`k.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`k.createdAt <= '${endDate}'`);
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
        }
        else if (overdueStatus === 'Not Overdue') {
            statusFilter = `AND NOT EXISTS (
        SELECT 1
        FROM Actionplans ap
        WHERE ap.kri_id = k.id
          AND ap.deletedAt IS NULL
          AND ap.implementation_date < GETDATE()
          AND (ap.done = 0 OR ap.done IS NULL)
      )`;
        }
        else {
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
};
exports.GrcKrisService = GrcKrisService;
exports.GrcKrisService = GrcKrisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        user_function_access_service_1.UserFunctionAccessService])
], GrcKrisService);
//# sourceMappingURL=grc-kris.service.js.map