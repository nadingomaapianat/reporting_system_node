import { Injectable } from '@nestjs/common';
import { DashboardConfigService } from './dashboard-config.service';

@Injectable()
export class ChartExtensionsService {
  
  // Example: How to add new chart types in 2 days
  static addNewChartsToControls() {
    const baseConfig = DashboardConfigService.getControlsConfig();
    
    // Add new chart types easily
    const enhancedConfig = {
      ...baseConfig,
      charts: [
        ...baseConfig.charts,
        
        // 1. Risk Level Distribution (NEW)
        {
          id: 'riskLevelDistribution',
          name: 'Controls by Risk Level',
          type: 'bar' as const,
          query: `SELECT risk_level as name, COUNT(*) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY risk_level ORDER BY value DESC`,
          xField: 'name',
          yField: 'value',
          labelField: 'name'
        },
        
        // 2. Monthly Trend (NEW)
        {
          id: 'monthlyTrend',
          name: 'Controls Created Over Time',
          type: 'line' as const,
          query: `SELECT FORMAT(createdAt, 'yyyy-MM') as name, COUNT(*) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY FORMAT(createdAt, 'yyyy-MM') ORDER BY name`,
          xField: 'name',
          yField: 'value',
          labelField: 'name'
        },
        
        // 3. Priority Distribution (NEW)
        {
          id: 'priorityDistribution',
          name: 'Controls by Priority',
          type: 'pie' as const,
          query: `SELECT priority as name, COUNT(*) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY priority`,
          xField: 'name',
          yField: 'value',
          labelField: 'name'
        },
        
        // 4. Compliance Status (NEW)
        {
          id: 'complianceStatus',
          name: 'Compliance Status Overview',
          type: 'bar' as const,
          query: `SELECT compliance_status as name, COUNT(*) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY compliance_status ORDER BY value DESC`,
          xField: 'name',
          yField: 'value',
          labelField: 'name'
        },
        
        // 5. Geographic Distribution (NEW)
        {
          id: 'geographicDistribution',
          name: 'Controls by Region',
          type: 'pie' as const,
          query: `SELECT region as name, COUNT(*) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY region`,
          xField: 'name',
          yField: 'value',
          labelField: 'name'
        },
        
        // 6. Control Effectiveness (NEW)
        {
          id: 'controlEffectiveness',
          name: 'Control Effectiveness Score',
          type: 'scatter' as const,
          query: `SELECT control_name as name, effectiveness_score as value FROM dbo.[Controls] WHERE effectiveness_score IS NOT NULL AND 1=1 {dateFilter} ORDER BY effectiveness_score DESC`,
          xField: 'name',
          yField: 'value',
          labelField: 'name'
        }
      ]
    };
    
    return enhancedConfig;
  }
  
  // Example: How to add new metrics easily
  static addNewMetricsToControls() {
    const baseConfig = DashboardConfigService.getControlsConfig();
    
    return {
      ...baseConfig,
      metrics: [
        ...baseConfig.metrics,
        
        // New metrics
        {
          id: 'highRiskControls',
          name: 'High Risk Controls',
          query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE risk_level = 'High' AND 1=1 {dateFilter}`,
          color: 'red',
          icon: 'exclamation-triangle'
        },
        {
          id: 'overdueControls',
          name: 'Overdue Controls',
          query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE due_date < GETDATE() AND status != 'completed' AND 1=1 {dateFilter}`,
          color: 'orange',
          icon: 'clock'
        },
        {
          id: 'complianceScore',
          name: 'Compliance Score',
          query: `SELECT AVG(CAST(compliance_score AS FLOAT)) as total FROM dbo.[Controls] WHERE compliance_score IS NOT NULL AND 1=1 {dateFilter}`,
          color: 'green',
          icon: 'chart-bar'
        }
      ]
    };
  }
  
  // Example: How to add new tables easily
  static addNewTablesToControls() {
    const baseConfig = DashboardConfigService.getControlsConfig();
    
    return {
      ...baseConfig,
      tables: [
        ...baseConfig.tables,
        
        // New table
        {
          id: 'controlEffectivenessTable',
          name: 'Control Effectiveness Analysis',
          query: `SELECT id, name, risk_level, effectiveness_score, compliance_score, last_reviewed FROM dbo.[Controls] WHERE 1=1 {dateFilter} ORDER BY effectiveness_score DESC`,
          columns: [
            { key: 'id', label: 'ID', type: 'text' },
            { key: 'name', label: 'Control Name', type: 'text' },
            { key: 'risk_level', label: 'Risk Level', type: 'status' },
            { key: 'effectiveness_score', label: 'Effectiveness Score', type: 'number' },
            { key: 'compliance_score', label: 'Compliance Score', type: 'number' },
            { key: 'last_reviewed', label: 'Last Reviewed', type: 'date' }
          ],
          pagination: true
        }
      ]
    };
  }
  
  // Complete enhanced configuration
  static getEnhancedControlsConfig() {
    const withNewCharts = this.addNewChartsToControls();
    const withNewMetrics = this.addNewMetricsToControls();
    const withNewTables = this.addNewTablesToControls();
    
    return {
      ...withNewCharts,
      metrics: withNewMetrics.metrics,
      tables: withNewTables.tables
    };
  }
}
