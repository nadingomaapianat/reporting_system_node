"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartExtensionsService = void 0;
const common_1 = require("@nestjs/common");
const dashboard_config_service_1 = require("./dashboard-config.service");
let ChartExtensionsService = class ChartExtensionsService {
    static addNewChartsToControls() {
        const baseConfig = dashboard_config_service_1.DashboardConfigService.getControlsConfig();
        const enhancedConfig = {
            ...baseConfig,
            charts: [
                ...baseConfig.charts,
                {
                    id: 'riskLevelDistribution',
                    name: 'Controls by Risk Level',
                    type: 'bar',
                    query: `SELECT risk_level as name, COUNT(*) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY risk_level ORDER BY value DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'monthlyTrend',
                    name: 'Controls Created Over Time',
                    type: 'line',
                    query: `SELECT FORMAT(createdAt, 'yyyy-MM') as name, COUNT(*) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY FORMAT(createdAt, 'yyyy-MM') ORDER BY name`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'priorityDistribution',
                    name: 'Controls by Priority',
                    type: 'pie',
                    query: `SELECT priority as name, COUNT(*) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY priority`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'complianceStatus',
                    name: 'Compliance Status Overview',
                    type: 'bar',
                    query: `SELECT compliance_status as name, COUNT(*) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY compliance_status ORDER BY value DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'geographicDistribution',
                    name: 'Controls by Region',
                    type: 'pie',
                    query: `SELECT region as name, COUNT(*) as value FROM dbo.[Controls] WHERE 1=1 {dateFilter} GROUP BY region`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'controlEffectiveness',
                    name: 'Control Effectiveness Score',
                    type: 'scatter',
                    query: `SELECT control_name as name, effectiveness_score as value FROM dbo.[Controls] WHERE effectiveness_score IS NOT NULL AND 1=1 {dateFilter} ORDER BY effectiveness_score DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                }
            ]
        };
        return enhancedConfig;
    }
    static addNewMetricsToControls() {
        const baseConfig = dashboard_config_service_1.DashboardConfigService.getControlsConfig();
        return {
            ...baseConfig,
            metrics: [
                ...baseConfig.metrics,
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
    static addNewTablesToControls() {
        const baseConfig = dashboard_config_service_1.DashboardConfigService.getControlsConfig();
        return {
            ...baseConfig,
            tables: [
                ...baseConfig.tables,
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
};
exports.ChartExtensionsService = ChartExtensionsService;
exports.ChartExtensionsService = ChartExtensionsService = __decorate([
    (0, common_1.Injectable)()
], ChartExtensionsService);
//# sourceMappingURL=chart-extensions.service.js.map