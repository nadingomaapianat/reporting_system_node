"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DashboardConfigService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardConfigService = void 0;
const common_1 = require("@nestjs/common");
let DashboardConfigService = DashboardConfigService_1 = class DashboardConfigService {
    static getControlsConfig() {
        return {
            name: 'Controls Dashboard',
            tableName: 'dbo.[Controls]',
            dateField: 'createdAt',
            metrics: [
                {
                    id: 'total',
                    name: 'Total Controls',
                    query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE 1=1 {dateFilter}`,
                    color: 'blue',
                    icon: 'chart-bar'
                },
                {
                    id: 'pendingPreparer',
                    name: 'Pending Preparer',
                    query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE preparerStatus != 'approved' AND 1=1 {dateFilter}`,
                    color: 'orange',
                    icon: 'clock'
                },
                {
                    id: 'pendingChecker',
                    name: 'Pending Checker',
                    query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE checkerStatus != 'approved' AND 1=1 {dateFilter}`,
                    color: 'purple',
                    icon: 'check-circle'
                },
                {
                    id: 'pendingReviewer',
                    name: 'Pending Reviewer',
                    query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE reviewerStatus != 'approved' AND 1=1 {dateFilter}`,
                    color: 'indigo',
                    icon: 'document-check'
                },
                {
                    id: 'pendingAcceptance',
                    name: 'Pending Acceptance',
                    query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE acceptanceStatus != 'approved' AND 1=1 {dateFilter}`,
                    color: 'red',
                    icon: 'exclamation-triangle'
                },
                {
                    id: 'unmapped',
                    name: 'Unmapped Controls',
                    query: `SELECT COUNT(*) as total FROM GRCDB2.dbo.Controls c WHERE c.isDeleted = 0 {dateFilter} AND NOT EXISTS (SELECT 1 FROM GRCDB2.dbo.ControlCosos ccx WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL)`,
                    color: 'yellow',
                    icon: 'exclamation-triangle'
                }
            ],
            charts: [
                {
                    id: 'departmentDistribution',
                    name: 'Distribution by Department',
                    type: 'bar',
                    query: `SELECT 
            f.name as name,
            COUNT(c.id) as value
          FROM GRCDB2.dbo.Controls c
          JOIN GRCDB2.dbo.ControlFunctions cf ON c.id = cf.control_id
          JOIN GRCDB2.dbo.Functions f ON cf.function_id = f.id
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY f.name
          ORDER BY COUNT(c.id) DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                this.CHART_TEMPLATES.statusDistribution('dbo.[Controls]', 'risk_response')
            ],
            tables: [
                this.TABLE_TEMPLATES.statusOverview('dbo.[Controls]', 'id', 'name', ['preparerStatus', 'checkerStatus', 'reviewerStatus', 'acceptanceStatus']),
                {
                    id: 'controlsByFunction',
                    name: 'Controls by Function',
                    query: `SELECT 
            f.name as function_name,
            c.id as control_id,
            c.name as control_name,
            c.code as control_code
          FROM GRCDB2.dbo.Controls c
          JOIN GRCDB2.dbo.ControlFunctions cf ON c.id = cf.control_id
          JOIN GRCDB2.dbo.Functions f ON cf.function_id = f.id
          WHERE c.isDeleted = 0 {dateFilter}
          ORDER BY f.name, c.name`,
                    columns: [
                        { key: 'function_name', label: 'Function/Department', type: 'text' },
                        { key: 'control_id', label: 'Control ID', type: 'number' },
                        { key: 'control_code', label: 'Control Code', type: 'text' },
                        { key: 'control_name', label: 'Control Name', type: 'text' }
                    ],
                    pagination: true
                }
            ]
        };
    }
    static getIncidentsConfig() {
        return {
            name: 'Incidents Dashboard',
            tableName: 'dbo.[Incidents]',
            dateField: 'createdAt',
            metrics: [
                this.METRIC_TEMPLATES.totalCount('dbo.[Incidents]', 'Incidents', 'red'),
                this.METRIC_TEMPLATES.pendingCount('dbo.[Incidents]', 'preparerStatus', 'Preparer', 'orange'),
                this.METRIC_TEMPLATES.pendingCount('dbo.[Incidents]', 'checkerStatus', 'Checker', 'yellow'),
                this.METRIC_TEMPLATES.pendingCount('dbo.[Incidents]', 'reviewerStatus', 'Reviewer', 'purple'),
                this.METRIC_TEMPLATES.pendingCount('dbo.[Incidents]', 'acceptanceStatus', 'Acceptance', 'indigo'),
                this.METRIC_TEMPLATES.financialImpact('dbo.[Incidents]', 'net_loss', 'Financial', 'green')
            ],
            charts: [
                this.CHART_TEMPLATES.categoryDistribution('dbo.[Incidents]', 'category_name'),
                this.CHART_TEMPLATES.statusDistribution('dbo.[Incidents]', 'status'),
                this.CHART_TEMPLATES.monthlyTrend('dbo.[Incidents]')
            ],
            tables: [
                this.TABLE_TEMPLATES.financialSummary('dbo.[Incidents]', 'id', 'title', 'net_loss')
            ]
        };
    }
    static getRisksConfig() {
        return {
            name: 'Risks Dashboard',
            tableName: 'dbo.[Risks]',
            dateField: 'createdAt',
            metrics: [
                this.METRIC_TEMPLATES.totalCount('dbo.[Risks]', 'Risks', 'red'),
                this.METRIC_TEMPLATES.pendingCount('dbo.[Risks]', 'status', 'Pending', 'yellow'),
                this.METRIC_TEMPLATES.approvedCount('dbo.[Risks]', 'status', 'Approved', 'green')
            ],
            charts: [
                this.CHART_TEMPLATES.riskDistribution('dbo.[Risks]', 'risk_level'),
                this.CHART_TEMPLATES.categoryDistribution('dbo.[Risks]', 'category'),
                this.CHART_TEMPLATES.monthlyTrend('dbo.[Risks]')
            ],
            tables: [
                this.TABLE_TEMPLATES.statusOverview('dbo.[Risks]', 'id', 'name', ['status', 'risk_level'])
            ]
        };
    }
    static addChartToConfig(config, chartType, ...args) {
        const newChart = this.CHART_TEMPLATES[chartType](...args);
        return {
            ...config,
            charts: [...config.charts, newChart]
        };
    }
    static addMetricToConfig(config, metricType, ...args) {
        const newMetric = this.METRIC_TEMPLATES[metricType](...args);
        return {
            ...config,
            metrics: [...config.metrics, newMetric]
        };
    }
};
exports.DashboardConfigService = DashboardConfigService;
DashboardConfigService.CHART_TEMPLATES = {
    departmentDistribution: (tableName, countField = 'count') => ({
        id: 'departmentDistribution',
        name: 'Distribution by Department',
        type: 'bar',
        query: `SELECT 'All Controls' as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY 'All Controls' ORDER BY COUNT(*) DESC`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
    }),
    statusDistribution: (tableName, statusField = 'status') => ({
        id: 'statusDistribution',
        name: 'Distribution by Status',
        type: 'pie',
        query: `SELECT ${statusField} as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY ${statusField}`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
    }),
    monthlyTrend: (tableName, dateField = 'createdAt') => ({
        id: 'monthlyTrend',
        name: 'Monthly Trend',
        type: 'line',
        query: `SELECT FORMAT(${dateField}, 'yyyy-MM') as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY FORMAT(${dateField}, 'yyyy-MM') ORDER BY name`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
    }),
    riskDistribution: (tableName, riskField = 'risk_level') => ({
        id: 'riskDistribution',
        name: 'Risk Level Distribution',
        type: 'bar',
        query: `SELECT ${riskField} as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY ${riskField} ORDER BY value DESC`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
    }),
    categoryDistribution: (tableName, categoryField = 'category') => ({
        id: 'categoryDistribution',
        name: 'Category Distribution',
        type: 'pie',
        query: `SELECT ${categoryField} as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY ${categoryField}`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
    })
};
DashboardConfigService.METRIC_TEMPLATES = {
    totalCount: (tableName, label, color = 'blue') => ({
        id: 'total',
        name: `Total ${label}`,
        query: `SELECT COUNT(*) as total FROM ${tableName} WHERE 1=1 {dateFilter}`,
        color,
        icon: 'chart-bar'
    }),
    pendingCount: (tableName, statusField, label, color = 'yellow') => ({
        id: 'pending',
        name: `Pending ${label}`,
        query: `SELECT COUNT(*) as total FROM ${tableName} WHERE ${statusField} != 'approved' AND 1=1 {dateFilter}`,
        color,
        icon: 'clock'
    }),
    approvedCount: (tableName, statusField, label, color = 'green') => ({
        id: 'approved',
        name: `Approved ${label}`,
        query: `SELECT COUNT(*) as total FROM ${tableName} WHERE ${statusField} = 'approved' AND 1=1 {dateFilter}`,
        color,
        icon: 'check-circle'
    }),
    financialImpact: (tableName, amountField, label, color = 'purple') => ({
        id: 'financialImpact',
        name: `Total ${label} Impact`,
        query: `SELECT SUM(${amountField}) as total FROM ${tableName} WHERE 1=1 {dateFilter}`,
        color,
        icon: 'currency-dollar'
    })
};
DashboardConfigService.TABLE_TEMPLATES = {
    statusOverview: (tableName, idField, nameField, statusFields) => ({
        id: 'statusOverview',
        name: 'Status Overview',
        query: `SELECT ${idField} as id, ${nameField} as name, code, ${statusFields.join(', ')} FROM ${tableName} WHERE 1=1 {dateFilter}`,
        columns: [
            { key: 'id', label: 'ID', type: 'text' },
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'code', label: 'Code', type: 'text' },
            ...statusFields.map(field => ({
                key: field,
                label: field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                type: 'status',
                render: (value) => ({
                    value: value || 'N/A',
                    className: value === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                })
            }))
        ],
        pagination: true
    }),
    financialSummary: (tableName, idField, nameField, amountField) => ({
        id: 'financialSummary',
        name: 'Financial Summary',
        query: `SELECT ${idField} as id, ${nameField} as name, ${amountField} as amount FROM ${tableName} WHERE 1=1 {dateFilter} ORDER BY ${amountField} DESC`,
        columns: [
            { key: 'id', label: 'ID', type: 'text' },
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'amount', label: 'Amount', type: 'currency' }
        ],
        pagination: true
    })
};
exports.DashboardConfigService = DashboardConfigService = DashboardConfigService_1 = __decorate([
    (0, common_1.Injectable)()
], DashboardConfigService);
//# sourceMappingURL=dashboard-config.service.js.map