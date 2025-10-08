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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const dashboard_service_1 = require("./dashboard.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
let DashboardController = class DashboardController {
    constructor(dashboardService, realtimeGateway) {
        this.dashboardService = dashboardService;
        this.realtimeGateway = realtimeGateway;
    }
    getDashboardStatus() {
        return {
            status: 'active',
            connectedClients: this.dashboardService.getConnectedClientsCount(),
            lastUpdate: new Date().toISOString(),
        };
    }
    getCurrentMetrics() {
        return this.dashboardService.getCurrentMetrics();
    }
    getActiveAlerts() {
        return this.dashboardService.getActiveAlerts();
    }
    acknowledgeAlert(body) {
        return this.dashboardService.acknowledgeAlert(body.alertId);
    }
    getSystemHealth() {
        return this.dashboardService.getSystemHealth();
    }
    getNotifications(limit = 10) {
        return this.dashboardService.getNotifications(limit);
    }
    markNotificationAsRead(body) {
        return this.dashboardService.markNotificationAsRead(body.notificationId);
    }
    getWidgetData(widgetId) {
        return this.dashboardService.getWidgetData(widgetId);
    }
    refreshWidget(widgetId) {
        const data = this.dashboardService.refreshWidget(widgetId);
        this.realtimeGateway.broadcastToClients([], 'widget_refresh', {
            widgetId,
            data,
            timestamp: new Date().toISOString(),
        });
        return data;
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getDashboardStatus", null);
__decorate([
    (0, common_1.Get)('metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getCurrentMetrics", null);
__decorate([
    (0, common_1.Get)('alerts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getActiveAlerts", null);
__decorate([
    (0, common_1.Post)('alerts/acknowledge'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "acknowledgeAlert", null);
__decorate([
    (0, common_1.Get)('system-health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getSystemHealth", null);
__decorate([
    (0, common_1.Get)('notifications'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Post)('notifications/mark-read'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "markNotificationAsRead", null);
__decorate([
    (0, common_1.Get)('widgets/:widgetId/data'),
    __param(0, (0, common_1.Param)('widgetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getWidgetData", null);
__decorate([
    (0, common_1.Post)('widgets/:widgetId/refresh'),
    __param(0, (0, common_1.Param)('widgetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "refreshWidget", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('api/dashboard'),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService,
        realtime_gateway_1.RealtimeGateway])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map