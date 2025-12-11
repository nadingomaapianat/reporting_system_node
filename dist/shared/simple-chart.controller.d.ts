import { SimpleChartConfig } from './chart-registry.service';
import { AutoDashboardService } from './auto-dashboard.service';
export declare class SimpleChartController {
    private readonly autoDashboardService;
    constructor(autoDashboardService: AutoDashboardService);
    getDashboard(req: any, startDate?: string, endDate?: string, functionId?: string): Promise<any>;
    getChart(req: any, chartId: string, startDate?: string, endDate?: string, functionId?: string): Promise<{
        name: any;
        value: any;
        label: any;
    }[]>;
    addChart(chartConfig: SimpleChartConfig): Promise<{
        success: boolean;
        message: string;
        chartId: string;
    }>;
    listCharts(): Promise<{
        id: string;
        name: string;
        type: "bar" | "pie" | "line" | "area" | "scatter";
    }[]>;
    removeChart(chartId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
