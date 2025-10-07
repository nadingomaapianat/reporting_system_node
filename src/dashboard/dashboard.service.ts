import { Injectable } from '@nestjs/common';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class DashboardService {
  constructor(private readonly realtimeService: RealtimeService) {}

  getConnectedClientsCount(): number {
    return this.realtimeService.getConnectedClientsCount();
  }

  getCurrentMetrics() {
    return {
      timestamp: new Date().toISOString(),
      activeUsers: this.realtimeService.getConnectedClientsCount(),
      systemStatus: 'operational',
      uptime: process.uptime(),
    };
  }

  getActiveAlerts() {
    return [
      {
        id: 'system_health',
        type: 'info',
        title: 'System Status',
        message: 'All systems operational',
        timestamp: new Date().toISOString(),
        severity: 'low',
        acknowledged: true,
        source: 'system',
      }
    ];
  }

  acknowledgeAlert(alertId: string) {
    return {
      success: true,
      message: `Alert ${alertId} acknowledged`,
      timestamp: new Date().toISOString(),
    };
  }

  getSystemHealth() {
    return {
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        database: 'healthy',
        cache: 'healthy',
        queue: 'healthy',
        storage: 'healthy',
      },
      resources: {
        cpu: {
          usage: '25.5',
          status: 'healthy',
        },
        memory: {
          usage: '45.2',
          status: 'healthy',
        },
        disk: {
          usage: '15.8',
          status: 'healthy',
        },
        network: {
          latency: '8.2',
          status: 'healthy',
        },
      },
    };
  }

  getNotifications(limit: number = 10) {
    return [
      {
        id: 'system_startup',
        type: 'info',
        title: 'System Started',
        message: 'Dashboard system is running',
        timestamp: new Date().toISOString(),
        read: true,
        source: 'system',
      }
    ].slice(0, limit);
  }

  markNotificationAsRead(notificationId: string) {
    return {
      success: true,
      message: `Notification ${notificationId} marked as read`,
      timestamp: new Date().toISOString(),
    };
  }

  getWidgetData(widgetId: string) {
    return {
      widgetId,
      data: { message: 'Widget data not implemented' },
      timestamp: new Date().toISOString(),
    };
  }

  refreshWidget(widgetId: string) {
    return {
      widgetId,
      data: { message: 'Widget refreshed' },
      timestamp: new Date().toISOString(),
    };
  }
}