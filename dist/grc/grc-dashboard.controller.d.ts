import { GrcDashboardService } from './grc-dashboard.service';
export declare class GrcDashboardController {
    private readonly grcDashboardService;
    constructor(grcDashboardService: GrcDashboardService);
    getControlsDashboard(req: any, startDate?: string, endDate?: string, functionId?: string): Promise<any>;
    getTotalControls(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getUnmappedControls(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingPreparerControls(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingCheckerControls(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingReviewerControls(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingAcceptanceControls(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getTestsPendingPreparer(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getTestsPendingChecker(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getTestsPendingReviewer(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getTestsPendingAcceptance(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getUnmappedIcofrControls(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getUnmappedNonIcofrControls(req: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByQuarter(req: any, quarter: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByDepartment(req: any, department: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByType(req: any, type: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByLevel(req: any, level: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByFrequency(req: any, frequency: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByRiskResponse(req: any, riskResponse: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByAntiFraud(req: any, antiFraud: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByIcofrStatus(req: any, icofrStatus: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getFocusPointsByPrinciple(principle: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByComponent(req: any, component: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getFocusPointsByComponent(component: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getActionPlansByStatus(status: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByDepartmentAndKeyControl(req: any, department: string, keyControl: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByProcessAndKeyControl(req: any, process: string, keyControl: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByBusinessUnitAndKeyControl(req: any, businessUnit: string, keyControl: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByAssertion(req: any, assertionName: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByComponentAndIcofrStatus(req: any, component: string, icofrStatus: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByFunctionQuarterYear(req: any, functionName: string, quarter: number, year: number, columnType?: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
}
