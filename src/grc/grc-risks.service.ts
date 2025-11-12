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

      // All risks data with basic information (minimal query)
      // Note: For total risks export, we want ALL risks regardless of date filter
      const allRisksQuery = `
        SELECT
          r.name AS [RiskName], 
          r.description AS [RiskDesc], 
          'Event' AS [RiskEventName], 
          r.approve AS [RiskApprove], 
          r.inherent_value AS [InherentValue], 
          r.inherent_frequency AS [InherentFrequency], 
          r.inherent_financial_value AS [InherentFinancialValue]
        FROM dbo.[Risks] r 
        WHERE r.isDeleted = 0 
        ORDER BY r.createdAt DESC
      `;
      let allRisks = [];
      try {
        allRisks = await this.databaseService.query(allRisksQuery);
        console.log(`=== ALL RISKS QUERY DEBUG ===`);
        console.log(`Found ${allRisks.length} total risks`);
      } catch (error) {
        console.error('Error fetching allRisks:', error);
        allRisks = [];
      }
      
      if (allRisks.length === 0) {
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

      // Additional queries for comprehensive dashboard
      
      // Risk Approval Status Distribution (simplified working version)
      const riskApprovalStatusDistributionQuery = `
        SELECT 
          CASE 
            WHEN rr.preparerResidualStatus = 'sent' AND rr.acceptanceResidualStatus = 'approved' THEN 'Approved'
            ELSE 'Not Approved'
          END AS approve,
          COUNT(DISTINCT r.id) AS count
        FROM dbo.[Risks] r
        INNER JOIN dbo.[ResidualRisks] rr ON r.id = rr.riskId AND rr.isDeleted = 0
        WHERE r.isDeleted = 0 ${dateFilter}
        GROUP BY 
          CASE 
            WHEN rr.preparerResidualStatus = 'sent' AND rr.acceptanceResidualStatus = 'approved' THEN 'Approved'
            ELSE 'Not Approved'
          END
        ORDER BY approve ASC
      `;
      const riskApprovalStatusDistribution = await this.databaseService.query(riskApprovalStatusDistributionQuery);

      // Risk Distribution by Financial Impact Level (simple query)
      const riskDistributionByFinancialImpactQuery = `
        SELECT 
          CASE 
            WHEN r.inherent_financial_value <= 2 THEN 'Low' 
            WHEN r.inherent_financial_value = 3 THEN 'Medium' 
            WHEN r.inherent_financial_value >= 4 THEN 'High' 
            ELSE 'Unknown' 
          END AS [Financial Status],
          COUNT(*) AS count
        FROM dbo.[Risks] r
        WHERE r.isDeleted = 0 ${dateFilter}
        GROUP BY 
          CASE 
            WHEN r.inherent_financial_value <= 2 THEN 'Low' 
            WHEN r.inherent_financial_value = 3 THEN 'Medium' 
            WHEN r.inherent_financial_value >= 4 THEN 'High' 
            ELSE 'Unknown' 
          END
        ORDER BY [Financial Status] ASC
      `;
      const riskDistributionByFinancialImpact = await this.databaseService.query(riskDistributionByFinancialImpactQuery);

      // Quarterly Risk Creation Trends (simple query)
      const quarterlyRiskCreationTrendsQuery = `
        SELECT 
          creation_quarter AS creation_quarter, 
          SUM(risk_count) AS [SUM(risk_count)] 
        FROM ( 
          SELECT 
            CONCAT(YEAR(r.createdAt), '-Q', DATEPART(QUARTER, r.createdAt)) AS creation_quarter, 
            COUNT(r.id) AS risk_count 
          FROM dbo.[Risks] r 
          WHERE r.isDeleted = 0 ${dateFilter}
          GROUP BY YEAR(r.createdAt), DATEPART(QUARTER, r.createdAt) 
        ) AS virtual_table 
        GROUP BY creation_quarter 
        ORDER BY creation_quarter
      `;
      const quarterlyRiskCreationTrends = await this.databaseService.query(quarterlyRiskCreationTrendsQuery);

      // Created & Deleted Risks Per Quarter (grouped by quarter for multi-bar chart)
      const createdDeletedRisksPerQuarterQuery = `
        WITH AllQuarters AS (
          SELECT 1 AS quarter_num, 'Q1 2025' AS quarter_label, CAST('2025-01-01' AS datetime2) AS quarter_start
          UNION ALL SELECT 2, 'Q2 2025', CAST('2025-04-01' AS datetime2)
          UNION ALL SELECT 3, 'Q3 2025', CAST('2025-07-01' AS datetime2)
          UNION ALL SELECT 4, 'Q4 2025', CAST('2025-10-01' AS datetime2)
        ),
        QuarterData AS (
          SELECT 
            DATEPART(quarter, r.createdAt) AS quarter_num,
            'Q' + CAST(DATEPART(quarter, r.createdAt) AS VARCHAR(1)) + ' 2025' AS quarter_label,
            ISNULL(SUM(CASE WHEN r.isDeleted = 0 AND (r.deletedAt IS NULL OR r.deletedAt = '') THEN 1 ELSE 0 END), 0) AS created,
            ISNULL(SUM(CASE WHEN r.isDeleted = 1 OR (r.deletedAt IS NOT NULL AND r.deletedAt != '') THEN 1 ELSE 0 END), 0) AS deleted
          FROM dbo.[Risks] r
          WHERE YEAR(r.createdAt) = YEAR(GETDATE()) ${dateFilter}
          GROUP BY DATEPART(quarter, r.createdAt), 
                   'Q' + CAST(DATEPART(quarter, r.createdAt) AS VARCHAR(1)) + ' 2025'
        )
        SELECT 
          q.quarter_label AS name,
          CAST(ISNULL(qd.created, 0) AS INT) AS created,
          CAST(ISNULL(qd.deleted, 0) AS INT) AS deleted
        FROM AllQuarters q
        LEFT JOIN QuarterData qd ON q.quarter_num = qd.quarter_num
        ORDER BY q.quarter_num ASC
      `;
      const createdDeletedRisksPerQuarter = await this.databaseService.query(createdDeletedRisksPerQuarterQuery);

      // Total Number of Risks per Function (simple count)
      const risksPerDepartmentQuery = `
        SELECT
          f.name AS [Functions__name], 
          COUNT(*) AS [count] 
        FROM dbo.[Risks] r
        LEFT JOIN dbo.[RiskFunctions] rf ON r.id = rf.risk_id
        LEFT JOIN dbo.[Functions] f ON rf.function_id = f.id
        WHERE r.isDeleted = 0 ${dateFilter}
        GROUP BY f.name
        ORDER BY [count] DESC, f.name ASC
      `;
      const risksPerDepartment = await this.databaseService.query(risksPerDepartmentQuery);

      // Try to add more complex queries
      let risksPerBusinessProcess = [];
      let inherentResidualRiskComparison = [];
      let highResidualRiskOverview = [];
      let risksAndControlsCount = [];
      let controlsAndRiskCount = [];
      let risksDetails = [];

      try {
        // Number of Risks per Business Process
        const risksPerBusinessProcessQuery = `
          SELECT
            p.name AS process_name, 
            COUNT(rp.risk_id) AS risk_count 
          FROM dbo.[RiskProcesses] rp 
          JOIN dbo.[Processes] p ON rp.process_id = p.id 
          JOIN dbo.[Risks] r ON rp.risk_id = r.id
          WHERE r.isDeleted = 0 ${dateFilter}
          GROUP BY p.name 
          ORDER BY risk_count DESC, p.name ASC
        `;
        risksPerBusinessProcess = await this.databaseService.query(risksPerBusinessProcessQuery);
      } catch (error) {
        console.log('RiskProcesses table not found, using empty array');
      }

      try {
        // Inherent Risk & Residual Risk Comparison
        const inherentResidualRiskComparisonQuery = `
          SELECT 
            r.name AS [Risk Name], 
            f.name AS [Department Name], 
            r.inherent_value AS [Inherent Value], 
            rr.residual_value AS [Residual Value] 
          FROM dbo.[Risks] r
          JOIN dbo.[ResidualRisks] rr ON rr.riskId = r.id 
          LEFT JOIN dbo.[RiskFunctions] rf ON r.id = rf.risk_id
          LEFT JOIN dbo.[Functions] f ON rf.function_id = f.id
          WHERE r.isDeleted = 0 AND rr.isDeleted = 0 ${dateFilter}
          ORDER BY r.createdAt DESC
        `;
        inherentResidualRiskComparison = await this.databaseService.query(inherentResidualRiskComparisonQuery);
      } catch (error) {
        console.log('ResidualRisks table not found, using empty array');
      }

      try {
        // Inherent vs Residual Risk Comparison
        const highResidualRiskOverviewQuery = `
          SELECT 
            risk_name AS [Risk Name], 
            residual_level AS [Residual Level], 
            inherent_value AS [Inherent Value], 
            inherent_frequency_label AS [Inherent Frequency], 
            inherent_financial_label AS [Inherent Financial],
            residual_frequency_label AS [Residual Frequency], 
            residual_financial_label AS [Residual Financial],
            quarter AS [Quarter],
            year AS [Year]
          FROM ( 
            SELECT 
              r.name AS risk_name, 
              rr.residual_value AS residual_level, 
              r.inherent_value AS inherent_value,
              r.inherent_frequency AS inherent_frequency,
              r.inherent_financial_value AS inherent_financial_value,
              rr.residual_frequency AS residual_frequency,
              rr.residual_financial_value AS residual_financial_value,
              rr.quarter AS quarter,
              rr.year AS year,
              -- Inherent Frequency Labels
              CASE 
                WHEN r.inherent_frequency = 1 THEN 'Once in Three Years'
                WHEN r.inherent_frequency = 2 THEN 'Annually'
                WHEN r.inherent_frequency = 3 THEN 'Half Yearly'
                WHEN r.inherent_frequency = 4 THEN 'Quarterly'
                WHEN r.inherent_frequency = 5 THEN 'Monthly'
                ELSE 'Unknown'
              END AS inherent_frequency_label,
              -- Inherent Financial Labels
              CASE 
                WHEN r.inherent_financial_value = 1 THEN '0 - 10,000'
                WHEN r.inherent_financial_value = 2 THEN '10,000 - 100,000'
                WHEN r.inherent_financial_value = 3 THEN '100,000 - 1,000,000'
                WHEN r.inherent_financial_value = 4 THEN '1,000,000 - 10,000,000'
                WHEN r.inherent_financial_value = 5 THEN '> 10,000,000'
                ELSE 'Unknown'
              END AS inherent_financial_label,
              -- Residual Frequency Labels
              CASE 
                WHEN rr.residual_frequency = 1 THEN 'Once in Three Years'
                WHEN rr.residual_frequency = 2 THEN 'Annually'
                WHEN rr.residual_frequency = 3 THEN 'Half Yearly'
                WHEN rr.residual_frequency = 4 THEN 'Quarterly'
                WHEN rr.residual_frequency = 5 THEN 'Monthly'
                ELSE 'Unknown'
              END AS residual_frequency_label,
              -- Residual Financial Labels
              CASE 
                WHEN rr.residual_financial_value = 1 THEN '0 - 10,000'
                WHEN rr.residual_financial_value = 2 THEN '10,000 - 100,000'
                WHEN rr.residual_financial_value = 3 THEN '100,000 - 1,000,000'
                WHEN rr.residual_financial_value = 4 THEN '1,000,000 - 10,000,000'
                WHEN rr.residual_financial_value = 5 THEN '> 10,000,000'
                ELSE 'Unknown'
              END AS residual_financial_label
            FROM dbo.[ResidualRisks] rr 
            JOIN dbo.[Risks] r ON rr.riskId = r.id 
            WHERE r.isDeleted = 0 AND rr.residual_value = 'High' ${dateFilter}
          ) AS virtual_table
          ORDER BY year DESC, quarter DESC, inherent_value DESC
        `;
        highResidualRiskOverview = await this.databaseService.query(highResidualRiskOverviewQuery);
      } catch (error) {
        console.log('ResidualRisks table not found, using empty array');
      }

      try {
        // Risks and their Controls Count
        const risksAndControlsCountQuery = `
          SELECT 
            r.name AS risk_name, 
            COUNT(DISTINCT rc.control_id) AS control_count 
          FROM dbo.[Risks] r 
          LEFT JOIN dbo.[RiskControls] rc ON r.id = rc.risk_id 
          LEFT JOIN dbo.[Controls] c ON rc.control_id = c.id 
          WHERE r.isDeleted = 0 AND r.deletedAt IS NULL AND c.isDeleted = 0 AND c.deletedAt IS NULL ${dateFilter}
          GROUP BY r.name 
          ORDER BY control_count DESC
        `;
        risksAndControlsCount = await this.databaseService.query(risksAndControlsCountQuery);
      } catch (error) {
        console.log('RiskControls table not found, using empty array');
      }

      try {
        // Controls and Risk Count
        const controlsAndRiskCountQuery = `
          SELECT 
            c.name AS [Controls__name], 
            COUNT(DISTINCT rc.risk_id) AS [count] 
          FROM dbo.[Controls] c
          LEFT JOIN dbo.[RiskControls] rc ON c.id = rc.control_id 
          LEFT JOIN dbo.[Risks] r ON rc.risk_id = r.id AND r.isDeleted = 0
          WHERE c.isDeleted = 0 ${dateFilter}
          GROUP BY c.name 
          ORDER BY [count] DESC, c.name ASC
        `;
        controlsAndRiskCount = await this.databaseService.query(controlsAndRiskCountQuery);
      } catch (error) {
        console.log('RiskControls table not found, using empty array');
      }

      try {
        // Risks Details
        const risksDetailsQuery = `
          SELECT
            r.name AS [RiskName], 
            r.description AS [RiskDesc], 
            et.name AS [RiskEventName], 
            r.approve AS [RiskApprove], 
            r.inherent_value AS [InherentValue], 
            r.residual_value AS [ResidualValue], 
            r.inherent_frequency AS [InherentFrequency], 
            r.inherent_financial_value AS [InherentFinancialValue], 
            rr.residual_value AS [RiskResidualValue], 
            rr.quarter AS [ResidualQuarter], 
            rr.year AS [ResidualYear] 
          FROM dbo.[Risks] r 
          INNER JOIN dbo.[ResidualRisks] rr ON rr.riskId = r.id AND rr.isDeleted = 0 
          INNER JOIN dbo.[EventTypes] et ON et.id = r.event 
          WHERE r.isDeleted = 0 ${dateFilter}
          ORDER BY r.createdAt DESC
        `;
        risksDetails = await this.databaseService.query(risksDetailsQuery);
      } catch (error) {
        console.log('ResidualRisks or EventTypes table not found, using empty array');
      }

      return {
        totalRisks,
        allRisks,
        risksByCategory,
        risksByEventType,
        riskLevels,
        riskReductionCount,
        newRisks,
        // New data
        risksPerDepartment,
        risksPerBusinessProcess,
        createdDeletedRisksPerQuarter,
        quarterlyRiskCreationTrends,
        inherentResidualRiskComparison,
        riskApprovalStatusDistribution,
        highResidualRiskOverview,
        riskDistributionByFinancialImpact,
        risksAndControlsCount,
        controlsAndRiskCount,
        risksDetails
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
        r.code as code,
        r.name as risk_name,
        'High' as inherent_level,
        CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
        r.createdAt as created_at
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter} AND r.inherent_value = 'High'
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter}
      AND r.inherent_value = 'High'
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limit]),
      this.databaseService.query(countQuery)
    ]);
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async getMediumRisks(page: number, limit: number, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        r.code as code,
        r.name as risk_name,
        'Medium' as inherent_level,
        CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
        r.createdAt as created_at
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter} AND r.inherent_value = 'Medium'
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter}
      AND r.inherent_value = 'Medium'
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limit]),
      this.databaseService.query(countQuery)
    ]);
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async getLowRisks(page: number, limit: number, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        r.code as code,
        r.name as risk_name,
        'Low' as inherent_level,
        CASE WHEN r.residual_value IN ('High','Medium','Low') THEN r.residual_value ELSE NULL END as residual_level,
        r.createdAt as created_at
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter} AND r.inherent_value = 'Low'
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter}
      AND r.inherent_value = 'Low'
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limit]),
      this.databaseService.query(countQuery)
    ]);
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
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
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async getNewRisks(page: number, limit: number, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        r.code as code,
        r.name as risk_name,
        r.createdAt as created_at
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 AND DATEDIFF(month, r.createdAt, GETDATE()) = 0 ${dateFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS
      FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 AND DATEDIFF(month, r.createdAt, GETDATE()) = 0 ${dateFilter}
    `;
    
    const [data, countResult] = await Promise.all([
      this.databaseService.query(query, [offset, limit]),
      this.databaseService.query(countQuery)
    ]);
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
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

  // Detail endpoints for charts and tables
  async getRisksByCategory(category: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    const offset = (page - 1) * limit;
    
    const isUncategorized = category === 'Uncategorized';
    let categoryFilter = '';
    if (isUncategorized) {
      categoryFilter = `AND (c.name IS NULL OR c.name = '')`;
    } else {
      categoryFilter = `AND c.name = @param2`;
    }
    
    // For count query, use @param0 when category is provided
    let countCategoryFilter = '';
    if (isUncategorized) {
      countCategoryFilter = `AND (c.name IS NULL OR c.name = '')`;
    } else {
      countCategoryFilter = `AND c.name = @param0`;
    }
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        ISNULL(c.name, 'Uncategorized') AS category_name,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt
      FROM dbo.[Risks] r
      LEFT JOIN dbo.RiskCategories rc ON r.id = rc.risk_id AND rc.isDeleted = 0
      LEFT JOIN dbo.Categories c ON rc.category_id = c.id AND c.isDeleted = 0
      WHERE r.isDeleted = 0 ${dateFilter} ${categoryFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      LEFT JOIN dbo.RiskCategories rc ON r.id = rc.risk_id AND rc.isDeleted = 0
      LEFT JOIN dbo.Categories c ON rc.category_id = c.id AND c.isDeleted = 0
      WHERE r.isDeleted = 0 ${dateFilter} ${countCategoryFilter}
    `;
    
    const dataParams = isUncategorized ? [offset, limit] : [offset, limit, category];
    const countParams = isUncategorized ? [] : [category];
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, dataParams),
        this.databaseService.query(countQuery, countParams)
      ]);
      
      return {
        data,
        pagination: {
          page,
          limit,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limit),
          hasNext: page < Math.ceil((count[0]?.total || 0) / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByCategory:', error);
      console.error('Category:', category);
      console.error('Data params:', dataParams);
      console.error('Count params:', countParams);
      throw error;
    }
  }

  async getRisksByEventType(eventType: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    const offset = (page - 1) * limit;
    
    const isUnknown = eventType === 'Unknown';
    let eventTypeFilter = '';
    if (isUnknown) {
      eventTypeFilter = `AND (et.name IS NULL OR et.name = '')`;
    } else {
      eventTypeFilter = `AND et.name = @param2`;
    }
    
    // For count query, use @param0 when eventType is provided
    let countEventTypeFilter = '';
    if (isUnknown) {
      countEventTypeFilter = `AND (et.name IS NULL OR et.name = '')`;
    } else {
      countEventTypeFilter = `AND et.name = @param0`;
    }
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        ISNULL(et.name, 'Unknown') AS event_type_name,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[EventTypes] et ON r.event = et.id
      WHERE r.isDeleted = 0 ${dateFilter} ${eventTypeFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[EventTypes] et ON r.event = et.id
      WHERE r.isDeleted = 0 ${dateFilter} ${countEventTypeFilter}
    `;
    
    const dataParams = isUnknown ? [offset, limit] : [offset, limit, eventType];
    const countParams = isUnknown ? [] : [eventType];
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, dataParams),
        this.databaseService.query(countQuery, countParams)
      ]);
      
      return {
        data,
        pagination: {
          page,
          limit,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limit),
          hasNext: page < Math.ceil((count[0]?.total || 0) / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByEventType:', error);
      console.error('EventType:', eventType);
      console.error('Data params:', dataParams);
      console.error('Count params:', countParams);
      throw error;
    }
  }

  async getRisksByQuarter(quarter: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    const offset = (page - 1) * limit;
    
    // Extract quarter and year from string like "Q1 2025" or "2025-Q2"
    let quarterNum: number;
    let year: number;
    
    // Try format "2025-Q2" first (from frontend creation_quarter)
    const format1Match = quarter.match(/(\d{4})-Q(\d+)/);
    if (format1Match) {
      year = parseInt(format1Match[1]);
      quarterNum = parseInt(format1Match[2]);
    } else {
      // Try format "Q1 2025"
      const format2Match = quarter.match(/Q(\d+)\s+(\d+)/);
      if (format2Match) {
        quarterNum = parseInt(format2Match[1]);
        year = parseInt(format2Match[2]);
      } else {
        throw new Error(`Invalid quarter format: "${quarter}". Expected format: "Q1 2025" or "2025-Q2"`);
      }
    }
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt,
        CONCAT(YEAR(r.createdAt), '-Q', DATEPART(QUARTER, r.createdAt)) AS quarter
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 
        AND DATEPART(QUARTER, r.createdAt) = @param2
        AND YEAR(r.createdAt) = @param3
        ${dateFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    // For count query, use @param0 and @param1 since only 2 parameters are passed
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 
        AND DATEPART(QUARTER, r.createdAt) = @param0
        AND YEAR(r.createdAt) = @param1
        ${dateFilter}
    `;
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, [offset, limit, quarterNum, year]),
        this.databaseService.query(countQuery, [quarterNum, year])
      ]);
      
      return {
        data,
        pagination: {
          page,
          limit,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limit),
          hasNext: page < Math.ceil((count[0]?.total || 0) / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByQuarter:', error);
      console.error('Quarter:', quarter);
      console.error('QuarterNum:', quarterNum, 'Year:', year);
      throw error;
    }
  }

  async getRisksByApprovalStatus(approvalStatus: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    const offset = (page - 1) * limit;
    
    let dataQuery = '';
    let countQuery = '';
    
    if (approvalStatus === 'Approved') {
      // For approved: risks that have at least one approved ResidualRisk
      dataQuery = `
        SELECT DISTINCT
          r.code,
          r.name AS name,
          'Approved' AS approval_status,
          r.inherent_value,
          r.residual_value,
          r.createdAt AS createdAt
        FROM dbo.[Risks] r
        INNER JOIN dbo.[ResidualRisks] rr ON r.id = rr.riskId AND rr.isDeleted = 0
        WHERE r.isDeleted = 0 
          AND rr.preparerResidualStatus = 'sent' 
          AND rr.acceptanceResidualStatus = 'approved'
          ${dateFilter}
        ORDER BY r.createdAt DESC
        OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
      `;
      
      countQuery = `
        SELECT COUNT(DISTINCT r.id) as total
        FROM dbo.[Risks] r
        INNER JOIN dbo.[ResidualRisks] rr ON r.id = rr.riskId AND rr.isDeleted = 0
        WHERE r.isDeleted = 0 
          AND rr.preparerResidualStatus = 'sent' 
          AND rr.acceptanceResidualStatus = 'approved'
          ${dateFilter}
      `;
    } else {
      // For not approved: risks that don't have any approved ResidualRisk
      // Use NOT EXISTS to ensure we only get risks with no approved ResidualRisks
      dataQuery = `
        SELECT 
          r.code,
          r.name AS name,
          'Not Approved' AS approval_status,
          r.inherent_value,
          r.residual_value,
          r.createdAt AS createdAt
        FROM dbo.[Risks] r
        INNER JOIN dbo.[ResidualRisks] rr ON r.id = rr.riskId AND rr.isDeleted = 0
        WHERE r.isDeleted = 0 
          AND NOT EXISTS (
            SELECT 1 
            FROM dbo.[ResidualRisks] rr2 
            WHERE rr2.riskId = r.id 
              AND rr2.isDeleted = 0
              AND rr2.preparerResidualStatus = 'sent' 
              AND rr2.acceptanceResidualStatus = 'approved'
          )
          ${dateFilter}
        GROUP BY r.id, r.code, r.name, r.inherent_value, r.residual_value, r.createdAt
        ORDER BY r.createdAt DESC
        OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
      `;
      
      countQuery = `
        SELECT COUNT(DISTINCT r.id) as total
        FROM dbo.[Risks] r
        INNER JOIN dbo.[ResidualRisks] rr ON r.id = rr.riskId AND rr.isDeleted = 0
        WHERE r.isDeleted = 0 
          AND NOT EXISTS (
            SELECT 1 
            FROM dbo.[ResidualRisks] rr2 
            WHERE rr2.riskId = r.id 
              AND rr2.isDeleted = 0
              AND rr2.preparerResidualStatus = 'sent' 
              AND rr2.acceptanceResidualStatus = 'approved'
          )
          ${dateFilter}
      `;
    }
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, [offset, limit]),
        this.databaseService.query(countQuery)
      ]);
      
      return {
        data,
        pagination: {
          page,
          limit,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limit),
          hasNext: page < Math.ceil((count[0]?.total || 0) / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByApprovalStatus:', error);
      console.error('ApprovalStatus:', approvalStatus);
      throw error;
    }
  }

  async getRisksByFinancialImpact(financialImpact: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    const offset = (page - 1) * limit;
    
    let financialFilter = '';
    if (financialImpact === 'Low') {
      financialFilter = `AND r.inherent_financial_value <= 2`;
    } else if (financialImpact === 'Medium') {
      financialFilter = `AND r.inherent_financial_value = 3`;
    } else if (financialImpact === 'High') {
      financialFilter = `AND r.inherent_financial_value >= 4`;
    } else if (financialImpact === 'Unknown') {
      financialFilter = `AND (r.inherent_financial_value IS NULL OR r.inherent_financial_value = 0)`;
    }
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        CASE 
          WHEN r.inherent_financial_value <= 2 THEN 'Low' 
          WHEN r.inherent_financial_value = 3 THEN 'Medium' 
          WHEN r.inherent_financial_value >= 4 THEN 'High' 
          ELSE 'Unknown' 
        END AS financial_status,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter} ${financialFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 ${dateFilter} ${financialFilter}
    `;
    
    const [data, count] = await Promise.all([
      this.databaseService.query(dataQuery, [offset, limit]),
      this.databaseService.query(countQuery)
    ]);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total: count[0]?.total || 0,
        totalPages: Math.ceil((count[0]?.total || 0) / limit),
        hasNext: page < Math.ceil((count[0]?.total || 0) / limit),
        hasPrev: page > 1
      }
    };
  }

  async getRisksByFunction(functionName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    const offset = (page - 1) * limit;
    
    const hasFunction = functionName && functionName !== '';
    let functionFilter = '';
    let countFunctionFilter = '';
    
    if (hasFunction) {
      functionFilter = `AND f.name = @param2`;
      countFunctionFilter = `AND f.name = @param0`;
    } else {
      functionFilter = `AND (f.name IS NULL OR f.name = '')`;
      countFunctionFilter = `AND (f.name IS NULL OR f.name = '')`;
    }
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        f.name AS function_name,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[RiskFunctions] rf ON r.id = rf.risk_id
      LEFT JOIN dbo.[Functions] f ON rf.function_id = f.id
      WHERE r.isDeleted = 0 ${dateFilter} ${functionFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[RiskFunctions] rf ON r.id = rf.risk_id
      LEFT JOIN dbo.[Functions] f ON rf.function_id = f.id
      WHERE r.isDeleted = 0 ${dateFilter} ${countFunctionFilter}
    `;
    
    const params = hasFunction ? [offset, limit, functionName] : [offset, limit];
    const countParams = hasFunction ? [functionName] : [];
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, params),
        this.databaseService.query(countQuery, countParams)
      ]);
      
      return {
        data,
        pagination: {
          page,
          limit,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limit),
          hasNext: page < Math.ceil((count[0]?.total || 0) / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByFunction:', error);
      console.error('FunctionName:', functionName);
      throw error;
    }
  }

  async getRisksByBusinessProcess(processName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    const offset = (page - 1) * limit;
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        p.name AS process_name,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt
      FROM dbo.[Risks] r
      JOIN dbo.[RiskProcesses] rp ON r.id = rp.risk_id
      JOIN dbo.[Processes] p ON rp.process_id = p.id
      WHERE r.isDeleted = 0 ${dateFilter} AND p.name = @param2
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    // For count query, use @param0 since only 1 parameter is passed
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      JOIN dbo.[RiskProcesses] rp ON r.id = rp.risk_id
      JOIN dbo.[Processes] p ON rp.process_id = p.id
      WHERE r.isDeleted = 0 ${dateFilter} AND p.name = @param0
    `;
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, [offset, limit, processName]),
        this.databaseService.query(countQuery, [processName])
      ]);
      
      return {
        data,
        pagination: {
          page,
          limit,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limit),
          hasNext: page < Math.ceil((count[0]?.total || 0) / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByBusinessProcess:', error);
      console.error('ProcessName:', processName);
      throw error;
    }
  }

  async getRisksByName(riskName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    const offset = (page - 1) * limit;
    
    const dataQuery = `
      SELECT 
        c.code,
        c.name AS name,
        r.name AS risk_name,
        c.code AS control_code,
        rc.control_id,
        c.createdAt AS createdAt
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[RiskControls] rc ON r.id = rc.risk_id
      LEFT JOIN dbo.[Controls] c ON rc.control_id = c.id AND c.isDeleted = 0 AND c.deletedAt IS NULL
      WHERE r.isDeleted = 0 
        AND r.deletedAt IS NULL 
        AND r.name = @param2
        ${dateFilter}
      ORDER BY c.name ASC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    // For count query, use @param0 since only 1 parameter is passed
    const countQuery = `
      SELECT COUNT(DISTINCT rc.control_id) as total
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[RiskControls] rc ON r.id = rc.risk_id
      LEFT JOIN dbo.[Controls] c ON rc.control_id = c.id AND c.isDeleted = 0 AND c.deletedAt IS NULL
      WHERE r.isDeleted = 0 
        AND r.deletedAt IS NULL 
        AND r.name = @param0
        ${dateFilter}
    `;
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, [offset, limit, riskName]),
        this.databaseService.query(countQuery, [riskName])
      ]);
      
      return {
        data,
        pagination: {
          page,
          limit,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limit),
          hasNext: page < Math.ceil((count[0]?.total || 0) / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByName:', error);
      console.error('RiskName:', riskName);
      throw error;
    }
  }

  async getRisksByControlName(controlName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    const offset = (page - 1) * limit;
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        c.name AS control_name,
        r.inherent_value,
        r.residual_value,
        r.createdAt AS createdAt
      FROM dbo.[Controls] c
      LEFT JOIN dbo.[RiskControls] rc ON c.id = rc.control_id
      LEFT JOIN dbo.[Risks] r ON rc.risk_id = r.id AND r.isDeleted = 0 AND r.deletedAt IS NULL
      WHERE c.isDeleted = 0 
        AND c.deletedAt IS NULL
        AND c.name = @param2
        ${dateFilter}
      ORDER BY r.name ASC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    // For count query, use @param0 since only 1 parameter is passed
    const countQuery = `
      SELECT COUNT(DISTINCT rc.risk_id) as total
      FROM dbo.[Controls] c
      LEFT JOIN dbo.[RiskControls] rc ON c.id = rc.control_id
      LEFT JOIN dbo.[Risks] r ON rc.risk_id = r.id AND r.isDeleted = 0 AND r.deletedAt IS NULL
      WHERE c.isDeleted = 0 
        AND c.deletedAt IS NULL
        AND c.name = @param0
        ${dateFilter}
    `;
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, [offset, limit, controlName]),
        this.databaseService.query(countQuery, [controlName])
      ]);
      
      return {
        data,
        pagination: {
          page,
          limit,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limit),
          hasNext: page < Math.ceil((count[0]?.total || 0) / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksByControlName:', error);
      console.error('ControlName:', controlName);
      throw error;
    }
  }

  async getRisksForComparison(riskName: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'r.createdAt');
    const offset = (page - 1) * limit;
    
    const dataQuery = `
      SELECT 
        r.code,
        r.name AS name,
        r.inherent_value,
        r.residual_value,
        f.name AS function_name,
        r.createdAt AS createdAt
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[RiskFunctions] rf ON r.id = rf.risk_id
      LEFT JOIN dbo.[Functions] f ON rf.function_id = f.id
      WHERE r.isDeleted = 0 
        AND r.name = @param2
        ${dateFilter}
      ORDER BY r.createdAt DESC
      OFFSET @param0 ROWS FETCH NEXT @param1 ROWS ONLY
    `;
    
    // For count query, use @param0 since only 1 parameter is passed
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.[Risks] r
      WHERE r.isDeleted = 0 
        AND r.name = @param0
        ${dateFilter}
    `;
    
    try {
      const [data, count] = await Promise.all([
        this.databaseService.query(dataQuery, [offset, limit, riskName]),
        this.databaseService.query(countQuery, [riskName])
      ]);
      
      return {
        data,
        pagination: {
          page,
          limit,
          total: count[0]?.total || 0,
          totalPages: Math.ceil((count[0]?.total || 0) / limit),
          hasNext: page < Math.ceil((count[0]?.total || 0) / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getRisksForComparison:', error);
      console.error('RiskName:', riskName);
      throw error;
    }
  }
}