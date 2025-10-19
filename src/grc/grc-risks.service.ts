import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BaseDashboardService, DashboardConfig } from '../shared/base-dashboard.service';
import { DashboardConfigService } from '../shared/dashboard-config.service';

@Injectable()
export class GrcRisksService extends BaseDashboardService {
  constructor(protected readonly databaseService: DatabaseService) {
    super(databaseService);
  }

  getConfig(): DashboardConfig {
    return DashboardConfigService.getRisksConfig();
  }

  async getRisksDashboard(startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    try {
      // Total risks
      const totalRisksQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Risks] r
        WHERE r.isDeleted = 0 ${dateFilter}
      `;
      const totalRisksResult = await this.databaseService.query(totalRisksQuery);
      const totalRisks = totalRisksResult[0]?.total || 0;

      // All risks data for exports (code, title, inherent_value, created_at)
      // Note: For total risks export, we want ALL risks regardless of date filter
      const allRisksQuery = `
        SELECT 
          r.code as code,
          r.name as title,
          r.inherent_value as inherent_value,
          r.createdAt as created_at
        FROM dbo.[Risks] r
        WHERE r.isDeleted = 0 
        ORDER BY r.createdAt DESC
      `;
      const allRisks = await this.databaseService.query(allRisksQuery);
      console.log(`=== ALL RISKS QUERY DEBUG ===`);
      console.log(`Query: ${allRisksQuery}`);
      console.log(`Date filter: ${dateFilter}`);
      console.log(`Found ${allRisks.length} total risks`);
      if (allRisks.length > 0) {
        console.log(`Sample risk:`, allRisks[0]);
      } else {
        console.log(`No risks found! This might be a database connection issue.`);
        // Let's test a simple count query
        const testQuery = `SELECT COUNT(*) as total FROM dbo.[Risks] WHERE isDeleted = 0`;
        const testResult = await this.databaseService.query(testQuery);
        console.log(`Test count query result:`, testResult);
      }

      // Risks by category via EventTypes (fallback to 'Unknown' for null)
      const risksByEventTypeQuery = `
        SELECT 
          ISNULL(et.name, 'Unknown') as name,
          COUNT(r.id) as value
        FROM dbo.[Risks] r
        LEFT JOIN dbo.[EventTypes] et ON r.event = et.id
        WHERE r.isDeleted = 0 ${dateFilter}
        GROUP BY et.name
      `;
      const risksByEventType = await this.databaseService.query(risksByEventTypeQuery);

      // Risks by category using RiskCategories table
      const risksByCategoryQuery = `
        SELECT 
          ISNULL(c.name, 'Uncategorized') as name,
          COUNT(r.id) as value
        FROM dbo.[Risks] r
        LEFT JOIN dbo.RiskCategories rc ON r.id = rc.risk_id AND rc.isDeleted = 0
        LEFT JOIN dbo.Categories c ON rc.category_id = c.id AND c.isDeleted = 0
        WHERE r.isDeleted = 0 ${dateFilter}
        GROUP BY c.name
        ORDER BY value DESC
      `;
      const risksByCategory = await this.databaseService.query(risksByCategoryQuery);

      // Inherent vs Residual details using Residualrisks table with current quarter/year
      const inherentVsResidualQuery = `
        SELECT 
          r.id as risk_id,
          r.code as risk_code,
          r.name as risk_name,
          r.inherent_value as inherent_level,
          rr.residual_value as residual_level,
          CASE WHEN r.inherent_value = 'High' THEN 3 
               WHEN r.inherent_value = 'Medium' THEN 2 
               WHEN r.inherent_value = 'Low' THEN 1 
               ELSE 0 END as inherent_value,
          CASE WHEN rr.residual_value = 'High' THEN 3 
               WHEN rr.residual_value = 'Medium' THEN 2 
               WHEN rr.residual_value = 'Low' THEN 1 
               ELSE 0 END as residual_value,
          ((CASE WHEN r.inherent_value = 'High' THEN 3 
                 WHEN r.inherent_value = 'Medium' THEN 2 
                 WHEN r.inherent_value = 'Low' THEN 1 
                 ELSE 0 END)
           - (CASE WHEN rr.residual_value = 'High' THEN 3 
                   WHEN rr.residual_value = 'Medium' THEN 2 
                   WHEN rr.residual_value = 'Low' THEN 1 
                   ELSE 0 END)) as reduction_amount,
          rr.createdAt as created_at,
          rr.quarter,
          rr.year
        FROM dbo.[Risks] r
        INNER JOIN dbo.[Residualrisks] rr ON r.id = rr.riskId
        WHERE r.isDeleted = 0 
          AND rr.isDeleted = 0
          AND rr.quarter = CASE 
            WHEN MONTH(GETDATE()) BETWEEN 1 AND 3 THEN 'quarterOne'
            WHEN MONTH(GETDATE()) BETWEEN 4 AND 6 THEN 'quarterTwo'
            WHEN MONTH(GETDATE()) BETWEEN 7 AND 9 THEN 'quarterThree'
            WHEN MONTH(GETDATE()) BETWEEN 10 AND 12 THEN 'quarterFour'
          END
          AND rr.year = YEAR(GETDATE())
        AND r.inherent_value IS NOT NULL 
          AND rr.residual_value IS NOT NULL
        ORDER BY reduction_amount DESC, r.createdAt DESC
      `;
      const inherentVsResidual = await this.databaseService.query(inherentVsResidualQuery);

      // Risk levels from inherent value
      const levelsAggQuery = `
        SELECT
          SUM(CASE WHEN r.inherent_value = 'High' THEN 1 ELSE 0 END) as High,
          SUM(CASE WHEN r.inherent_value = 'Medium' THEN 1 ELSE 0 END) as Medium,
          SUM(CASE WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END) as Low
        FROM dbo.[Risks] r
        WHERE r.isDeleted = 0 ${dateFilter}
      `;
      const levelsAgg = await this.databaseService.query(levelsAggQuery);
      const riskLevels = [
        { level: 'High', count: levelsAgg[0]?.High || 0 },
        { level: 'Medium', count: levelsAgg[0]?.Medium || 0 },
        { level: 'Low', count: levelsAgg[0]?.Low || 0 },
      ];

      // Get risk reduction count using Residualrisks table with current quarter/year
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      const currentQuarter = Math.ceil(currentMonth / 3); // 1-4
      const quarterNames = ['quarterOne', 'quarterTwo', 'quarterThree', 'quarterFour'];
      const currentQuarterName = quarterNames[currentQuarter - 1];

      // Build date filter for Residualrisks table
      let residualDateFilter = `AND rr.quarter = '${currentQuarterName}' AND rr.year = ${currentYear}`;
      if (startDate && endDate) {
        // If date filters provided, use them to filter Residualrisks by createdAt
        residualDateFilter = `AND rr.createdAt >= '${startDate}' AND rr.createdAt <= '${endDate} 23:59:59'`;
      }

      const riskReductionCountQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Risks] r
        INNER JOIN dbo.[Residualrisks] rr ON r.id = rr.riskId
        WHERE r.isDeleted = 0 
          AND rr.isDeleted = 0
          ${residualDateFilter}
          AND (
            (CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END)
            - (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END)
          ) > 0
      `;
      const riskReductionCountResult = await this.databaseService.query(riskReductionCountQuery);
      const riskReductionCount = riskReductionCountResult[0]?.total || 0;

      // Trends per month using Residualrisks table
      const riskTrendsQuery = `
        SELECT 
          FORMAT(rr.createdAt, 'MMM') as month,
          MONTH(rr.createdAt) as month_num,
          COUNT(r.id) as total_risks,
          SUM(CASE WHEN DATEDIFF(month, r.createdAt, SYSDATETIMEOFFSET()) = 0 THEN 1 ELSE 0 END) as new_risks,
          SUM(CASE WHEN 
            (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END)
            < (CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END)
          THEN 1 ELSE 0 END) as mitigated_risks
        FROM dbo.[Risks] r
        INNER JOIN dbo.[Residualrisks] rr ON r.id = rr.riskId
        WHERE r.isDeleted = 0 
          AND rr.isDeleted = 0
          ${dateFilter.replace('r.createdAt', 'rr.createdAt')}
        GROUP BY FORMAT(rr.createdAt, 'MMM'), MONTH(rr.createdAt)
        ORDER BY MONTH(rr.createdAt)
      `;
      const riskTrends = await this.databaseService.query(riskTrendsQuery);

      // New risks this month
      const newRisksQuery = `
        SELECT 
          r.code as code,
          r.name as title,
          r.inherent_value,
          r.createdAt as created_at
        FROM dbo.[Risks] r
        WHERE r.isDeleted = 0 AND DATEDIFF(month, r.createdAt, GETDATE()) = 0 ${dateFilter}
        ORDER BY r.createdAt DESC
      `;
      const newRisks = await this.databaseService.query(newRisksQuery);

      return {
        totalRisks,
        allRisks,
        risksByCategory,
        risksByEventType,
        inherentVsResidual,
        riskLevels,
        riskReductionCount,
        riskTrends,
        newRisks
      };
    } catch (error) {
      console.error('Error fetching risks dashboard data:', error);
      throw error;
    }
  }

  async getTotalRisks(page: number, limit: number, startDate?: string, endDate?: string) {
    return this.getCardData('total', page, limit, startDate, endDate);
  }

  // Override card data to use risk-specific SQL for certain card types
  async getCardData(cardType: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    // Normalize hyphenated card types from frontend (e.g., 'new-risks')
    if (cardType === 'new-risks') {
      cardType = 'newRisks';
    }
    const dateFilter = this.buildDateFilter(startDate, endDate, 'createdAt');
    const offset = (page - 1) * limit;
    
    let dataQuery: string | null = null;
    let countQuery: string | null = null;

    switch (cardType) {
      case 'total': {
        dataQuery = `
      SELECT 
            r.code as code,
        r.name as risk_name,
            CASE WHEN r.inherent_value IN ('High','Medium','Low') THEN r.inherent_value ELSE NULL END as inherent_level,
            CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
        r.createdAt as created_at
          FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter}
      ORDER BY r.createdAt DESC
          OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`;
        countQuery = `SELECT COUNT(*) as total FROM dbo.[Risks] r WHERE r.isDeleted = 0 ${dateFilter}`;
        break;
      }
      case 'high': {
        dataQuery = `
          SELECT 
            r.code as code,
            r.name as risk_name,
            'High' as inherent_level,
            CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
            r.createdAt as created_at
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0 ${dateFilter} AND r.inherent_value = 'High'
          ORDER BY r.createdAt DESC
          OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`;
        countQuery = `SELECT COUNT(*) as total FROM dbo.[Risks] r WHERE r.isDeleted = 0 ${dateFilter} AND r.inherent_value = 'High'`;
        break;
      }
      case 'medium': {
        dataQuery = `
          SELECT 
            r.code as code,
            r.name as risk_name,
            'Medium' as inherent_level,
            CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
            r.createdAt as created_at
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0 ${dateFilter} AND r.inherent_value = 'Medium'
          ORDER BY r.createdAt DESC
          OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`;
        countQuery = `SELECT COUNT(*) as total FROM dbo.[Risks] r WHERE r.isDeleted = 0 ${dateFilter} AND r.inherent_value = 'Medium'`;
        break;
      }
      case 'low': {
        dataQuery = `
          SELECT 
            r.code as code,
            r.name as risk_name,
            'Low' as inherent_level,
            CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
            r.createdAt as created_at
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0 ${dateFilter} AND r.inherent_value = 'Low'
          ORDER BY r.createdAt DESC
          OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`;
        countQuery = `SELECT COUNT(*) as total FROM dbo.[Risks] r WHERE r.isDeleted = 0 ${dateFilter} AND r.inherent_value = 'Low'`;
        break;
      }
      case 'reduction': {
        // Calculate current quarter and year for Residualrisks table
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentQuarter = Math.ceil(currentMonth / 3);
        const quarterNames = ['quarterOne', 'quarterTwo', 'quarterThree', 'quarterFour'];
        const currentQuarterName = quarterNames[currentQuarter - 1];

        // Build date filter for Residualrisks table
        let residualDateFilter = `AND rr.quarter = '${currentQuarterName}' AND rr.year = ${currentYear}`;
        if (startDate && endDate) {
          residualDateFilter = `AND rr.createdAt >= '${startDate}' AND rr.createdAt <= '${endDate} 23:59:59'`;
        }

        dataQuery = `
          SELECT 
            r.code as code,
            r.name as risk_name,
            CASE WHEN r.inherent_value IN ('High','Medium','Low') THEN r.inherent_value ELSE NULL END as inherent_level,
            CASE WHEN rr.residual_value IN ('High','Medium','Low') THEN rr.residual_value ELSE NULL END as residual_level,
            ((CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END)
             - (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END)) as reduction,
            rr.createdAt as created_at
          FROM dbo.[Risks] r
          INNER JOIN dbo.[Residualrisks] rr ON r.id = rr.riskId
          WHERE r.isDeleted = 0 
            AND rr.isDeleted = 0
            ${residualDateFilter}
            AND (
              (CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END)
              - (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END)
            ) > 0
          ORDER BY reduction DESC
          OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`;
        countQuery = `SELECT COUNT(*) as total 
          FROM dbo.[Risks] r
          INNER JOIN dbo.[Residualrisks] rr ON r.id = rr.riskId
          WHERE r.isDeleted = 0 
            AND rr.isDeleted = 0
            ${residualDateFilter}
            AND (
              (CASE WHEN r.inherent_value = 'High' THEN 3 WHEN r.inherent_value = 'Medium' THEN 2 WHEN r.inherent_value = 'Low' THEN 1 ELSE 0 END)
              - (CASE WHEN rr.residual_value = 'High' THEN 3 WHEN rr.residual_value = 'Medium' THEN 2 WHEN rr.residual_value = 'Low' THEN 1 ELSE 0 END)
            ) > 0`;
        break;
      }
      case 'newRisks': {
        dataQuery = `
          SELECT 
            r.code as code,
            r.name as risk_name,
            r.createdAt as created_at
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0 AND DATEDIFF(month, r.createdAt, GETDATE()) = 0 ${dateFilter}
          ORDER BY r.createdAt DESC
          OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY`;
        countQuery = `SELECT COUNT(*) as total FROM dbo.[Risks] r WHERE r.isDeleted = 0 AND DATEDIFF(month, r.createdAt, GETDATE()) = 0 ${dateFilter}`;
        break;
      }
      default: {
        // Fallback to base behavior for unknown cards
        return super.getCardData(cardType, page, limit, startDate, endDate);
      }
    }

    const [data, count] = await Promise.all([
      this.databaseService.query(dataQuery!, [offset, limit]),
      this.databaseService.query(countQuery!)
    ]);

    const total = count[0]?.total || count[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
      page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
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