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

      // Get incidents by status
      const incidentsByStatusQuery = `
        SELECT 
          CASE 
            WHEN preparerStatus = 'sent' THEN 'Pending Preparer'
            WHEN checkerStatus = 'approved' AND reviewerStatus = 'pending' THEN 'Pending Reviewer'
            WHEN checkerStatus = 'approved' AND reviewerStatus = 'sent' AND acceptanceStatus = 'pending' THEN 'Pending Acceptance'
            WHEN checkerStatus = 'approved' AND reviewerStatus = 'sent' AND acceptanceStatus = 'approved' THEN 'Approved'
            ELSE 'Other'
          END as status,
          COUNT(*) as count
        FROM Incidents
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
      const incidentsByStatus = await this.databaseService.query(incidentsByStatusQuery);

      // Get incidents by category
      const incidentsByCategoryQuery = `
        SELECT 
          ic.name as category_name,
          COUNT(i.id) as count
        FROM Incidents i
        LEFT JOIN IncidentCategories ic ON i.category_id = ic.id
        WHERE i.isDeleted = 0 ${dateFilter}
        GROUP BY ic.name
      `;
      const incidentsByCategory = await this.databaseService.query(incidentsByCategoryQuery);

      // Get top financial impacts
      const topFinancialImpactsQuery = `
        SELECT TOP 10
          i.id as incident_id,
          fi.name as financial_impact_name,
          f.name as function_name,
          i.net_loss
        FROM Incidents i
        LEFT JOIN FinancialImpacts fi ON i.financial_impact_id = fi.id
        LEFT JOIN Functions f ON i.function_id = f.id
        WHERE i.isDeleted = 0 ${dateFilter}
        AND i.net_loss IS NOT NULL
        ORDER BY i.net_loss DESC
      `;
      const topFinancialImpacts = await this.databaseService.query(topFinancialImpactsQuery);

      // Get net loss and recovery data
      const netLossAndRecoveryQuery = `
        SELECT TOP 10
          i.title as incident_title,
          i.net_loss,
          i.recovery_amount,
          f.name as function_name
        FROM Incidents i
        LEFT JOIN Functions f ON i.function_id = f.id
        WHERE i.isDeleted = 0 ${dateFilter}
        AND (i.net_loss IS NOT NULL OR i.recovery_amount IS NOT NULL)
        ORDER BY i.net_loss DESC
      `;
      const netLossAndRecovery = await this.databaseService.query(netLossAndRecoveryQuery);

      // Get monthly trend
      const monthlyTrendQuery = `
        SELECT 
          FORMAT(i.occurrence_date, 'MMM yyyy') as month_year,
          COUNT(i.id) as incident_count,
          SUM(ISNULL(i.net_loss, 0)) as total_loss
        FROM Incidents i
        WHERE i.isDeleted = 0 ${dateFilter}
        AND i.occurrence_date IS NOT NULL
        GROUP BY FORMAT(i.occurrence_date, 'MMM yyyy')
        ORDER BY MIN(i.occurrence_date)
      `;
      const monthlyTrend = await this.databaseService.query(monthlyTrendQuery);

      // Calculate status counts
      const pendingPreparer = incidentsByStatus.find(s => s.status === 'Pending Preparer')?.count || 0;
      const pendingChecker = incidentsByStatus.find(s => s.status === 'Pending Checker')?.count || 0;
      const pendingReviewer = incidentsByStatus.find(s => s.status === 'Pending Reviewer')?.count || 0;
      const pendingAcceptance = incidentsByStatus.find(s => s.status === 'Pending Acceptance')?.count || 0;

      // Fetch statusOverview (details list) like controls
      const listQuery = `
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
        WHERE i.isDeleted = 0 ${dateFilter}
        ORDER BY i.createdAt DESC
      `;
      const statusOverview = await this.databaseService.query(listQuery);

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
        incidentsByStatus: incidentsByStatus.map(item => ({
          status: item.status,
          count: item.count
        })),
        topFinancialImpacts: topFinancialImpacts.map(item => ({
          incident_id: item.incident_id,
          financial_impact_name: item.financial_impact_name || 'Unknown',
          function_name: item.function_name || 'Unknown',
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
          incident_count: item.incident_count,
          total_loss: item.total_loss || 0
        })),
        statusOverview,
        overallStatuses: statusOverview
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
    const offset = (page - 1) * limit
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
          WHEN i.reviewerStatus = 'approved' THEN 'approved'
          WHEN i.checkerStatus = 'approved' THEN 'approved'
          ELSE ISNULL(i.preparerStatus, i.acceptanceStatus)
        END as status,
        i.createdAt
      FROM Incidents i
      ${whereSql}
      ORDER BY i.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `
    const data = await this.databaseService.query(dataQuery)

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
    }
  }
}
