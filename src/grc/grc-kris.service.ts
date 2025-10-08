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
      const dateFilter = this.buildDateFilter(timeframe);

      // Get total KRIs
      const totalKrisQuery = `
        SELECT COUNT(*) as total
        FROM Kris
        WHERE isDeleted = 0 ${dateFilter}
      `;
      const totalKrisResult = await this.databaseService.query(totalKrisQuery);
      const totalKris = totalKrisResult[0]?.total || 0;

      // Get KRIs by status
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

      // Get KRIs by level
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

      // Get breached KRIs by department
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

      // Get KRI health status
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

      // Get KRI assessment count by department
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

      // Calculate status counts
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
    } catch (error) {
      console.error('Error fetching KRIs dashboard data:', error);
      throw error;
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
