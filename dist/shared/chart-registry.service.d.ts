export interface SimpleChartConfig {
    id: string;
    name: string;
    type: 'bar' | 'pie' | 'line' | 'area' | 'scatter';
    sql: string;
    xField?: string;
    yField?: string;
    labelField?: string;
}
export declare class ChartRegistryService {
    private static charts;
    static addChart(config: SimpleChartConfig): void;
    static getChartsForDashboard(dashboardId: string): SimpleChartConfig[];
    static getChart(chartId: string): SimpleChartConfig | undefined;
    static removeChart(chartId: string): void;
    static listCharts(): {
        id: string;
        name: string;
        type: "bar" | "pie" | "line" | "area" | "scatter";
    }[];
}
