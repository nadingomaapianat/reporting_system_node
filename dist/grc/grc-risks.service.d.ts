import { DatabaseService } from '../database/database.service';
import { BaseDashboardService, DashboardConfig } from '../shared/base-dashboard.service';
import { UserFunctionAccessService } from '../shared/user-function-access.service';
export declare class GrcRisksService extends BaseDashboardService {
    protected readonly databaseService: DatabaseService;
    constructor(databaseService: DatabaseService, userFunctionAccess: UserFunctionAccessService);
    getConfig(): DashboardConfig;
    getRisksDashboard(user: any, startDate?: string, endDate?: string, functionId?: string): Promise<{
        totalRisks: any;
        allRisks: any[];
        risksByCategory: import("mssql").IRecordSet<any>;
        risksByEventType: import("mssql").IRecordSet<any>;
        riskLevels: {
            level: string;
            count: any;
        }[];
        riskReductionCount: any;
        newRisks: import("mssql").IRecordSet<any>;
        risksPerDepartment: import("mssql").IRecordSet<any>;
        risksPerBusinessProcess: any[];
        createdDeletedRisksPerQuarter: import("mssql").IRecordSet<any>;
        quarterlyRiskCreationTrends: import("mssql").IRecordSet<any>;
        inherentResidualRiskComparison: any[];
        riskApprovalStatusDistribution: import("mssql").IRecordSet<any>;
        highResidualRiskOverview: any[];
        riskDistributionByFinancialImpact: import("mssql").IRecordSet<any>;
        risksAndControlsCount: any[];
        controlsAndRiskCount: any[];
        risksDetails: any[];
    }>;
    getTotalRisks(user: any, page: number, limit: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    } | {
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getFilteredCardData(user: any, cardType: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    } | {
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getHighRisks(user: any, page: number, limit: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            total: any;
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getMediumRisks(user: any, page: number, limit: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            total: any;
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getLowRisks(user: any, page: number, limit: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            total: any;
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getRiskReduction(user: any, page: number, limit: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            total: any;
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getNewRisks(user: any, page: number, limit: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            total: any;
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    exportRisks(user: any, format: 'pdf' | 'excel', startDate?: string, endDate?: string, functionId?: string): Promise<any>;
    private calculateRiskLevels;
    getRisksByCategory(user: any, category: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getRisksByEventType(user: any, eventType: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getRisksByQuarter(user: any, quarter: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getRisksByApprovalStatus(user: any, approvalStatus: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getRisksByFinancialImpact(user: any, financialImpact: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getRisksByFunction(user: any, functionName: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getRisksByBusinessProcess(user: any, processName: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getRisksByName(user: any, riskName: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getRisksByControlName(user: any, controlName: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getRisksForComparison(user: any, riskName: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
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
