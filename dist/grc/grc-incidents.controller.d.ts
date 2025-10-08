import { GrcIncidentsService } from './grc-incidents.service';
export declare class GrcIncidentsController {
    private readonly grcIncidentsService;
    constructor(grcIncidentsService: GrcIncidentsService);
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
        incidentsByStatus: {
            status: any;
            count: any;
        }[];
        topFinancialImpacts: {
            incident_id: any;
            financial_impact_name: any;
            function_name: any;
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
            total_loss: any;
        }[];
    }>;
    exportIncidents(format: string, timeframe?: string): Promise<{
        message: string;
        timeframe: string;
        status: string;
    }>;
}
