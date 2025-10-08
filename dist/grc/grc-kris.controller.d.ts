import { GrcKrisService } from './grc-kris.service';
export declare class GrcKrisController {
    private readonly grcKrisService;
    constructor(grcKrisService: GrcKrisService);
    getKrisDashboard(timeframe?: string): Promise<{
        totalKris: any;
        pendingPreparer: any;
        pendingChecker: any;
        pendingReviewer: any;
        pendingAcceptance: any;
        approved: any;
        krisByStatus: {
            status: any;
            count: any;
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
    }>;
    exportKris(format: string, timeframe?: string): Promise<{
        message: string;
        timeframe: string;
        status: string;
    }>;
}
