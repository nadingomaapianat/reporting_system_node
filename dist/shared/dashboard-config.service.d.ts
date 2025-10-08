import { DashboardConfig } from './base-dashboard.service';
export declare class DashboardConfigService {
    static readonly CHART_TEMPLATES: {
        departmentDistribution: (tableName: string, countField?: string) => {
            id: string;
            name: string;
            type: "bar";
            query: string;
            xField: string;
            yField: string;
            labelField: string;
        };
        statusDistribution: (tableName: string, statusField?: string) => {
            id: string;
            name: string;
            type: "pie";
            query: string;
            xField: string;
            yField: string;
            labelField: string;
        };
        monthlyTrend: (tableName: string, dateField?: string) => {
            id: string;
            name: string;
            type: "line";
            query: string;
            xField: string;
            yField: string;
            labelField: string;
        };
        riskDistribution: (tableName: string, riskField?: string) => {
            id: string;
            name: string;
            type: "bar";
            query: string;
            xField: string;
            yField: string;
            labelField: string;
        };
        categoryDistribution: (tableName: string, categoryField?: string) => {
            id: string;
            name: string;
            type: "pie";
            query: string;
            xField: string;
            yField: string;
            labelField: string;
        };
    };
    static readonly METRIC_TEMPLATES: {
        totalCount: (tableName: string, label: string, color?: string) => {
            id: string;
            name: string;
            query: string;
            color: string;
            icon: string;
        };
        pendingCount: (tableName: string, statusField: string, label: string, color?: string) => {
            id: string;
            name: string;
            query: string;
            color: string;
            icon: string;
        };
        approvedCount: (tableName: string, statusField: string, label: string, color?: string) => {
            id: string;
            name: string;
            query: string;
            color: string;
            icon: string;
        };
        financialImpact: (tableName: string, amountField: string, label: string, color?: string) => {
            id: string;
            name: string;
            query: string;
            color: string;
            icon: string;
        };
    };
    static readonly TABLE_TEMPLATES: {
        statusOverview: (tableName: string, idField: string, nameField: string, statusFields: string[]) => {
            id: string;
            name: string;
            query: string;
            columns: ({
                key: string;
                label: string;
                type: "status";
                render: (value: any) => {
                    value: any;
                    className: string;
                };
            } | {
                key: string;
                label: string;
                type: "text";
            })[];
            pagination: boolean;
        };
        financialSummary: (tableName: string, idField: string, nameField: string, amountField: string) => {
            id: string;
            name: string;
            query: string;
            columns: ({
                key: string;
                label: string;
                type: "text";
            } | {
                key: string;
                label: string;
                type: "currency";
            })[];
            pagination: boolean;
        };
    };
    static getControlsConfig(): DashboardConfig;
    static getIncidentsConfig(): DashboardConfig;
    static getRisksConfig(): DashboardConfig;
    static addChartToConfig(config: DashboardConfig, chartType: keyof typeof DashboardConfigService.CHART_TEMPLATES, ...args: any[]): DashboardConfig;
    static addMetricToConfig(config: DashboardConfig, metricType: keyof typeof DashboardConfigService.METRIC_TEMPLATES, ...args: any[]): DashboardConfig;
}
