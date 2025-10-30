import { Injectable } from '@nestjs/common';
import { RealtimeService } from '../realtime/realtime.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly databaseService: DatabaseService,
  ) {}

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

  // Dashboard Activity methods
  async createActivityTable() {
    const query = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='dashboard_activity' AND xtype='U')
      CREATE TABLE dashboard_activity (
          id INT IDENTITY(1,1) PRIMARY KEY,
          dashboard_id NVARCHAR(50) NOT NULL,
          user_id NVARCHAR(100) DEFAULT 'default_user',
          last_seen DATETIME2 NOT NULL DEFAULT GETDATE(),
          card_count INT DEFAULT 0,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
      )
    `;
    
    try {
      await this.databaseService.query(query);
      console.log('Dashboard activity table created or already exists');
    } catch (error) {
      console.error('Error creating dashboard_activity table:', error);
    }
  }

  async getDashboardActivities(userId: string = 'default_user') {
    const query = `
      SELECT 
          dashboard_id,
          last_seen,
          card_count,
          updated_at
      FROM dashboard_activity 
      WHERE user_id = @param0
      ORDER BY last_seen DESC
    `;
    
    return await this.databaseService.query(query, [userId]);
  }

  async updateDashboardActivity(dashboardId: string, userId: string = 'default_user', cardCount: number = 0) {
    try {
      // First check if record exists
      const checkQuery = `
        SELECT id FROM dashboard_activity 
        WHERE dashboard_id = @param0 AND user_id = @param1
      `;
      const existing = await this.databaseService.query(checkQuery, [dashboardId, userId]);
      
      if (existing && existing.length > 0) {
        // Update existing record
        const updateQuery = `
          UPDATE dashboard_activity 
          SET last_seen = GETUTCDATE(), 
              card_count = @param0, 
              updated_at = GETUTCDATE()
          WHERE dashboard_id = @param1 AND user_id = @param2
        `;
        await this.databaseService.query(updateQuery, [cardCount, dashboardId, userId]);
      } else {
        // Insert new record
        const insertQuery = `
          INSERT INTO dashboard_activity (dashboard_id, user_id, last_seen, card_count)
          VALUES (@param0, @param1, GETUTCDATE(), @param2)
        `;
        await this.databaseService.query(insertQuery, [dashboardId, userId, cardCount]);
      }
      
      // Return the updated record
      const getQuery = `
        SELECT 
            dashboard_id,
            last_seen,
            card_count,
            updated_at
        FROM dashboard_activity 
        WHERE dashboard_id = @param0 AND user_id = @param1
      `;
      const result = await this.databaseService.query(getQuery, [dashboardId, userId]);
      return result && result.length > 0 ? result[0] : {};
    } catch (error) {
      console.error('Error updating dashboard activity:', error);
      return {};
    }
  }

  async initializeDefaultActivities() {
    const defaultDashboards = [
      { dashboard_id: 'controls', card_count: 6 },
      { dashboard_id: 'incidents', card_count: 7 },
      { dashboard_id: 'kris', card_count: 5 },
      { dashboard_id: 'risks', card_count: 8 }
    ];
    
    for (const dashboard of defaultDashboards) {
      const existing = await this.databaseService.query(
        'SELECT id FROM dashboard_activity WHERE dashboard_id = @param0 AND user_id = @param1',
        [dashboard.dashboard_id, 'default_user']
      );
      
      if (!existing || existing.length === 0) {
        await this.updateDashboardActivity(
          dashboard.dashboard_id,
          'default_user',
          dashboard.card_count
        );
        console.log(`Initialized activity for ${dashboard.dashboard_id}`);
      }
    }
  }
}