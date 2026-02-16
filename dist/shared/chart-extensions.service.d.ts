export declare class ChartExtensionsService {
    static addNewChartsToControls(): {
        charts: import("./base-dashboard.service").ChartConfig[];
        name: string;
        tableName: string;
        dateField?: string;
        metrics: import("./base-dashboard.service").MetricConfig[];
        tables: import("./base-dashboard.service").TableConfig[];
    };
    static addNewMetricsToControls(): {
        metrics: import("./base-dashboard.service").MetricConfig[];
        name: string;
        tableName: string;
        dateField?: string;
        charts: import("./base-dashboard.service").ChartConfig[];
        tables: import("./base-dashboard.service").TableConfig[];
    };
    static addNewTablesToControls(): {
        tables: (import("./base-dashboard.service").TableConfig | {
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
        name: string;
        tableName: string;
        dateField?: string;
        metrics: import("./base-dashboard.service").MetricConfig[];
        charts: import("./base-dashboard.service").ChartConfig[];
    };
    static getEnhancedControlsConfig(): {
        metrics: import("./base-dashboard.service").MetricConfig[];
        tables: (import("./base-dashboard.service").TableConfig | {
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
        charts: import("./base-dashboard.service").ChartConfig[];
        name: string;
        tableName: string;
        dateField?: string;
    };
}
