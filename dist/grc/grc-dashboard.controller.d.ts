import { GrcDashboardService } from './grc-dashboard.service';
export declare class GrcDashboardController {
    private readonly grcDashboardService;
    constructor(grcDashboardService: GrcDashboardService);
    getControlsDashboard(startDate?: string, endDate?: string): Promise<any>;
    getTotalControls(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getUnmappedControls(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getPendingPreparerControls(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getPendingCheckerControls(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getPendingReviewerControls(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getPendingAcceptanceControls(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getTestsPendingPreparer(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getTestsPendingChecker(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getTestsPendingReviewer(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getTestsPendingAcceptance(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getUnmappedIcofrControls(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getUnmappedNonIcofrControls(page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByQuarter(quarter: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByDepartment(department: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByType(type: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByLevel(level: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByFrequency(frequency: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByRiskResponse(riskResponse: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByAntiFraud(antiFraud: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByIcofrStatus(icofrStatus: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByComponent(component: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByDepartmentAndKeyControl(department: string, keyControl: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByProcessAndKeyControl(process: string, keyControl: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByBusinessUnitAndKeyControl(businessUnit: string, keyControl: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByAssertion(assertionName: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByComponentAndIcofrStatus(component: string, icofrStatus: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
    getControlsByFunctionQuarterYear(functionName: string, quarter: number, year: number, columnType?: string, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
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
