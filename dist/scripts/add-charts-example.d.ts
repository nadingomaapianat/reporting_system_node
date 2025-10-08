declare function addChartsUsingTemplates(): import("../shared/base-dashboard.service").DashboardConfig;
declare function addCustomCharts(): {
    charts: import("../shared/base-dashboard.service").ChartConfig[];
    name: string;
    tableName: string;
    dateField?: string;
    metrics: import("../shared/base-dashboard.service").MetricConfig[];
    tables: import("../shared/base-dashboard.service").TableConfig[];
};
declare function useEnhancedConfiguration(): {
    metrics: import("../shared/base-dashboard.service").MetricConfig[];
    tables: (import("../shared/base-dashboard.service").TableConfig | {
        id: string;
        name: string;
        query: string;
        columns: {
            key: string;
            label: string;
            type: string;
        }[];
        pagination: boolean;
    })[];
    charts: import("../shared/base-dashboard.service").ChartConfig[];
    name: string;
    tableName: string;
    dateField?: string;
};
export declare class ExampleDashboardService {
    getConfig(): import("../shared/base-dashboard.service").DashboardConfig;
}
declare function addChartsToIncidentsDashboard(): import("../shared/base-dashboard.service").DashboardConfig;
declare function addChartsToRisksDashboard(): {
    charts: import("../shared/base-dashboard.service").ChartConfig[];
    name: string;
    tableName: string;
    dateField?: string;
    metrics: import("../shared/base-dashboard.service").MetricConfig[];
    tables: import("../shared/base-dashboard.service").TableConfig[];
};
export declare const ChartExamples: {
    addChartsUsingTemplates: typeof addChartsUsingTemplates;
    addCustomCharts: typeof addCustomCharts;
    useEnhancedConfiguration: typeof useEnhancedConfiguration;
    addChartsToIncidentsDashboard: typeof addChartsToIncidentsDashboard;
    addChartsToRisksDashboard: typeof addChartsToRisksDashboard;
};
export {};
