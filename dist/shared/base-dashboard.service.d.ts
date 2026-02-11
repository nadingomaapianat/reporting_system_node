import { DatabaseService } from '../database/database.service';
import { UserFunctionAccessService } from './user-function-access.service';
export interface DashboardConfig {
    name: string;
    tableName: string;
    dateField?: string;
    metrics: MetricConfig[];
    charts: ChartConfig[];
    tables: TableConfig[];
}
export interface MetricConfig {
    id: string;
    name: string;
    query: string;
    color: string;
    icon: string;
    changeQuery?: string;
}
export interface ChartConfig {
    id: string;
    name: string;
    type: 'bar' | 'pie' | 'line' | 'area' | 'scatter';
    query: string;
    xField: string;
    yField: string;
    labelField?: string;
}
export interface TableConfig {
    id: string;
    name: string;
    query: string;
    columns: ColumnConfig[];
    pagination?: boolean;
}
export interface ColumnConfig {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'status' | 'currency' | 'boolean';
    render?: (value: any) => any;
}
export declare abstract class BaseDashboardService {
    protected readonly databaseService: DatabaseService;
    protected readonly userFunctionAccess?: UserFunctionAccessService;
    constructor(databaseService: DatabaseService, userFunctionAccess?: UserFunctionAccessService);
    abstract getConfig(): DashboardConfig;
    getDashboardData(user: any, startDate?: string, endDate?: string, functionId?: string): Promise<any>;
    private getMetricsData;
    private getChartsData;
    private getTablesData;
    private isValidDateString;
    protected buildDateFilter(startDate?: string, endDate?: string, dateField?: string): string;
    private calculateChange;
    private formatValue;
    getCardData(user: any, cardType: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    protected getDefaultLimit(): number;
    protected clampLimit(limit?: number): number;
}
