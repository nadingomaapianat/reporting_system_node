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
let GrcKrisService = class GrcKrisService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    buildDateFilter(timeframe) {
        if (!timeframe)
            return '';
        const now = new Date();
        let startDate;
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
    async getKrisDashboard(timeframe) {
        try {
            const dateFilter = '';
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
            }
            catch (e) {
                console.error('KRIs total query failed:', e);
            }
            const krisByStatusQuery = `
        SELECT
          CASE 
            WHEN k.preparerStatus IN ('sent','draft') THEN 'Pending Preparer'
            WHEN k.preparerStatus = 'approved' AND (k.checkerStatus IS NULL OR k.checkerStatus <> 'approved') THEN 'Pending Checker'
            WHEN k.checkerStatus = 'approved' AND (k.reviewerStatus IS NULL OR k.reviewerStatus <> 'approved') THEN 'Pending Reviewer'
            WHEN k.reviewerStatus = 'approved' AND (k.acceptanceStatus IS NULL OR k.acceptanceStatus <> 'approved') THEN 'Pending Acceptance'
            WHEN k.acceptanceStatus = 'approved' THEN 'Approved'
            ELSE 'Other'
          END AS status,
          COUNT(*) AS count
        FROM Kris k
        WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
        GROUP BY
          CASE 
            WHEN k.preparerStatus IN ('sent','draft') THEN 'Pending Preparer'
            WHEN k.preparerStatus = 'approved' AND (k.checkerStatus IS NULL OR k.checkerStatus <> 'approved') THEN 'Pending Checker'
            WHEN k.checkerStatus = 'approved' AND (k.reviewerStatus IS NULL OR k.reviewerStatus <> 'approved') THEN 'Pending Reviewer'
            WHEN k.reviewerStatus = 'approved' AND (k.acceptanceStatus IS NULL OR k.acceptanceStatus <> 'approved') THEN 'Pending Acceptance'
            WHEN k.acceptanceStatus = 'approved' THEN 'Approved'
            ELSE 'Other'
          END
      `;
            let krisByStatus = [];
            try {
                krisByStatus = await this.databaseService.query(krisByStatusQuery);
            }
            catch (e) {
                console.error('KRIs by status query failed:', e);
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
            let krisByLevel = [];
            try {
                krisByLevel = await this.databaseService.query(krisByLevelQuery);
            }
            catch (e) {
                console.error('KRIs by level query failed:', e);
            }
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
            let breachedKRIsByDepartment = [];
            try {
                breachedKRIsByDepartment = await this.databaseService.query(breachedKRIsByDepartmentQuery);
            }
            catch (e) {
                console.error('Breached KRIs by department query failed:', e);
            }
            const kriHealthQuery = `
        SELECT TOP 50
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
            let kriHealth = [];
            try {
                kriHealth = await this.databaseService.query(kriHealthQuery);
            }
            catch (e) {
                console.error('KRI health query failed:', e);
            }
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
            let kriAssessmentCount = [];
            try {
                kriAssessmentCount = await this.databaseService.query(kriAssessmentCountQuery);
            }
            catch (e) {
                console.error('KRI assessment count query failed:', e);
            }
            const pendingPreparer = krisByStatus.find(s => s.status === 'Pending Preparer')?.count || 0;
            const pendingChecker = krisByStatus.find(s => s.status === 'Pending Checker')?.count || 0;
            const pendingReviewer = krisByStatus.find(s => s.status === 'Pending Reviewer')?.count || 0;
            const pendingAcceptance = krisByStatus.find(s => s.status === 'Pending Acceptance')?.count || 0;
            const approved = krisByStatus.find(s => s.status === 'Approved')?.count || 0;
            return {
                totalKris,
                pendingPreparer,
                pendingChecker,
                pendingReviewer,
                pendingAcceptance,
                approved,
                krisByStatus: krisByStatus.map(item => ({
                    status: item.status,
                    count: item.count
                })),
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
    async exportKris(format, timeframe) {
        return {
            message: `Exporting KRIs data in ${format} format`,
            timeframe: timeframe || 'all',
            status: 'success'
        };
    }
};
exports.GrcKrisService = GrcKrisService;
exports.GrcKrisService = GrcKrisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], GrcKrisService);
//# sourceMappingURL=grc-kris.service.js.map