import { DatabaseService } from '../database/database.service';
import { UserFunctionAccessService } from '../shared/user-function-access.service';
export declare class GrcIncidentsService {
    private readonly databaseService;
    private readonly userFunctionAccess;
    constructor(databaseService: DatabaseService, userFunctionAccess: UserFunctionAccessService);
    private buildDateFilter;
    getIncidentsDashboard(user: any, timeframe?: string, startDate?: string, endDate?: string, functionId?: string): Promise<{
        totalIncidents: any;
        pendingPreparer: any;
        pendingChecker: any;
        pendingReviewer: any;
        pendingAcceptance: any;
        incidentsByCategory: {
            category_name: any;
            count: any;
        }[];
        incidentsByEventType: {
            event_type: any;
            incident_count: any;
        }[];
        incidentsByFinancialImpact: {
            financial_impact_name: any;
            incident_count: any;
        }[];
        incidentsByStatus: {
            status: string;
            count: any;
        }[];
        incidentsByStatusDistribution: {
            status_name: any;
            count: any;
        }[];
        incidentsByStatusTable: {
            status: any;
            count: any;
        }[];
        topFinancialImpacts: {
            financial_impact_name: any;
            net_loss: any;
        }[];
        netLossAndRecovery: {
            incident_title: any;
            net_loss: any;
            recovery_amount: any;
            function_name: any;
        }[];
        monthlyTrend: {
            month_year: any;
            incident_count: any;
        }[];
        statusOverview: import("mssql").IRecordSet<any>;
        overallStatuses: import("mssql").IRecordSet<any>;
        incidentsFinancialDetails: {
            title: any;
            rootCause: any;
            function_name: any;
            netLoss: any;
            totalLoss: any;
            recoveryAmount: any;
            grossAmount: any;
            status: any;
        }[];
        incidentsTimeSeries: {
            month: string;
            total_incidents: any;
        }[];
        newIncidentsByMonth: {
            month: string;
            new_incidents: any;
        }[];
        incidentsWithTimeframe: {
            incident_name: any;
            time_frame: any;
        }[];
        incidentsWithFinancialAndFunction: {
            title: any;
            financial_impact_name: any;
            function_name: any;
        }[];
        operationalLossValue: {
            year: any;
            month: any;
            totalLossValue: any;
            incidentCount: any;
        }[];
        atmTheftCount: any;
        avgRecognitionTime: any;
        internalFraudCount: any;
        internalFraudLoss: any;
        externalFraudCount: any;
        externalFraudLoss: any;
        physicalAssetDamageCount: any;
        physicalAssetLoss: any;
        peopleErrorCount: any;
        peopleErrorLoss: any;
        monthlyTrendByType: {
            period: any;
            internalFrauds: any;
            externalFrauds: any;
            physicalAssetDamages: any;
            humanErrors: any;
            atmIssues: any;
            systemErrors: any;
        }[];
        lossByRiskCategory: {
            riskCategory: any;
            incidentCount: any;
            totalLoss: any;
            averageLoss: any;
        }[];
        comprehensiveOperationalLoss: {
            metric: any;
            count: any;
            totalValue: any;
        }[];
    }>;
    exportIncidents(user: any, format: string, timeframe?: string): Promise<{
        message: string;
        timeframe: string;
        status: string;
    }>;
    getTotalIncidents(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingPreparerIncidents(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingCheckerIncidents(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingReviewerIncidents(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingAcceptanceIncidents(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getIncidentsByCategory(user: any, category: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: {
            code: any;
            name: any;
            createdAt: any;
            netLoss: any;
            recoveryAmount: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getIncidentsByEventType(user: any, eventType: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: {
            code: any;
            name: any;
            createdAt: any;
            netLoss: any;
            recoveryAmount: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getIncidentsByFinancialImpact(user: any, financialImpact: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: {
            code: any;
            name: any;
            createdAt: any;
            netLoss: any;
            recoveryAmount: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getIncidentsByStatus(user: any, status: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: {
            code: any;
            name: any;
            createdAt: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getIncidentsByMonthYear(user: any, monthYear: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: {
            code: any;
            name: any;
            createdAt: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getIncidentsBySubCategory(user: any, subCategory: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: {
            code: any;
            name: any;
            createdAt: any;
            netLoss: any;
            recoveryAmount: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getIncidentsWithRecognitionTime(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: {
            code: any;
            name: any;
            occurrence_date: any;
            reported_date: any;
            recognition_time: any;
            recognition_months: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getIncidentsByPeriod(user: any, period: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: {
            code: any;
            name: any;
            createdAt: any;
            netLoss: any;
            recoveryAmount: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getIncidentsByPeriodAndType(user: any, period: string, incidentType: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: {
            code: any;
            name: any;
            createdAt: any;
            netLoss: any;
            recoveryAmount: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getIncidentsByComprehensiveMetric(user: any, metric: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: {
            code: any;
            name: any;
            createdAt: any;
            netLoss: any;
            recoveryAmount: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    private buildDateRangeFilter;
}
