import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealtimeService } from './realtime.service';
export declare class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly realtimeService;
    server: Server;
    constructor(realtimeService: RealtimeService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinDashboard(client: Socket, data: {
        dashboardId: string;
    }): void;
    handleLeaveDashboard(client: Socket, data: {
        dashboardId: string;
    }): void;
    handleSubscribeMetrics(client: Socket, data: {
        metrics: string[];
    }): void;
    handleUnsubscribeMetrics(client: Socket, data: {
        metrics: string[];
    }): void;
    handleGetRealtimeData(client: Socket): Promise<void>;
    handleGetHistoricalData(client: Socket, data: {
        metric: string;
        hours?: number;
    }): Promise<void>;
    handleGetDashboardAnalytics(client: Socket, data: {
        dashboardId: string;
    }): Promise<void>;
    broadcastToDashboard(dashboardId: string, event: string, data: any): void;
    broadcastToClients(clientIds: string[], event: string, data: any): void;
    broadcastToAllClients(event: string, data: any): void;
}
