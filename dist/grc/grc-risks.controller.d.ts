import { GrcRisksService } from './grc-risks.service';
export declare class GrcRisksController {
    private readonly grcRisksService;
    constructor(grcRisksService: GrcRisksService);
    getRisksDashboard(startDate?: string, endDate?: string): Promise<{
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
    getTotalRisks(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getCard(cardType: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getCardByParam(cardType: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getHighRisks(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getMediumRisks(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getLowRisks(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRiskReduction(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getNewRisks(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksByCategory(category: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksByEventType(eventType: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksByQuarter(quarter: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksByApprovalStatus(approvalStatus: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksByFinancialImpact(financialImpact: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksByFunction(functionName: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksByBusinessProcess(processName: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksByName(riskName: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksByControlName(controlName: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksForComparison(riskName: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
