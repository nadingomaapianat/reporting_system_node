import { RealtimeService } from '../realtime/realtime.service';
export declare class DashboardService {
    private readonly realtimeService;
    constructor(realtimeService: RealtimeService);
    getConnectedClientsCount(): number;
    getCurrentMetrics(): {
        timestamp: string;
        activeUsers: number;
        systemStatus: string;
        uptime: number;
    };
    getActiveAlerts(): {
        id: string;
        type: string;
        title: string;
        message: string;
        timestamp: string;
        severity: string;
        acknowledged: boolean;
        source: string;
    }[];
    acknowledgeAlert(alertId: string): {
        success: boolean;
        message: string;
        timestamp: string;
    };
    getSystemHealth(): {
        timestamp: string;
        services: {
            api: string;
            database: string;
            cache: string;
            queue: string;
            storage: string;
        };
        resources: {
            cpu: {
                usage: string;
                status: string;
            };
            memory: {
                usage: string;
                status: string;
            };
            disk: {
                usage: string;
                status: string;
            };
            network: {
                latency: string;
                status: string;
            };
        };
    };
    getNotifications(limit?: number): {
        id: string;
        type: string;
        title: string;
        message: string;
        timestamp: string;
        read: boolean;
        source: string;
    }[];
    markNotificationAsRead(notificationId: string): {
        success: boolean;
        message: string;
        timestamp: string;
    };
    getWidgetData(widgetId: string): {
        widgetId: string;
        data: {
            message: string;
        };
        timestamp: string;
    };
    refreshWidget(widgetId: string): {
        widgetId: string;
        data: {
            message: string;
        };
        timestamp: string;
    };
}
