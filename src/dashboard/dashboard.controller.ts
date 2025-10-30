import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Controller('api/dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Get('status')
  getDashboardStatus() {
    return {
      status: 'active',
      connectedClients: this.dashboardService.getConnectedClientsCount(),
      lastUpdate: new Date().toISOString(),
    };
  }

  @Get('metrics')
  getCurrentMetrics() {
    return this.dashboardService.getCurrentMetrics();
  }

  @Get('alerts')
  getActiveAlerts() {
    return this.dashboardService.getActiveAlerts();
  }

  @Post('alerts/acknowledge')
  acknowledgeAlert(@Body() body: { alertId: string }) {
    return this.dashboardService.acknowledgeAlert(body.alertId);
  }

  @Get('system-health')
  getSystemHealth() {
    return this.dashboardService.getSystemHealth();
  }

  @Get('notifications')
  getNotifications(@Query('limit') limit: number = 10) {
    return this.dashboardService.getNotifications(limit);
  }

  @Post('notifications/mark-read')
  markNotificationAsRead(@Body() body: { notificationId: string }) {
    return this.dashboardService.markNotificationAsRead(body.notificationId);
  }

  @Get('widgets/:widgetId/data')
  getWidgetData(@Param('widgetId') widgetId: string) {
    return this.dashboardService.getWidgetData(widgetId);
  }

  @Post('widgets/:widgetId/refresh')
  refreshWidget(@Param('widgetId') widgetId: string) {
    const data = this.dashboardService.refreshWidget(widgetId);
    
    // Broadcast update to all connected clients
    this.realtimeGateway.broadcastToClients([], 'widget_refresh', {
      widgetId,
      data,
      timestamp: new Date().toISOString(),
    });
    
    return data;
  }

  // Dashboard Activity endpoints
  @Get('activity')
  async getDashboardActivities(@Query('user_id') userId: string = 'default_user') {
    // Initialize table if it doesn't exist
    await this.dashboardService.createActivityTable();
    
    // Initialize default activities if none exist
    await this.dashboardService.initializeDefaultActivities();
    
    // Get activities from database
    return await this.dashboardService.getDashboardActivities(userId);
  }

  @Post('activity')
  async updateDashboardActivity(@Body() body: { dashboard_id: string; user_id?: string; card_count?: number }) {
    const { dashboard_id, user_id = 'default_user', card_count = 0 } = body;
    
    if (!dashboard_id) {
      throw new Error('dashboard_id is required');
    }
    
    // Initialize table if it doesn't exist
    await this.dashboardService.createActivityTable();
    
    // Update activity
    return await this.dashboardService.updateDashboardActivity(dashboard_id, user_id, card_count);
  }
}
