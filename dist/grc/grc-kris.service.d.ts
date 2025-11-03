import { DatabaseService } from '../database/database.service';
export declare class GrcKrisService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    private buildDateFilter;
    getKrisDashboard(timeframe?: string): Promise<{
        totalKris: number;
        pendingPreparer: number;
        pendingChecker: number;
        pendingReviewer: number;
        pendingAcceptance: number;
        approved: number;
        krisByStatus: {
            status: string;
            count: number;
        }[];
        krisByLevel: {
            level: any;
            count: any;
        }[];
        breachedKRIsByDepartment: {
            function_name: any;
            breached_count: any;
        }[];
        kriHealth: {
            kriName: any;
            status: any;
            kri_level: any;
            function_name: any;
            threshold: any;
            frequency: any;
        }[];
        kriAssessmentCount: {
            function_name: any;
            assessment_count: any;
        }[];
        kriMonthlyAssessment: {
            month: string;
            assessment: any;
            count: any;
        }[];
        newlyCreatedKrisPerMonth: {
            month: string;
            count: any;
        }[];
        deletedKrisPerMonth: {
            month: string;
            count: any;
        }[];
        kriOverdueStatusCounts: {
            status: any;
            count: any;
        }[];
        overdueKrisByDepartment: {
            kriCode: any;
            kriName: any;
            function_name: any;
        }[];
        allKrisSubmittedByFunction: {
            function_name: any;
            all_submitted: any;
            total_kris: any;
            submitted_kris: any;
        }[];
        kriCountsByMonthYear: {
            month_year: any;
            month_name: any;
            year: any;
            kri_count: any;
        }[];
        kriCountsByFrequency: {
            frequency: any;
            count: any;
        }[];
        kriRisksByKriName: {
            kriName: any;
            count: any;
        }[];
        kriRiskRelationships: {
            kri_code: any;
            kri_name: any;
            risk_code: any;
            risk_name: any;
        }[];
        kriWithoutLinkedRisks: {
            kriName: any;
            kriCode: any;
        }[];
        kriStatus: {
            code: any;
            kri_name: any;
            function_name: any;
            status: any;
        }[];
        activeKrisDetails: {
            kriName: any;
            combined_status: any;
            assignedPersonId: any;
            addedBy: any;
            status: any;
            frequency: any;
            threshold: any;
            high_from: any;
            medium_from: any;
            low_from: any;
            function_name: any;
        }[];
    } | {
        totalKris: number;
        pendingPreparer: number;
        pendingChecker: number;
        pendingReviewer: number;
        pendingAcceptance: number;
        approved: number;
        krisByStatus: any[];
        krisByLevel: any[];
        breachedKRIsByDepartment: any[];
        kriHealth: any[];
        kriAssessmentCount: any[];
        kriMonthlyAssessment?: undefined;
        newlyCreatedKrisPerMonth?: undefined;
        deletedKrisPerMonth?: undefined;
        kriOverdueStatusCounts?: undefined;
        overdueKrisByDepartment?: undefined;
        allKrisSubmittedByFunction?: undefined;
        kriCountsByMonthYear?: undefined;
        kriCountsByFrequency?: undefined;
        kriRisksByKriName?: undefined;
        kriRiskRelationships?: undefined;
        kriWithoutLinkedRisks?: undefined;
        kriStatus?: undefined;
        activeKrisDetails?: undefined;
    }>;
    getTotalKris(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getPendingPreparerKris(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getPendingCheckerKris(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getPendingReviewerKris(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getPendingAcceptanceKris(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    exportKris(format: string, timeframe?: string): Promise<{
        message: string;
        timeframe: string;
        status: string;
    }>;
    getKrisByStatus(status: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getKrisByLevel(level: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getKrisByFunction(functionName: string, page?: number, limit?: number, startDate?: string, endDate?: string, submissionStatus?: string): Promise<{
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
    getKrisWithAssessmentsByFunction(functionName: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getKrisByFrequency(frequency: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getRisksByKriName(kriName: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getKrisByMonthYear(monthYear: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getKriAssessmentsByMonthAndLevel(monthYear: string, assessmentLevel: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getKrisByOverdueStatus(overdueStatus: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
}
