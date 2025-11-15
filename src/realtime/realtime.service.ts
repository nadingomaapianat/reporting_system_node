import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createClient, RedisClientType } from 'redis';
import axios from 'axios';

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private clients: Map<string, Socket> = new Map();
  private metricSubscriptions: Map<string, Set<string>> = new Map();
  private dashboardRooms: Map<string, Set<string>> = new Map();
  private historicalData: Map<string, any[]> = new Map();
  private alertThresholds: Map<string, { min: number; max: number }> = new Map();
  private redisClient: RedisClientType | null = null;
  private redisAvailable: boolean = false;
  
  constructor(private configService: ConfigService) {
    this.initializeThresholds();
    this.initializeHistoricalData();
  }

  async onModuleInit() {
    await this.connectRedis();
  }

  async onModuleDestroy() {
    await this.disconnectRedis();
  }

  private async connectRedis() {
    try {
      const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
      const redisPort = parseInt(this.configService.get<string>('REDIS_PORT') || '6379', 10);

      this.redisClient = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.warn('Redis reconnection attempts exceeded, falling back to local cache');
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.redisClient.on('error', (err) => {
        this.logger.warn(`Redis connection error: ${err.message}`);
        this.redisAvailable = false;
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Redis client connecting...');
      });

      this.redisClient.on('ready', () => {
        this.logger.log(`Redis connected successfully to ${redisHost}:${redisPort}`);
        this.redisAvailable = true;
      });

      this.redisClient.on('reconnecting', () => {
        this.logger.debug('Redis reconnecting...');
        this.redisAvailable = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      this.logger.warn(`Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.logger.warn('Falling back to local in-memory caching');
      this.redisAvailable = false;
      this.redisClient = null;
    }
  }

  private async disconnectRedis() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        this.logger.log('Redis connection closed');
      } catch (error) {
        this.logger.error(`Error closing Redis connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      this.redisClient = null;
      this.redisAvailable = false;
    }
  }

  addClient(client: Socket) {
    this.clients.set(client.id, client);
    this.logger.log(`Client connected: ${client.id}. Total clients: ${this.clients.size}`);
  }

  removeClient(client: Socket) {
    this.clients.delete(client.id);
    this.metricSubscriptions.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}. Total clients: ${this.clients.size}`);
  }

  joinDashboard(client: Socket, dashboardId: string) {
    if (!this.dashboardRooms.has(dashboardId)) {
      this.dashboardRooms.set(dashboardId, new Set());
    }
    this.dashboardRooms.get(dashboardId)?.add(client.id);
    this.logger.log(`Client ${client.id} joined dashboard ${dashboardId}`);
  }

  leaveDashboard(client: Socket, dashboardId: string) {
    this.dashboardRooms.get(dashboardId)?.delete(client.id);
    this.logger.log(`Client ${client.id} left dashboard ${dashboardId}`);
  }

  private initializeThresholds() {
    this.alertThresholds.set('cpu', { min: 0, max: 80 });
    this.alertThresholds.set('memory', { min: 0, max: 85 });
    this.alertThresholds.set('disk', { min: 0, max: 90 });
    this.alertThresholds.set('response_time', { min: 0, max: 2000 });
    this.alertThresholds.set('error_rate', { min: 0, max: 5 });
  }

  private initializeHistoricalData() {
    const metrics = ['sales', 'users', 'revenue', 'conversion_rate', 'cpu', 'memory', 'disk'];
    metrics.forEach(metric => {
      this.historicalData.set(metric, []);
    });
  }

  subscribeToMetrics(client: Socket, metrics: string[]) {
    this.metricSubscriptions.set(client.id, new Set(metrics));
  }

  unsubscribeFromMetrics(client: Socket, metrics: string[]) {
    const currentSubs = this.metricSubscriptions.get(client.id) || new Set();
    metrics.forEach(metric => currentSubs.delete(metric));
    this.metricSubscriptions.set(client.id, currentSubs);
  }

  // Enhanced real-time data updates with intelligent monitoring
  @Cron(CronExpression.EVERY_5_SECONDS)
  async generateRealTimeData() {
    try {
      const realTimeData = {
        timestamp: new Date().toISOString(),
        metrics: {
          activeUsers: this.generateRealisticMetric('activeUsers', 500, 1500),
          sales: this.generateRealisticMetric('sales', 5000, 15000),
          revenue: this.generateRealisticMetric('revenue', 25000, 75000),
          conversionRate: parseFloat(this.generateRealisticMetric('conversionRate', 2, 8).toFixed(2)),
          pageViews: this.generateRealisticMetric('pageViews', 2000, 8000),
          bounceRate: parseFloat(this.generateRealisticMetric('bounceRate', 30, 60).toFixed(2)),
          responseTime: this.generateRealisticMetric('responseTime', 100, 500),
          errorRate: parseFloat(this.generateRealisticMetric('errorRate', 0, 3).toFixed(2)),
        },
        alerts: await this.generateIntelligentAlerts(),
        systemHealth: this.getAdvancedSystemHealth(),
        trends: this.calculateTrends(),
        predictions: this.generatePredictions(),
      };

      // Store historical data
      this.storeHistoricalData(realTimeData.metrics);

      // Cache in Redis
      await this.cacheRealtimeData(realTimeData);

      // Broadcast to all connected clients
      this.broadcastToAllClients('realtime_update', realTimeData);

      // Broadcast to specific dashboard rooms
      this.broadcastToDashboardRooms('realtime_update', realTimeData);

    } catch (error) {
      this.logger.error('Error generating real-time data:', error);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  generateChartData() {
    const chartData = {
      timestamp: new Date().toISOString(),
      salesTrend: this.generateSalesTrendData(),
      userActivity: this.generateUserActivityData(),
      revenueByCategory: this.generateRevenueByCategoryData(),
    };

    this.broadcastToAllClients('chart_update', chartData);
  }

  private generateAlerts() {
    const alerts = [];
    const alertTypes = ['warning', 'error', 'info', 'success'];
    
    if (Math.random() < 0.3) { // 30% chance of alert
      alerts.push({
        id: Date.now().toString(),
        type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
        message: this.getRandomAlertMessage(),
        timestamp: new Date().toISOString(),
        severity: Math.random() < 0.5 ? 'high' : 'medium',
      });
    }
    
    return alerts;
  }

  private getRandomAlertMessage() {
    const messages = [
      'High traffic detected on server',
      'Database connection pool exhausted',
      'New user registration spike',
      'Payment processing delay detected',
      'Cache hit rate below threshold',
      'Memory usage approaching limit',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getSystemHealth() {
    return {
      cpu: (Math.random() * 30 + 20).toFixed(1),
      memory: (Math.random() * 40 + 30).toFixed(1),
      disk: (Math.random() * 20 + 10).toFixed(1),
      network: (Math.random() * 10 + 5).toFixed(1),
    };
  }

  private generateSalesTrendData() {
    const data = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        time: time.toISOString(),
        value: Math.floor(Math.random() * 1000) + 500,
      });
    }
    
    return data;
  }

  private generateUserActivityData() {
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toISOString().split('T')[0],
        active: Math.floor(Math.random() * 500) + 200,
        new: Math.floor(Math.random() * 100) + 50,
        returning: Math.floor(Math.random() * 300) + 150,
      });
    }
    
    return data;
  }

  private generateRevenueByCategoryData() {
    const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
    return categories.map(category => ({
      category,
      revenue: Math.floor(Math.random() * 50000) + 10000,
      percentage: Math.floor(Math.random() * 30) + 10,
    }));
  }

  private broadcastToAllClients(event: string, data: any) {
    this.clients.forEach((client) => {
      if (client.connected) {
        client.emit(event, data);
      }
    });
  }

  // Get current connected clients count
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  // Get clients subscribed to specific metrics
  getClientsByMetric(metric: string): string[] {
    const clientIds: string[] = [];
    this.metricSubscriptions.forEach((metrics, clientId) => {
      if (metrics.has(metric)) {
        clientIds.push(clientId);
      }
    });
    return clientIds;
  }

  // ==================== ENHANCED REAL-TIME METHODS ====================

  private generateRealisticMetric(metric: string, min: number, max: number): number {
    const historical = this.historicalData.get(metric) || [];
    if (historical.length === 0) {
      return Math.floor(Math.random() * (max - min) + min);
    }

    // Use trend-based generation for more realistic data
    const lastValue = historical[historical.length - 1];
    const trend = this.calculateMetricTrend(historical);
    const volatility = 0.1; // 10% volatility
    
    const baseValue = lastValue * (1 + trend);
    const randomFactor = (Math.random() - 0.5) * volatility;
    const newValue = baseValue * (1 + randomFactor);
    
    return Math.max(min, Math.min(max, Math.floor(newValue)));
  }

  private calculateMetricTrend(historical: number[]): number {
    if (historical.length < 2) return 0;
    
    const recent = historical.slice(-10); // Last 10 values
    const older = historical.slice(-20, -10); // Previous 10 values
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    return (recentAvg - olderAvg) / olderAvg;
  }

  private storeHistoricalData(metrics: any) {
    Object.entries(metrics).forEach(([key, value]) => {
      const historical = this.historicalData.get(key) || [];
      historical.push(value);
      
      // Keep only last 1000 data points
      if (historical.length > 1000) {
        historical.shift();
      }
      
      this.historicalData.set(key, historical);
    });
  }

  private async cacheRealtimeData(data: any) {
    if (this.redisAvailable && this.redisClient) {
      try {
        const cacheKey = 'realtime:latest';
        const cacheTTL = 60; // Cache for 60 seconds
        
        await this.redisClient.setEx(
          cacheKey,
          cacheTTL,
          JSON.stringify(data)
        );
        
        // Also cache individual metrics for historical access
        const metricsKey = 'realtime:metrics';
        await this.redisClient.lPush(metricsKey, JSON.stringify(data));
        await this.redisClient.lTrim(metricsKey, 0, 999); // Keep last 1000 entries
        await this.redisClient.expire(metricsKey, 3600); // Expire after 1 hour
        
        this.logger.debug('Real-time data cached in Redis');
      } catch (error) {
        this.logger.warn(`Failed to cache data in Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
        this.redisAvailable = false;
      }
    } else {
      this.logger.debug('Caching real-time data (Redis not available, using local cache)');
    }
  }

  private async generateIntelligentAlerts() {
    const alerts = [];
    const metrics = this.getCurrentMetrics();
    
    // Check each metric against thresholds
    Object.entries(metrics).forEach(([metric, value]) => {
      const threshold = this.alertThresholds.get(metric);
      const numValue = typeof value === 'number' ? value : 0;
      
      if (threshold && (numValue < threshold.min || numValue > threshold.max)) {
        alerts.push({
          id: `${metric}_${Date.now()}`,
          type: numValue > threshold.max ? 'warning' : 'info',
          metric,
          value: numValue,
          threshold: threshold.max,
          message: this.getAlertMessage(metric, numValue, threshold),
          timestamp: new Date().toISOString(),
          severity: this.calculateAlertSeverity(metric, numValue, threshold),
        });
      }
    });

    // Add trend-based alerts
    const trendAlerts = this.generateTrendAlerts();
    alerts.push(...trendAlerts);

    return alerts;
  }

  private getCurrentMetrics() {
    const metrics: any = {};
    this.historicalData.forEach((data, metric) => {
      if (data.length > 0) {
        metrics[metric] = data[data.length - 1];
      }
    });
    return metrics;
  }

  private getAlertMessage(metric: string, value: number, threshold: { min: number; max: number }): string {
    const messages = {
      cpu: `CPU usage is ${value.toFixed(1)}% (threshold: ${threshold.max}%)`,
      memory: `Memory usage is ${value.toFixed(1)}% (threshold: ${threshold.max}%)`,
      disk: `Disk usage is ${value.toFixed(1)}% (threshold: ${threshold.max}%)`,
      responseTime: `Response time is ${value}ms (threshold: ${threshold.max}ms)`,
      errorRate: `Error rate is ${value.toFixed(2)}% (threshold: ${threshold.max}%)`,
    };
    
    return messages[metric] || `${metric} is ${value} (threshold: ${threshold.max})`;
  }

  private calculateAlertSeverity(metric: string, value: number, threshold: { min: number; max: number }): string {
    const percentage = (value / threshold.max) * 100;
    if (percentage > 120) return 'critical';
    if (percentage > 100) return 'high';
    if (percentage > 80) return 'medium';
    return 'low';
  }

  private generateTrendAlerts() {
    const alerts = [];
    const trendThresholds = {
      sales: { min: -0.1, max: 0.1 }, // 10% change
      revenue: { min: -0.15, max: 0.15 },
      conversionRate: { min: -0.2, max: 0.2 },
    };

    Object.entries(trendThresholds).forEach(([metric, threshold]) => {
      const historical = this.historicalData.get(metric) || [];
      if (historical.length >= 10) {
        const recent = historical.slice(-5);
        const older = historical.slice(-10, -5);
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        const change = (recentAvg - olderAvg) / olderAvg;
        
        if (change < threshold.min || change > threshold.max) {
          alerts.push({
            id: `trend_${metric}_${Date.now()}`,
            type: change > threshold.max ? 'success' : 'warning',
            metric: `${metric}_trend`,
            value: change,
            message: `${metric} trend: ${(change * 100).toFixed(1)}% change`,
            timestamp: new Date().toISOString(),
            severity: Math.abs(change) > 0.2 ? 'high' : 'medium',
          });
        }
      }
    });

    return alerts;
  }

  private getAdvancedSystemHealth() {
    const cpu = this.generateRealisticMetric('cpu', 20, 80);
    const memory = this.generateRealisticMetric('memory', 30, 85);
    const disk = this.generateRealisticMetric('disk', 10, 90);
    const network = this.generateRealisticMetric('network', 5, 15);
    
    return {
      cpu: {
        usage: cpu.toFixed(1),
        status: cpu > 80 ? 'critical' : cpu > 60 ? 'warning' : 'healthy',
        cores: 8,
        load: (cpu / 100 * 4).toFixed(2),
      },
      memory: {
        usage: memory.toFixed(1),
        status: memory > 85 ? 'critical' : memory > 70 ? 'warning' : 'healthy',
        total: '16GB',
        available: `${(16 * (100 - memory) / 100).toFixed(1)}GB`,
      },
      disk: {
        usage: disk.toFixed(1),
        status: disk > 90 ? 'critical' : disk > 80 ? 'warning' : 'healthy',
        total: '500GB',
        available: `${(500 * (100 - disk) / 100).toFixed(1)}GB`,
      },
      network: {
        latency: network.toFixed(1),
        throughput: `${(Math.random() * 100 + 50).toFixed(1)} Mbps`,
        status: network > 10 ? 'warning' : 'healthy',
      },
    };
  }

  private calculateTrends() {
    const trends: any = {};
    
    this.historicalData.forEach((data, metric) => {
      if (data.length >= 10) {
        const recent = data.slice(-5);
        const older = data.slice(-10, -5);
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        const change = (recentAvg - olderAvg) / olderAvg;
        
        trends[metric] = {
          direction: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable',
          percentage: (change * 100).toFixed(1),
          confidence: Math.min(100, Math.max(0, 100 - Math.abs(change) * 1000)),
        };
      }
    });
    
    return trends;
  }

  private generatePredictions() {
    const predictions: any = {};
    
    this.historicalData.forEach((data, metric) => {
      if (data.length >= 20) {
        // Simple linear regression for prediction
        const recent = data.slice(-20);
        const x = recent.map((_, i) => i);
        const y = recent;
        
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Predict next 5 values
        const futureValues = [];
        for (let i = 1; i <= 5; i++) {
          futureValues.push(slope * (n + i) + intercept);
        }
        
        predictions[metric] = {
          next: futureValues[0],
          trend: slope > 0 ? 'increasing' : 'decreasing',
          confidence: Math.min(95, Math.max(60, 100 - Math.abs(slope) * 100)),
          future: futureValues,
        };
      }
    });
    
    return predictions;
  }

  private broadcastToDashboardRooms(event: string, data: any) {
    this.dashboardRooms.forEach((clients, dashboardId) => {
      clients.forEach(clientId => {
        const client = this.clients.get(clientId);
        if (client && client.connected) {
          client.emit(event, { ...data, dashboardId });
        }
      });
    });
  }

  // ==================== PUBLIC API METHODS ====================

  async getRealtimeData(): Promise<any> {
    // Try to get from Redis cache first
    if (this.redisAvailable && this.redisClient) {
      try {
        const cached = await this.redisClient.get('realtime:latest');
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn(`Failed to retrieve from Redis cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Fallback to current metrics from memory
    const metrics = this.getCurrentMetrics();
    return {
      timestamp: new Date().toISOString(),
      metrics,
      trends: this.calculateTrends(),
      systemHealth: this.getAdvancedSystemHealth()
    };
  }

  async getHistoricalData(metric: string, hours: number = 24): Promise<any[]> {
    const data = this.historicalData.get(metric) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return data.map((value, index) => ({
      timestamp: new Date(Date.now() - (data.length - index) * 5 * 1000).toISOString(),
      value,
    })).filter(item => new Date(item.timestamp) >= cutoff);
  }

  async getDashboardAnalytics(dashboardId: string): Promise<any> {
    const clients = this.dashboardRooms.get(dashboardId) || new Set();
    const metrics = this.getCurrentMetrics();
    const trends = this.calculateTrends();
    
    return {
      dashboardId,
      connectedClients: clients.size,
      metrics,
      trends,
      lastUpdate: new Date().toISOString(),
    };
  }

  async getRedisHealth(): Promise<{ available: boolean; error?: string }> {
    if (!this.redisClient) {
      return { available: false, error: 'Redis client not initialized' };
    }

    if (!this.redisAvailable) {
      return { available: false, error: 'Redis connection not available' };
    }

    try {
      await this.redisClient.ping();
      return { available: true };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error during Redis health check',
      };
    }
  }

  isRedisAvailable(): boolean {
    return this.redisAvailable && this.redisClient !== null;
  }
}
