import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('api/dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('Dashboard', ['show'])
  @Get('status')
  getDashboardStatus() {
    return {
      status: 'active',
      connectedClients: this.dashboardService.getConnectedClientsCount(),
      lastUpdate: new Date().toISOString(),
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('Dashboard', ['show'])
  @Get('metrics')
  getCurrentMetrics() {
    return this.dashboardService.getCurrentMetrics();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('Dashboard', ['show'])
  @Get('alerts')
  getActiveAlerts() {
    return this.dashboardService.getActiveAlerts();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('Dashboard', ['edit'])
  @Post('alerts/acknowledge')
  acknowledgeAlert(@Body() body: { alertId: string }) {
    return this.dashboardService.acknowledgeAlert(body.alertId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('Dashboard', ['show'])
  @Get('system-health')
  getSystemHealth() {
    return this.dashboardService.getSystemHealth();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('Dashboard', ['show'])
  @Get('notifications')
  getNotifications(@Query('limit') limit: number = 10) {
    return this.dashboardService.getNotifications(limit);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('Dashboard', ['edit'])
  @Post('notifications/mark-read')
  markNotificationAsRead(@Body() body: { notificationId: string }) {
    return this.dashboardService.markNotificationAsRead(body.notificationId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('Dashboard', ['show'])
  @Get('widgets/:widgetId/data')
  getWidgetData(@Param('widgetId') widgetId: string) {
    return this.dashboardService.getWidgetData(widgetId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('Dashboard', ['edit'])
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('Dashboard', ['show'])
  @Get('activity')
  async getDashboardActivities(@Query('user_id') userId: string = 'default_user') {
    // Initialize table if it doesn't exist
    await this.dashboardService.createActivityTable();
    
    // Initialize default activities if none exist
    await this.dashboardService.initializeDefaultActivities();
    
    // Get activities from database
    return await this.dashboardService.getDashboardActivities(userId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('Dashboard', ['edit'])
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
