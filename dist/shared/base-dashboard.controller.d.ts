import { BaseDashboardService } from './base-dashboard.service';
export declare abstract class BaseDashboardController {
    protected readonly dashboardService: BaseDashboardService;
    constructor(dashboardService: BaseDashboardService);
    getDashboard(startDate?: string, endDate?: string): Promise<any>;
    getCardData(cardType: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
