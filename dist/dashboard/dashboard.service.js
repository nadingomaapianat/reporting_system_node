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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const realtime_service_1 = require("../realtime/realtime.service");
let DashboardService = class DashboardService {
    constructor(realtimeService) {
        this.realtimeService = realtimeService;
    }
    getConnectedClientsCount() {
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
    acknowledgeAlert(alertId) {
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
    getNotifications(limit = 10) {
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
    markNotificationAsRead(notificationId) {
        return {
            success: true,
            message: `Notification ${notificationId} marked as read`,
            timestamp: new Date().toISOString(),
        };
    }
    getWidgetData(widgetId) {
        return {
            widgetId,
            data: { message: 'Widget data not implemented' },
            timestamp: new Date().toISOString(),
        };
    }
    refreshWidget(widgetId) {
        return {
            widgetId,
            data: { message: 'Widget refreshed' },
            timestamp: new Date().toISOString(),
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [realtime_service_1.RealtimeService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map