import { BaseDashboardService } from './base-dashboard.service';
export declare abstract class BaseDashboardController {
    protected readonly dashboardService: BaseDashboardService;
    constructor(dashboardService: BaseDashboardService);
    getDashboard(req: any, startDate?: string, endDate?: string, functionId?: string): Promise<any>;
    getCardData(req: any, cardType: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
}
