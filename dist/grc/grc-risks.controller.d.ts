import { GrcRisksService } from './grc-risks.service';
export declare class GrcRisksController {
    private readonly grcRisksService;
    constructor(grcRisksService: GrcRisksService);
    getRisksDashboard(req: any, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getTotalRisks(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getCard(req: any, cardType: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getCardByParam(req: any, cardType: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getHighRisks(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getMediumRisks(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getLowRisks(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getRiskReduction(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getNewRisks(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getRisksByCategory(req: any, category: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getRisksByEventType(req: any, eventType: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getRisksByQuarter(req: any, quarter: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksByApprovalStatus(req: any, approvalStatus: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getRisksByFinancialImpact(req: any, financialImpact: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getRisksByFunction(req: any, functionName: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getRisksByBusinessProcess(req: any, processName: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getRisksByName(req: any, riskName: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksByControlName(req: any, controlName: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getRisksForComparison(req: any, riskName: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
