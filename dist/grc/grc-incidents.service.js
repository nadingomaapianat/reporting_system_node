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
exports.GrcIncidentsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let GrcIncidentsService = class GrcIncidentsService {
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
    async getIncidentsDashboard(timeframe) {
        try {
            const dateFilter = this.buildDateFilter(timeframe);
            const totalIncidentsQuery = `
        SELECT COUNT(*) as total
        FROM Incidents
        WHERE isDeleted = 0 ${dateFilter}
      `;
            const totalIncidentsResult = await this.databaseService.query(totalIncidentsQuery);
            const totalIncidents = totalIncidentsResult[0]?.total || 0;
            const incidentsStatusCountsQuery = `
        SELECT 
          SUM(CASE WHEN ISNULL(preparerStatus, '') <> 'sent' THEN 1 ELSE 0 END) AS pendingPreparer,
          SUM(CASE WHEN ISNULL(preparerStatus, '') = 'sent' AND ISNULL(checkerStatus, '') <> 'approved' THEN 1 ELSE 0 END) AS pendingChecker,
          SUM(CASE WHEN ISNULL(checkerStatus, '') = 'approved' AND ISNULL(reviewerStatus, '') <> 'approved' THEN 1 ELSE 0 END) AS pendingReviewer,
          SUM(CASE WHEN ISNULL(reviewerStatus, '') = 'approved' AND ISNULL(acceptanceStatus, '') <> 'approved' THEN 1 ELSE 0 END) AS pendingAcceptance,
          SUM(CASE WHEN ISNULL(acceptanceStatus, '') = 'approved' THEN 1 ELSE 0 END) AS approved
        FROM Incidents
        WHERE isDeleted = 0 AND deletedAt IS NULL ${dateFilter}
      `;
            const [statusCountsRow] = await this.databaseService.query(incidentsStatusCountsQuery);
            const incidentsByStatusDistributionQuery = `
        WITH IncidentStatus AS (
          SELECT 
            i.id,
            CASE 
              WHEN ISNULL(i.preparerStatus, '') <> 'sent' THEN 'Pending Preparer'
              WHEN ISNULL(i.preparerStatus, '') = 'sent' AND ISNULL(i.checkerStatus, '') <> 'approved' THEN 'Pending Checker'
              WHEN ISNULL(i.checkerStatus, '') = 'approved' AND ISNULL(i.reviewerStatus, '') <> 'approved' THEN 'Pending Reviewer'
              WHEN ISNULL(i.reviewerStatus, '') = 'approved' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Acceptance'
              WHEN ISNULL(i.acceptanceStatus, '') = 'approved' THEN 'Approved'
              ELSE 'Other'
            END AS status
          FROM Incidents i
          WHERE i.isDeleted = 0 AND i.deletedAt IS NULL ${dateFilter}
        )
        SELECT 
          status as status_name,
          COUNT(*) as count
        FROM IncidentStatus
        GROUP BY status
        ORDER BY count DESC
      `;
            const incidentsByStatusDistribution = await this.databaseService.query(incidentsByStatusDistributionQuery);
            const incidentsByCategoryQuery = `
        SELECT 
          ISNULL(ic.name, 'Unknown') as category_name,
          COUNT(i.id) as count
        FROM Incidents i
        LEFT JOIN IncidentCategories ic ON i.category_id = ic.id
          
          AND ic.deletedAt IS NULL
        WHERE i.isDeleted = 0 
          AND i.deletedAt IS NULL
          ${dateFilter}
        GROUP BY ISNULL(ic.name, 'Unknown')
        ORDER BY COUNT(i.id) DESC
      `;
            const incidentsByCategory = await this.databaseService.query(incidentsByCategoryQuery);
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
            const pendingPreparer = statusCountsRow?.pendingPreparer || 0;
            const pendingChecker = statusCountsRow?.pendingChecker || 0;
            const pendingReviewer = statusCountsRow?.pendingReviewer || 0;
            const pendingAcceptance = statusCountsRow?.pendingAcceptance || 0;
            const listQuery = `
        SELECT 
          i.code,
          i.title,
          CASE 
            WHEN ISNULL(i.preparerStatus, '') <> 'sent' THEN 'Pending Preparer'
            WHEN ISNULL(i.preparerStatus, '') = 'sent' AND ISNULL(i.checkerStatus, '') <> 'approved' THEN 'Pending Checker'
            WHEN ISNULL(i.checkerStatus, '') = 'approved' AND ISNULL(i.reviewerStatus, '') <> 'approved' THEN 'Pending Reviewer'
            WHEN ISNULL(i.reviewerStatus, '') = 'approved' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Acceptance'
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
            WHEN ISNULL(i.preparerStatus, '') = 'sent' AND ISNULL(i.checkerStatus, '') <> 'approved' THEN 'Pending Checker'
            WHEN ISNULL(i.checkerStatus, '') = 'approved' AND ISNULL(i.reviewerStatus, '') <> 'approved' THEN 'Pending Reviewer'
            WHEN ISNULL(i.reviewerStatus, '') = 'approved' AND ISNULL(i.acceptanceStatus, '') <> 'approved' THEN 'Pending Acceptance'
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
                }))
            };
        }
        catch (error) {
            console.error('Error fetching incidents dashboard data:', error);
            throw error;
        }
    }
    async exportIncidents(format, timeframe) {
        return {
            message: `Exporting incidents data in ${format} format`,
            timeframe: timeframe || 'all',
            status: 'success'
        };
    }
    async getTotalIncidents(page = 1, limit = 10, startDate, endDate) {
        const offset = (page - 1) * limit;
        const where = ["i.isDeleted = 0"];
        if (startDate)
            where.push(`i.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`i.createdAt <= '${endDate}'`);
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`;
        const totalRes = await this.databaseService.query(countQuery);
        const total = totalRes?.[0]?.total || 0;
        const dataQuery = `
      SELECT 
        i.code,
        i.title,
        CASE 
          WHEN i.acceptanceStatus = 'approved' THEN 'approved'
          WHEN i.reviewerStatus = 'approved' THEN 'approved'
          WHEN i.checkerStatus = 'approved' THEN 'approved'
          ELSE ISNULL(i.preparerStatus, i.acceptanceStatus)
        END as status,
        i.createdAt
      FROM Incidents i
      ${whereSql}
      ORDER BY i.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
        const data = await this.databaseService.query(dataQuery);
        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: offset + limit < total,
                hasPrev: page > 1
            }
        };
    }
    async getPendingPreparerIncidents(page = 1, limit = 10, startDate, endDate) {
        const offset = (page - 1) * limit;
        const where = ["i.isDeleted = 0", "i.deletedAt IS NULL", "ISNULL(i.preparerStatus, '') <> 'sent'"];
        if (startDate)
            where.push(`i.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`i.createdAt <= '${endDate}'`);
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`;
        const totalRes = await this.databaseService.query(countQuery);
        const total = totalRes?.[0]?.total || 0;
        const dataQuery = `
      SELECT 
        i.code,
        i.title,
        'Pending Preparer' as status,
        i.createdAt
      FROM Incidents i
      ${whereSql}
      ORDER BY i.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
        const data = await this.databaseService.query(dataQuery);
        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: offset + limit < total,
                hasPrev: page > 1
            }
        };
    }
    async getPendingCheckerIncidents(page = 1, limit = 10, startDate, endDate) {
        const offset = (page - 1) * limit;
        const where = [
            "i.isDeleted = 0",
            "i.deletedAt IS NULL",
            "ISNULL(i.preparerStatus, '') = 'sent'",
            "ISNULL(i.checkerStatus, '') <> 'approved'"
        ];
        if (startDate)
            where.push(`i.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`i.createdAt <= '${endDate}'`);
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`;
        const totalRes = await this.databaseService.query(countQuery);
        const total = totalRes?.[0]?.total || 0;
        const dataQuery = `
      SELECT 
        i.code,
        i.title,
        'Pending Checker' as status,
        i.createdAt
      FROM Incidents i
      ${whereSql}
      ORDER BY i.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
        const data = await this.databaseService.query(dataQuery);
        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: offset + limit < total,
                hasPrev: page > 1
            }
        };
    }
    async getPendingReviewerIncidents(page = 1, limit = 10, startDate, endDate) {
        const offset = (page - 1) * limit;
        const where = [
            "i.isDeleted = 0",
            "i.deletedAt IS NULL",
            "ISNULL(i.checkerStatus, '') = 'approved'",
            "ISNULL(i.reviewerStatus, '') <> 'approved'"
        ];
        if (startDate)
            where.push(`i.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`i.createdAt <= '${endDate}'`);
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`;
        const totalRes = await this.databaseService.query(countQuery);
        const total = totalRes?.[0]?.total || 0;
        const dataQuery = `
      SELECT 
        i.code,
        i.title,
        'Pending Reviewer' as status,
        i.createdAt
      FROM Incidents i
      ${whereSql}
      ORDER BY i.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
        const data = await this.databaseService.query(dataQuery);
        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: offset + limit < total,
                hasPrev: page > 1
            }
        };
    }
    async getPendingAcceptanceIncidents(page = 1, limit = 10, startDate, endDate) {
        const offset = (page - 1) * limit;
        const where = [
            "i.isDeleted = 0",
            "i.deletedAt IS NULL",
            "ISNULL(i.reviewerStatus, '') = 'approved'",
            "ISNULL(i.acceptanceStatus, '') <> 'approved'"
        ];
        if (startDate)
            where.push(`i.createdAt >= '${startDate}'`);
        if (endDate)
            where.push(`i.createdAt <= '${endDate}'`);
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const countQuery = `SELECT COUNT(*) as total FROM Incidents i ${whereSql}`;
        const totalRes = await this.databaseService.query(countQuery);
        const total = totalRes?.[0]?.total || 0;
        const dataQuery = `
      SELECT 
        i.code,
        i.title,
        'Pending Acceptance' as status,
        i.createdAt
      FROM Incidents i
      ${whereSql}
      ORDER BY i.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
        const data = await this.databaseService.query(dataQuery);
        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: offset + limit < total,
                hasPrev: page > 1
            }
        };
    }
};
exports.GrcIncidentsService = GrcIncidentsService;
exports.GrcIncidentsService = GrcIncidentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], GrcIncidentsService);
//# sourceMappingURL=grc-incidents.service.js.map