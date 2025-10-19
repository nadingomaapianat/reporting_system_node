import { DatabaseService } from '../database/database.service';
import { BaseDashboardService, DashboardConfig } from '../shared/base-dashboard.service';
export declare class GrcRisksService extends BaseDashboardService {
    protected readonly databaseService: DatabaseService;
    constructor(databaseService: DatabaseService);
    getConfig(): DashboardConfig;
    getRisksDashboard(startDate?: string, endDate?: string): Promise<{
        totalRisks: any;
        allRisks: import("mssql").IRecordSet<any>;
        risksByCategory: import("mssql").IRecordSet<any>;
        risksByEventType: import("mssql").IRecordSet<any>;
        inherentVsResidual: import("mssql").IRecordSet<any>;
        riskLevels: {
            level: string;
            count: any;
        }[];
        riskReductionCount: any;
        riskTrends: import("mssql").IRecordSet<any>;
        newRisks: import("mssql").IRecordSet<any>;
    }>;
    getTotalRisks(page: number, limit: number, startDate?: string, endDate?: string): Promise<{
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
    getHighRisks(page: number, limit: number, startDate?: string, endDate?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        total: any;
        page: number;
        limit: number;
    }>;
    getMediumRisks(page: number, limit: number, startDate?: string, endDate?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        total: any;
        page: number;
        limit: number;
    }>;
    getLowRisks(page: number, limit: number, startDate?: string, endDate?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        total: any;
        page: number;
        limit: number;
    }>;
    getRiskReduction(page: number, limit: number, startDate?: string, endDate?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        total: any;
        page: number;
        limit: number;
    }>;
    getNewRisks(page: number, limit: number, startDate?: string, endDate?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        total: any;
        page: number;
        limit: number;
    }>;
    exportRisks(format: 'pdf' | 'excel', startDate?: string, endDate?: string): Promise<any>;
    private calculateRiskLevels;
}
