"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartExamples = exports.ExampleDashboardService = void 0;
const dashboard_config_service_1 = require("../shared/dashboard-config.service");
const chart_extensions_service_1 = require("../shared/chart-extensions.service");
function addChartsUsingTemplates() {
    const baseConfig = dashboard_config_service_1.DashboardConfigService.getControlsConfig();
    const configWithNewChart = dashboard_config_service_1.DashboardConfigService.addChartToConfig(baseConfig, 'monthlyTrend', 'dbo.[Controls]', 'createdAt');
    const configWithMoreCharts = dashboard_config_service_1.DashboardConfigService.addChartToConfig(configWithNewChart, 'riskDistribution', 'dbo.[Controls]', 'risk_level');
    return configWithMoreCharts;
}
function addCustomCharts() {
    const baseConfig = dashboard_config_service_1.DashboardConfigService.getControlsConfig();
    return {
        ...baseConfig,
        charts: [
            ...baseConfig.charts,
            {
                id: 'maturityLevels',
                name: 'Control Maturity Distribution',
                type: 'bar',
                query: `SELECT maturity_level as name, COUNT(*) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY maturity_level ORDER BY value DESC`,
                xField: 'name',
                yField: 'value',
                labelField: 'name'
            },
            {
                id: 'costAnalysis',
                name: 'Control Implementation Costs',
                type: 'pie',
                query: `SELECT cost_category as name, SUM(implementation_cost) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY cost_category`,
                xField: 'name',
                yField: 'value',
                labelField: 'name'
            },
            {
                id: 'timeSeriesAnalysis',
                name: 'Control Performance Over Time',
                type: 'line',
                query: `SELECT FORMAT(createdAt, 'yyyy-MM-dd') as name, AVG(CAST(performance_score AS FLOAT)) as value FROM dbo.[Controls] WHERE performance_score IS NOT NULL AND 1=1 {dateFilter} GROUP BY FORMAT(createdAt, 'yyyy-MM-dd') ORDER BY name`,
                xField: 'name',
                yField: 'value',
                labelField: 'name'
            }
        ]
    };
}
function useEnhancedConfiguration() {
    return chart_extensions_service_1.ChartExtensionsService.getEnhancedControlsConfig();
}
class ExampleDashboardService {
    getConfig() {
        return addChartsUsingTemplates();
    }
}
exports.ExampleDashboardService = ExampleDashboardService;
function addChartsToIncidentsDashboard() {
    const incidentsConfig = dashboard_config_service_1.DashboardConfigService.getIncidentsConfig();
    return dashboard_config_service_1.DashboardConfigService.addChartToConfig(incidentsConfig, 'monthlyTrend', 'dbo.[Incidents]', 'createdAt');
}
function addChartsToRisksDashboard() {
    const risksConfig = dashboard_config_service_1.DashboardConfigService.getRisksConfig();
    return {
        ...risksConfig,
        charts: [
            ...risksConfig.charts,
            {
                id: 'riskImpactAnalysis',
                name: 'Risk Impact vs Probability',
                type: 'scatter',
                query: `SELECT risk_name as name, impact_score as value, probability_score as size FROM dbo.[Risks] WHERE 1=1 {dateFilter}`,
                xField: 'name',
                yField: 'value',
                labelField: 'name'
            }
        ]
    };
}
exports.ChartExamples = {
    addChartsUsingTemplates,
    addCustomCharts,
    useEnhancedConfiguration,
    addChartsToIncidentsDashboard,
    addChartsToRisksDashboard
};
//# sourceMappingURL=add-charts-example.js.map