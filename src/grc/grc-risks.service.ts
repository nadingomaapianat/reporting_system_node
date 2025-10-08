import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class GrcRisksService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getRisksDashboard(startDate?: string, endDate?: string) {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);
      
      // Get total risks count
      const totalRisksQuery = `
        SELECT COUNT(*) as total
        FROM Risks 
        WHERE isDeleted = 0 ${dateFilter}
      `;
      const totalRisksResult = await this.databaseService.query(totalRisksQuery);
      const totalRisks = totalRisksResult[0]?.total || 0;

      // Get risks by category (using sub_process field)
      const risksByCategoryQuery = `
        SELECT 
          r.sub_process as category,
          COUNT(r.id) as count
        FROM Risks r
        WHERE r.isDeleted = 0 ${dateFilter}
        GROUP BY r.sub_process
      `;
      const risksByCategory = await this.databaseService.query(risksByCategoryQuery);

      // Get risks by event type (using EventTypes table)
      const risksByEventTypeQuery = `
        SELECT 
          et.name as event_type,
          COUNT(r.id) as count
        FROM Risks r
        LEFT JOIN EventTypes et ON r.event = et.id
        WHERE r.isDeleted = 0 ${dateFilter}
        GROUP BY et.name
      `;
      const risksByEventType = await this.databaseService.query(risksByEventTypeQuery);

      // Get inherent vs residual risks
      const inherentVsResidualQuery = `
        SELECT 
          r.id as risk_id,
          r.name as risk_name,
          r.inherent_value,
          r.residual_value,
          r.createdAt as created_at
        FROM Risks r
        WHERE r.isDeleted = 0 ${dateFilter}
        AND r.inherent_value IS NOT NULL 
        AND r.residual_value IS NOT NULL
        ORDER BY r.createdAt DESC
      `;
      const inherentVsResidual = await this.databaseService.query(inherentVsResidualQuery);

      // Calculate risk levels
      const riskLevels = this.calculateRiskLevels(inherentVsResidual);

      // Get risk trends (monthly data)
      const riskTrendsQuery = `
        SELECT 
          FORMAT(r.createdAt, 'MMM') as month,
          MONTH(r.createdAt) as month_num,
          COUNT(r.id) as total_risks,
          SUM(CASE WHEN DATEDIFF(month, r.createdAt, GETDATE()) = 0 THEN 1 ELSE 0 END) as new_risks,
          SUM(CASE WHEN r.residual_value < r.inherent_value THEN 1 ELSE 0 END) as mitigated_risks
        FROM Risks r
        WHERE r.isDeleted = 0 ${dateFilter}
        GROUP BY FORMAT(r.createdAt, 'MMM'), MONTH(r.createdAt)
        ORDER BY MONTH(r.createdAt)
      `;
      const riskTrends = await this.databaseService.query(riskTrendsQuery);

      return {
        totalRisks,
        risksByCategory: risksByCategory.map(item => ({ name: item.category, value: item.count })),
        risksByEventType: risksByEventType.map(item => ({ name: item.event_type, value: item.count })),
        inherentVsResidual: inherentVsResidual.map(item => ({
          ...item,
          inherent_value: parseInt(item.inherent_value) || 0,
          residual_value: parseInt(item.residual_value) || 0,
        })),
        riskLevels,
        riskTrends: riskTrends.map(item => ({
          month: item.month,
          total_risks: item.total_risks,
          new_risks: item.new_risks,
          mitigated_risks: item.mitigated_risks,
        })),
      };
    } catch (error) {
      console.error('Error fetching risks dashboard data:', error);
      throw error;
    }
  }

  async getTotalRisks(page: number, limit: number, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        r.id as risk_id,
        r.name as risk_name,
        et.name as category,
        CASE 
          WHEN CAST(r.inherent_value as INT) > 80 THEN 'High'
          WHEN CAST(r.inherent_value as INT) > 50 THEN 'Medium'
          ELSE 'Low'
        END as level,
        CAST(r.inherent_value as INT) as inherent_value,
        CAST(r.residual_value as INT) as residual_value,
        r.createdAt as created_at
      FROM Risks r
      LEFT JOIN EventTypes et ON r.event = et.id
      WHERE r.isDeleted = 0 ${dateFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Risks r
      WHERE r.isDeleted = 0 ${dateFilter}
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limit]),
      this.databaseService.query(countQuery)
    ]);
    
    return {
      data,
      total: countResult[0]?.total || 0,
      page,
      limit
    };
  }

  async getHighRisks(page: number, limit: number, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        r.id as risk_id,
        r.name as risk_name,
        et.name as category,
        CAST(r.inherent_value as INT) as inherent_value,
        CAST(r.residual_value as INT) as residual_value,
        r.createdAt as created_at
      FROM Risks r
      LEFT JOIN EventTypes et ON r.event = et.id
      WHERE r.isDeleted = 0 ${dateFilter}
      AND CAST(r.inherent_value as INT) > 80
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Risks r
      WHERE r.isDeleted = 0 ${dateFilter}
      AND CAST(r.inherent_value as INT) > 80
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limit]),
      this.databaseService.query(countQuery)
    ]);
    
    return {
      data,
      total: countResult[0]?.total || 0,
      page,
      limit
    };
  }

  async getMediumRisks(page: number, limit: number, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        r.id as risk_id,
        r.name as risk_name,
        et.name as category,
        CAST(r.inherent_value as INT) as inherent_value,
        CAST(r.residual_value as INT) as residual_value,
        r.createdAt as created_at
      FROM Risks r
      LEFT JOIN EventTypes et ON r.event = et.id
      WHERE r.isDeleted = 0 ${dateFilter}
      AND CAST(r.inherent_value as INT) > 50 
      AND CAST(r.inherent_value as INT) <= 80
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Risks r
      WHERE r.isDeleted = 0 ${dateFilter}
      AND CAST(r.inherent_value as INT) > 50 
      AND CAST(r.inherent_value as INT) <= 80
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limit]),
      this.databaseService.query(countQuery)
    ]);
    
    return {
      data,
      total: countResult[0]?.total || 0,
      page,
      limit
    };
  }

  async getLowRisks(page: number, limit: number, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        r.id as risk_id,
        r.name as risk_name,
        et.name as category,
        CAST(r.inherent_value as INT) as inherent_value,
        CAST(r.residual_value as INT) as residual_value,
        r.createdAt as created_at
      FROM Risks r
      LEFT JOIN EventTypes et ON r.event = et.id
      WHERE r.isDeleted = 0 ${dateFilter}
      AND CAST(r.inherent_value as INT) <= 50
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Risks r
      WHERE r.isDeleted = 0 ${dateFilter}
      AND CAST(r.inherent_value as INT) <= 50
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limit]),
      this.databaseService.query(countQuery)
    ]);
    
    return {
      data,
      total: countResult[0]?.total || 0,
      page,
      limit
    };
  }

  async getRiskReduction(page: number, limit: number, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        r.id as risk_id,
        r.name as risk_name,
        CAST(r.inherent_value as INT) as inherent_value,
        CAST(r.residual_value as INT) as residual_value,
        (CAST(r.inherent_value as INT) - CAST(r.residual_value as INT)) as reduction,
        r.createdAt as created_at
      FROM Risks r
      WHERE r.isDeleted = 0 ${dateFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Risks r
      WHERE r.isDeleted = 0 ${dateFilter}
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limit]),
      this.databaseService.query(countQuery)
    ]);
    
    return {
      data,
      total: countResult[0]?.total || 0,
      page,
      limit
    };
  }

  async getNewRisks(page: number, limit: number, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        r.id as risk_id,
        r.name as risk_name,
        r.createdAt as created_at
      FROM Risks r
      WHERE r.isDeleted = 0 ${dateFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Risks r
      WHERE r.isDeleted = 0 ${dateFilter}
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limit]),
      this.databaseService.query(countQuery)
    ]);
    
    return {
      data,
      total: countResult[0]?.total || 0,
      page,
      limit
    };
  }

  async exportRisks(format: 'pdf' | 'excel', startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const query = `
      SELECT 
        r.id,
        r.name as risk_name,
        r.inherent_value,
        r.residual_value,
        (CAST(r.inherent_value as INT) - CAST(r.residual_value as INT)) as reduction,
        r.createdAt as created_at
      FROM Risks r
      WHERE r.isDeleted = 0 ${dateFilter}
      ORDER BY r.createdAt DESC
    `;
    const data = await this.databaseService.query(query);

    if (format === 'excel') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Risks Report');

      worksheet.columns = [
        { header: 'Risk ID', key: 'id', width: 36 },
        { header: 'Risk Name', key: 'risk_name', width: 40 },
        { header: 'Inherent Value', key: 'inherent_value', width: 15 },
        { header: 'Residual Value', key: 'residual_value', width: 15 },
        { header: 'Reduction', key: 'reduction', width: 10 },
        { header: 'Created At', key: 'created_at', width: 20 },
      ];

      worksheet.addRows(data);

      return await workbook.xlsx.writeBuffer();
    } else if (format === 'pdf') {
      // Placeholder for PDF generation
      return Buffer.from('PDF export not yet implemented.');
    }
  }

  private buildDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return '';
    
    let filter = '';
    
    if (startDate) {
      filter += ` AND createdAt >= '${startDate}'`;
    }
    if (endDate) {
      filter += ` AND createdAt <= '${endDate} 23:59:59'`;
    }
    
    return filter;
  }

  private calculateRiskLevels(risks: any[]) {
    const levels = { High: 0, Medium: 0, Low: 0 };
    
    risks.forEach(risk => {
      const inherentValue = parseInt(risk.inherent_value) || 0;
      if (inherentValue > 80) {
        levels.High++;
      } else if (inherentValue > 50) {
        levels.Medium++;
      } else {
        levels.Low++;
      }
    });
    
    return Object.entries(levels).map(([level, count]) => ({ level, count }));
  }
}