import { DatabaseService } from '../database/database.service';
import { UserFunctionAccessService } from './user-function-access.service';
export declare class AutoDashboardService {
    private readonly databaseService;
    private readonly userFunctionAccess?;
    constructor(databaseService: DatabaseService, userFunctionAccess?: UserFunctionAccessService);
    getDashboardData(user: any, startDate?: string, endDate?: string, functionId?: string): Promise<any>;
    getChartData(user: any, chartId: string, startDate?: string, endDate?: string, functionId?: string): Promise<{
        name: any;
        value: any;
        label: any;
    }[]>;
    private buildQuery;
}
