import { DatabaseService } from '../database/database.service';
export declare class AutoDashboardService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    getDashboardData(startDate?: string, endDate?: string): Promise<any>;
    getChartData(chartId: string, startDate?: string, endDate?: string): Promise<{
        name: any;
        value: any;
        label: any;
    }[]>;
    private buildQuery;
}
