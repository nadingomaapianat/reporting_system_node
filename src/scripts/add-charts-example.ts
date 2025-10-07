// Example: How to add new charts in 2 days
// This file shows how easy it is to extend dashboards with new charts

import { DashboardConfigService } from '../shared/dashboard-config.service';
import { ChartExtensionsService } from '../shared/chart-extensions.service';

// Method 1: Add individual charts using templates
function addChartsUsingTemplates() {
  const baseConfig = DashboardConfigService.getControlsConfig();
  
  // Add a new chart using existing template
  const configWithNewChart = DashboardConfigService.addChartToConfig(
    baseConfig,
    'monthlyTrend',
    'dbo.[Controls]',
    'createdAt'
  );
  
  // Add another chart
  const configWithMoreCharts = DashboardConfigService.addChartToConfig(
    configWithNewChart,
    'riskDistribution',
    'dbo.[Controls]',
    'risk_level'
  );
  
  return configWithMoreCharts;
}

// Method 2: Add custom charts manually
function addCustomCharts() {
  const baseConfig = DashboardConfigService.getControlsConfig();
  
  return {
    ...baseConfig,
    charts: [
      ...baseConfig.charts,
      
      // Custom chart 1: Control Maturity Levels
      {
        id: 'maturityLevels',
        name: 'Control Maturity Distribution',
        type: 'bar' as const,
        query: `SELECT maturity_level as name, COUNT(*) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY maturity_level ORDER BY value DESC`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
      },
      
      // Custom chart 2: Cost Analysis
      {
        id: 'costAnalysis',
        name: 'Control Implementation Costs',
        type: 'pie' as const,
        query: `SELECT cost_category as name, SUM(implementation_cost) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY cost_category`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
      },
      
      // Custom chart 3: Time Series Analysis
      {
        id: 'timeSeriesAnalysis',
        name: 'Control Performance Over Time',
        type: 'line' as const,
        query: `SELECT FORMAT(createdAt, 'yyyy-MM-dd') as name, AVG(CAST(performance_score AS FLOAT)) as value FROM dbo.[Controls] WHERE performance_score IS NOT NULL AND 1=1 {dateFilter} GROUP BY FORMAT(createdAt, 'yyyy-MM-dd') ORDER BY name`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
      }
    ]
  };
}

// Method 3: Use the enhanced configuration (all new charts at once)
function useEnhancedConfiguration() {
  return ChartExtensionsService.getEnhancedControlsConfig();
}

// Example usage in a service
export class ExampleDashboardService {
  // Choose one of the methods above
  getConfig() {
    // Option 1: Use templates (easiest)
    return addChartsUsingTemplates();
    
    // Option 2: Custom charts (more control)
    // return addCustomCharts();
    
    // Option 3: Enhanced config (most comprehensive)
    // return useEnhancedConfiguration();
  }
}

// Example: How to add charts to other dashboards
function addChartsToIncidentsDashboard() {
  const incidentsConfig = DashboardConfigService.getIncidentsConfig();
  
  return DashboardConfigService.addChartToConfig(
    incidentsConfig,
    'monthlyTrend',
    'dbo.[Incidents]',
    'createdAt'
  );
}

function addChartsToRisksDashboard() {
  const risksConfig = DashboardConfigService.getRisksConfig();
  
  return {
    ...risksConfig,
    charts: [
      ...risksConfig.charts,
      
      // New chart for risks
      {
        id: 'riskImpactAnalysis',
        name: 'Risk Impact vs Probability',
        type: 'scatter' as const,
        query: `SELECT risk_name as name, impact_score as value, probability_score as size FROM dbo.[Risks] WHERE 1=1 {dateFilter}`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
      }
    ]
  };
}

// Export examples for easy reference
export const ChartExamples = {
  addChartsUsingTemplates,
  addCustomCharts,
  useEnhancedConfiguration,
  addChartsToIncidentsDashboard,
  addChartsToRisksDashboard
};
