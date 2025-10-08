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
            const dateFilter = this.buildDateFilter(timeframe);
            const totalKrisQuery = `
        SELECT COUNT(*) as total
        FROM Kris
        WHERE isDeleted = 0 ${dateFilter}
      `;
            const totalKrisResult = await this.databaseService.query(totalKrisQuery);
            const totalKris = totalKrisResult[0]?.total || 0;
            const krisByStatusQuery = `
        SELECT 
          CASE 
            WHEN preparerStatus = 'sent' THEN 'Pending Preparer'
            WHEN checkerStatus = 'approved' AND reviewerStatus = 'pending' THEN 'Pending Reviewer'
            WHEN checkerStatus = 'approved' AND reviewerStatus = 'sent' AND acceptanceStatus = 'pending' THEN 'Pending Acceptance'
            WHEN checkerStatus = 'approved' AND reviewerStatus = 'sent' AND acceptanceStatus = 'approved' THEN 'Approved'
            ELSE 'Other'
          END as status,
          COUNT(*) as count
        FROM Kris
        WHERE isDeleted = 0 ${dateFilter}
        GROUP BY 
          CASE 
            WHEN preparerStatus = 'sent' THEN 'Pending Preparer'
            WHEN checkerStatus = 'approved' AND reviewerStatus = 'pending' THEN 'Pending Reviewer'
            WHEN checkerStatus = 'approved' AND reviewerStatus = 'sent' AND acceptanceStatus = 'pending' THEN 'Pending Acceptance'
            WHEN checkerStatus = 'approved' AND reviewerStatus = 'sent' AND acceptanceStatus = 'approved' THEN 'Approved'
            ELSE 'Other'
          END
      `;
            const krisByStatus = await this.databaseService.query(krisByStatusQuery);
            const krisByLevelQuery = `
        SELECT 
          kri_level,
          COUNT(*) as count
        FROM Kris
        WHERE isDeleted = 0 ${dateFilter}
        AND kri_level IS NOT NULL
        GROUP BY kri_level
      `;
            const krisByLevel = await this.databaseService.query(krisByLevelQuery);
            const breachedKRIsByDepartmentQuery = `
        SELECT 
          f.name as function_name,
          COUNT(k.id) as breached_count
        FROM Kris k
        LEFT JOIN Functions f ON k.related_function_id = f.id
        WHERE k.isDeleted = 0 ${dateFilter}
        AND k.status = 'Breached'
        GROUP BY f.name
        ORDER BY breached_count DESC
      `;
            const breachedKRIsByDepartment = await this.databaseService.query(breachedKRIsByDepartmentQuery);
            const kriHealthQuery = `
        SELECT TOP 10
          k.kriName,
          k.status,
          k.kri_level,
          f.name as function_name,
          k.threshold,
          k.frequency
        FROM Kris k
        LEFT JOIN Functions f ON k.related_function_id = f.id
        WHERE k.isDeleted = 0 ${dateFilter}
        ORDER BY k.createdAt DESC
      `;
            const kriHealth = await this.databaseService.query(kriHealthQuery);
            const kriAssessmentCountQuery = `
        SELECT 
          f.name as function_name,
          COUNT(k.id) as assessment_count
        FROM Kris k
        LEFT JOIN Functions f ON k.related_function_id = f.id
        WHERE k.isDeleted = 0 ${dateFilter}
        GROUP BY f.name
        ORDER BY assessment_count DESC
      `;
            const kriAssessmentCount = await this.databaseService.query(kriAssessmentCountQuery);
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
            console.error('Error fetching KRIs dashboard data:', error);
            throw error;
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