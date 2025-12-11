import { BaseDashboardService, DashboardConfig } from '../shared/base-dashboard.service';
import { DatabaseService } from '../database/database.service';
import { UserFunctionAccessService } from '../shared/user-function-access.service';
export declare class GrcDashboardService extends BaseDashboardService {
    constructor(databaseService: DatabaseService, userFunctionAccess: UserFunctionAccessService);
    getConfig(): DashboardConfig;
    getControlsDashboard(user: any, startDate?: string, endDate?: string, functionId?: string): Promise<any>;
    getFilteredCardData(user: any, cardType: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getTotalControls(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getUnmappedControls(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingPreparerControls(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingCheckerControls(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingReviewerControls(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getPendingAcceptanceControls(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getTestsPendingPreparer(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getTestsPendingChecker(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getTestsPendingReviewer(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getTestsPendingAcceptance(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getUnmappedIcofrControls(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getUnmappedNonIcofrControls(user: any, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByQuarter(user: any, quarter: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByDepartment(user: any, department: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByType(user: any, type: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByLevel(user: any, level: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByFrequency(user: any, frequency: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByRiskResponse(user: any, riskResponse: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByAntiFraud(user: any, antiFraud: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByIcofrStatus(user: any, icofrStatus: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByComponent(user: any, component: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByDepartmentAndKeyControl(user: any, department: string, keyControl: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByProcessAndKeyControl(user: any, process: string, keyControl: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByBusinessUnitAndKeyControl(user: any, businessUnit: string, keyControl: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByAssertion(user: any, assertionName: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByComponentAndIcofrStatus(user: any, component: string, icofrStatus: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    getControlsByFunctionQuarterYear(user: any, functionName: string, quarter: number, year: number, columnType?: string, page?: number, limit?: number, startDate?: string, endDate?: string, functionId?: string): Promise<{
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
    private buildDateFilterForQuery;
}
