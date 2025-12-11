import { GrcKrisService } from './grc-kris.service';
export declare class GrcKrisController {
    private readonly grcKrisService;
    constructor(grcKrisService: GrcKrisService);
    getKrisDashboard(req: any, timeframe?: string, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    exportKris(req: any, format: string, timeframe?: string): Promise<{
        message: string;
        timeframe: string;
        status: string;
    }>;
    getTotalKris(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingPreparerKris(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingCheckerKris(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingReviewerKris(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingAcceptanceKris(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getKrisByStatus(req: any, status: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getKrisByLevel(req: any, level: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    } | {
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getKrisByFunction(req: any, functionName: string, page?: number, limit?: number, startDate?: string, endDate?: string, submissionStatus?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    } | {
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getKrisWithAssessmentsByFunction(req: any, functionName: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    } | {
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getKrisByFrequency(req: any, frequency: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    } | {
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getRisksByKriName(req: any, kriName: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    } | {
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getKrisByMonthYear(req: any, monthYear: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    } | {
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getKriAssessmentsByMonthAndLevel(req: any, monthYear: string, assessmentLevel: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
        data: import("mssql").IRecordSet<any>;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    } | {
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getKrisByOverdueStatus(req: any, overdueStatus: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
