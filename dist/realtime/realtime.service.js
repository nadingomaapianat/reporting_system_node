"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RealtimeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const redis_1 = require("redis");
let RealtimeService = RealtimeService_1 = class RealtimeService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RealtimeService_1.name);
        this.clients = new Map();
        this.metricSubscriptions = new Map();
        this.dashboardRooms = new Map();
        this.historicalData = new Map();
        this.alertThresholds = new Map();
        this.redisClient = null;
        this.redisAvailable = false;
        this.initializeThresholds();
        this.initializeHistoricalData();
    }
    async onModuleInit() {
        await this.connectRedis();
    }
    async onModuleDestroy() {
        await this.disconnectRedis();
    }
    async connectRedis() {
        try {
            const redisHost = this.configService.get('REDIS_HOST') || 'localhost';
            const redisPort = parseInt(this.configService.get('REDIS_PORT') || '6379', 10);
            this.redisClient = (0, redis_1.createClient)({
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
        }
        catch (error) {
            this.logger.warn(`Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
            this.logger.warn('Falling back to local in-memory caching');
            this.redisAvailable = false;
            this.redisClient = null;
        }
    }
    async disconnectRedis() {
        if (this.redisClient) {
            try {
                await this.redisClient.quit();
                this.logger.log('Redis connection closed');
            }
            catch (error) {
                this.logger.error(`Error closing Redis connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            this.redisClient = null;
            this.redisAvailable = false;
        }
    }
    addClient(client) {
        this.clients.set(client.id, client);
        this.logger.log(`Client connected: ${client.id}. Total clients: ${this.clients.size}`);
    }
    removeClient(client) {
        this.clients.delete(client.id);
        this.metricSubscriptions.delete(client.id);
        this.logger.log(`Client disconnected: ${client.id}. Total clients: ${this.clients.size}`);
    }
    joinDashboard(client, dashboardId) {
        if (!this.dashboardRooms.has(dashboardId)) {
            this.dashboardRooms.set(dashboardId, new Set());
        }
        this.dashboardRooms.get(dashboardId)?.add(client.id);
        this.logger.log(`Client ${client.id} joined dashboard ${dashboardId}`);
    }
    leaveDashboard(client, dashboardId) {
        this.dashboardRooms.get(dashboardId)?.delete(client.id);
        this.logger.log(`Client ${client.id} left dashboard ${dashboardId}`);
    }
    initializeThresholds() {
        this.alertThresholds.set('cpu', { min: 0, max: 80 });
        this.alertThresholds.set('memory', { min: 0, max: 85 });
        this.alertThresholds.set('disk', { min: 0, max: 90 });
        this.alertThresholds.set('response_time', { min: 0, max: 2000 });
        this.alertThresholds.set('error_rate', { min: 0, max: 5 });
    }
    initializeHistoricalData() {
        const metrics = ['sales', 'users', 'revenue', 'conversion_rate', 'cpu', 'memory', 'disk'];
        metrics.forEach(metric => {
            this.historicalData.set(metric, []);
        });
    }
    subscribeToMetrics(client, metrics) {
        this.metricSubscriptions.set(client.id, new Set(metrics));
    }
    unsubscribeFromMetrics(client, metrics) {
        const currentSubs = this.metricSubscriptions.get(client.id) || new Set();
        metrics.forEach(metric => currentSubs.delete(metric));
        this.metricSubscriptions.set(client.id, currentSubs);
    }
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
            this.storeHistoricalData(realTimeData.metrics);
            await this.cacheRealtimeData(realTimeData);
            this.broadcastToAllClients('realtime_update', realTimeData);
            this.broadcastToDashboardRooms('realtime_update', realTimeData);
        }
        catch (error) {
            this.logger.error('Error generating real-time data:', error);
        }
    }
    generateChartData() {
        const chartData = {
            timestamp: new Date().toISOString(),
            salesTrend: this.generateSalesTrendData(),
            userActivity: this.generateUserActivityData(),
            revenueByCategory: this.generateRevenueByCategoryData(),
        };
        this.broadcastToAllClients('chart_update', chartData);
    }
    generateAlerts() {
        const alerts = [];
        const alertTypes = ['warning', 'error', 'info', 'success'];
        if (Math.random() < 0.3) {
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
    getRandomAlertMessage() {
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
    getSystemHealth() {
        return {
            cpu: (Math.random() * 30 + 20).toFixed(1),
            memory: (Math.random() * 40 + 30).toFixed(1),
            disk: (Math.random() * 20 + 10).toFixed(1),
            network: (Math.random() * 10 + 5).toFixed(1),
        };
    }
    generateSalesTrendData() {
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
    generateUserActivityData() {
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
    generateRevenueByCategoryData() {
        const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
        return categories.map(category => ({
            category,
            revenue: Math.floor(Math.random() * 50000) + 10000,
            percentage: Math.floor(Math.random() * 30) + 10,
        }));
    }
    broadcastToAllClients(event, data) {
        this.clients.forEach((client) => {
            if (client.connected) {
                client.emit(event, data);
            }
        });
    }
    getConnectedClientsCount() {
        return this.clients.size;
    }
    getClientsByMetric(metric) {
        const clientIds = [];
        this.metricSubscriptions.forEach((metrics, clientId) => {
            if (metrics.has(metric)) {
                clientIds.push(clientId);
            }
        });
        return clientIds;
    }
    generateRealisticMetric(metric, min, max) {
        const historical = this.historicalData.get(metric) || [];
        if (historical.length === 0) {
            return Math.floor(Math.random() * (max - min) + min);
        }
        const lastValue = historical[historical.length - 1];
        const trend = this.calculateMetricTrend(historical);
        const volatility = 0.1;
        const baseValue = lastValue * (1 + trend);
        const randomFactor = (Math.random() - 0.5) * volatility;
        const newValue = baseValue * (1 + randomFactor);
        return Math.max(min, Math.min(max, Math.floor(newValue)));
    }
    calculateMetricTrend(historical) {
        if (historical.length < 2)
            return 0;
        const recent = historical.slice(-10);
        const older = historical.slice(-20, -10);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        return (recentAvg - olderAvg) / olderAvg;
    }
    storeHistoricalData(metrics) {
        Object.entries(metrics).forEach(([key, value]) => {
            const historical = this.historicalData.get(key) || [];
            historical.push(value);
            if (historical.length > 1000) {
                historical.shift();
            }
            this.historicalData.set(key, historical);
        });
    }
    async cacheRealtimeData(data) {
        if (this.redisAvailable && this.redisClient) {
            try {
                const cacheKey = 'realtime:latest';
                const cacheTTL = 60;
                await this.redisClient.setEx(cacheKey, cacheTTL, JSON.stringify(data));
                const metricsKey = 'realtime:metrics';
                await this.redisClient.lPush(metricsKey, JSON.stringify(data));
                await this.redisClient.lTrim(metricsKey, 0, 999);
                await this.redisClient.expire(metricsKey, 3600);
                this.logger.debug('Real-time data cached in Redis');
            }
            catch (error) {
                this.logger.warn(`Failed to cache data in Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
                this.redisAvailable = false;
            }
        }
        else {
            this.logger.debug('Caching real-time data (Redis not available, using local cache)');
        }
    }
    async generateIntelligentAlerts() {
        const alerts = [];
        const metrics = this.getCurrentMetrics();
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
        const trendAlerts = this.generateTrendAlerts();
        alerts.push(...trendAlerts);
        return alerts;
    }
    getCurrentMetrics() {
        const metrics = {};
        this.historicalData.forEach((data, metric) => {
            if (data.length > 0) {
                metrics[metric] = data[data.length - 1];
            }
        });
        return metrics;
    }
    getAlertMessage(metric, value, threshold) {
        const messages = {
            cpu: `CPU usage is ${value.toFixed(1)}% (threshold: ${threshold.max}%)`,
            memory: `Memory usage is ${value.toFixed(1)}% (threshold: ${threshold.max}%)`,
            disk: `Disk usage is ${value.toFixed(1)}% (threshold: ${threshold.max}%)`,
            responseTime: `Response time is ${value}ms (threshold: ${threshold.max}ms)`,
            errorRate: `Error rate is ${value.toFixed(2)}% (threshold: ${threshold.max}%)`,
        };
        return messages[metric] || `${metric} is ${value} (threshold: ${threshold.max})`;
    }
    calculateAlertSeverity(metric, value, threshold) {
        const percentage = (value / threshold.max) * 100;
        if (percentage > 120)
            return 'critical';
        if (percentage > 100)
            return 'high';
        if (percentage > 80)
            return 'medium';
        return 'low';
    }
    generateTrendAlerts() {
        const alerts = [];
        const trendThresholds = {
            sales: { min: -0.1, max: 0.1 },
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
    getAdvancedSystemHealth() {
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
    calculateTrends() {
        const trends = {};
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
    generatePredictions() {
        const predictions = {};
        this.historicalData.forEach((data, metric) => {
            if (data.length >= 20) {
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
    broadcastToDashboardRooms(event, data) {
        this.dashboardRooms.forEach((clients, dashboardId) => {
            clients.forEach(clientId => {
                const client = this.clients.get(clientId);
                if (client && client.connected) {
                    client.emit(event, { ...data, dashboardId });
                }
            });
        });
    }
    async getRealtimeData() {
        if (this.redisAvailable && this.redisClient) {
            try {
                const cached = await this.redisClient.get('realtime:latest');
                if (cached) {
                    return JSON.parse(cached);
                }
            }
            catch (error) {
                this.logger.warn(`Failed to retrieve from Redis cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        const metrics = this.getCurrentMetrics();
        return {
            timestamp: new Date().toISOString(),
            metrics,
            trends: this.calculateTrends(),
            systemHealth: this.getAdvancedSystemHealth()
        };
    }
    async getHistoricalData(metric, hours = 24) {
        const data = this.historicalData.get(metric) || [];
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        return data.map((value, index) => ({
            timestamp: new Date(Date.now() - (data.length - index) * 5 * 1000).toISOString(),
            value,
        })).filter(item => new Date(item.timestamp) >= cutoff);
    }
    async getDashboardAnalytics(dashboardId) {
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
    async getRedisHealth() {
        if (!this.redisClient) {
            return { available: false, error: 'Redis client not initialized' };
        }
        if (!this.redisAvailable) {
            return { available: false, error: 'Redis connection not available' };
        }
        try {
            await this.redisClient.ping();
            return { available: true };
        }
        catch (error) {
            return {
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error during Redis health check',
            };
        }
    }
    isRedisAvailable() {
        return this.redisAvailable && this.redisClient !== null;
    }
};
exports.RealtimeService = RealtimeService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RealtimeService.prototype, "generateRealTimeData", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RealtimeService.prototype, "generateChartData", null);
exports.RealtimeService = RealtimeService = RealtimeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RealtimeService);
//# sourceMappingURL=realtime.service.js.map