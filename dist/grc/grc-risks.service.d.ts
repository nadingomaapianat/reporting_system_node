import { DatabaseService } from '../database/database.service';
export declare class GrcRisksService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    getRisksDashboard(startDate?: string, endDate?: string): Promise<{
        totalRisks: any;
        risksByCategory: {
            name: any;
            value: any;
        }[];
        risksByEventType: {
            name: any;
            value: any;
        }[];
        inherentVsResidual: any[];
        riskLevels: {
            level: string;
            count: number;
        }[];
        riskTrends: {
            month: any;
            total_risks: any;
            new_risks: any;
            mitigated_risks: any;
        }[];
    }>;
    getTotalRisks(page: number, limit: number, startDate?: string, endDate?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        total: any;
        page: number;
        limit: number;
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
    private buildDateFilter;
    private calculateRiskLevels;
}
