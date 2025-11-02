import { DatabaseService } from '../database/database.service';
export declare class GrcIncidentsService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    private buildDateFilter;
    getIncidentsDashboard(timeframe?: string): Promise<{
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
    }>;
    exportIncidents(format: string, timeframe?: string): Promise<{
        message: string;
        timeframe: string;
        status: string;
    }>;
    getTotalIncidents(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getPendingPreparerIncidents(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getPendingCheckerIncidents(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getPendingReviewerIncidents(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getPendingAcceptanceIncidents(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getIncidentsByCategory(category: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getIncidentsByEventType(eventType: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getIncidentsByFinancialImpact(financialImpact: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    private buildDateRangeFilter;
}
