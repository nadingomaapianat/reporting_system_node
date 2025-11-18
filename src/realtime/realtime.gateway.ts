import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: {
    origin: ['https://reporting-system-frontend.pianat.ai', 'http://localhost:3002'],
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly realtimeService: RealtimeService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.realtimeService.addClient(client);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.realtimeService.removeClient(client);
  }

  @SubscribeMessage('join_dashboard')
  handleJoinDashboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { dashboardId: string },
  ) {
    client.join(`dashboard_${data.dashboardId}`);
    this.realtimeService.joinDashboard(client, data.dashboardId);
    console.log(`Client ${client.id} joined dashboard ${data.dashboardId}`);
  }

  @SubscribeMessage('leave_dashboard')
  handleLeaveDashboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { dashboardId: string },
  ) {
    client.leave(`dashboard_${data.dashboardId}`);
    this.realtimeService.leaveDashboard(client, data.dashboardId);
    console.log(`Client ${client.id} left dashboard ${data.dashboardId}`);
  }

  @SubscribeMessage('subscribe_metrics')
  handleSubscribeMetrics(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { metrics: string[] },
  ) {
    this.realtimeService.subscribeToMetrics(client, data.metrics);
  }

  @SubscribeMessage('unsubscribe_metrics')
  handleUnsubscribeMetrics(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { metrics: string[] },
  ) {
    this.realtimeService.unsubscribeFromMetrics(client, data.metrics);
  }

  @SubscribeMessage('get_realtime_data')
  async handleGetRealtimeData(@ConnectedSocket() client: Socket) {
    const data = await this.realtimeService.getRealtimeData();
    client.emit('realtime_data_response', data);
  }

  @SubscribeMessage('get_historical_data')
  async handleGetHistoricalData(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { metric: string; hours?: number },
  ) {
    const historicalData = await this.realtimeService.getHistoricalData(
      data.metric,
      data.hours || 24,
    );
    client.emit('historical_data_response', {
      metric: data.metric,
      data: historicalData,
    });
  }

  @SubscribeMessage('get_dashboard_analytics')
  async handleGetDashboardAnalytics(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { dashboardId: string },
  ) {
    const analytics = await this.realtimeService.getDashboardAnalytics(data.dashboardId);
    client.emit('dashboard_analytics_response', analytics);
  }

  // Method to broadcast real-time updates
  broadcastToDashboard(dashboardId: string, event: string, data: any) {
    this.server.to(`dashboard_${dashboardId}`).emit(event, data);
  }

  // Method to broadcast to specific clients
  broadcastToClients(clientIds: string[], event: string, data: any) {
    if (clientIds.length === 0) {
      // If no specific clients, broadcast to all
      this.server.emit(event, data);
    } else {
      clientIds.forEach(clientId => {
        this.server.to(clientId).emit(event, data);
      });
    }
  }

  // Method to broadcast to all connected clients
  broadcastToAllClients(event: string, data: any) {
    this.server.emit(event, data);
  }
}
