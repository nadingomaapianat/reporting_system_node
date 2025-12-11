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
exports.RealtimeGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const realtime_service_1 = require("./realtime.service");
let RealtimeGateway = class RealtimeGateway {
    constructor(realtimeService) {
        this.realtimeService = realtimeService;
    }
    handleConnection(client) {
        console.log(`Client connected: ${client.id}`);
        this.realtimeService.addClient(client);
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
        this.realtimeService.removeClient(client);
    }
    handleJoinDashboard(client, data) {
        client.join(`dashboard_${data.dashboardId}`);
        this.realtimeService.joinDashboard(client, data.dashboardId);
        console.log(`Client ${client.id} joined dashboard ${data.dashboardId}`);
    }
    handleLeaveDashboard(client, data) {
        client.leave(`dashboard_${data.dashboardId}`);
        this.realtimeService.leaveDashboard(client, data.dashboardId);
        console.log(`Client ${client.id} left dashboard ${data.dashboardId}`);
    }
    handleSubscribeMetrics(client, data) {
        this.realtimeService.subscribeToMetrics(client, data.metrics);
    }
    handleUnsubscribeMetrics(client, data) {
        this.realtimeService.unsubscribeFromMetrics(client, data.metrics);
    }
    async handleGetRealtimeData(client) {
        const data = await this.realtimeService.getRealtimeData();
        client.emit('realtime_data_response', data);
    }
    async handleGetHistoricalData(client, data) {
        const historicalData = await this.realtimeService.getHistoricalData(data.metric, data.hours || 24);
        client.emit('historical_data_response', {
            metric: data.metric,
            data: historicalData,
        });
    }
    async handleGetDashboardAnalytics(client, data) {
        const analytics = await this.realtimeService.getDashboardAnalytics(data.dashboardId);
        client.emit('dashboard_analytics_response', analytics);
    }
    broadcastToDashboard(dashboardId, event, data) {
        this.server.to(`dashboard_${dashboardId}`).emit(event, data);
    }
    broadcastToClients(clientIds, event, data) {
        if (clientIds.length === 0) {
            this.server.emit(event, data);
        }
        else {
            clientIds.forEach(clientId => {
                this.server.to(clientId).emit(event, data);
            });
        }
    }
    broadcastToAllClients(event, data) {
        this.server.emit(event, data);
    }
};
exports.RealtimeGateway = RealtimeGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RealtimeGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_dashboard'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleJoinDashboard", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_dashboard'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleLeaveDashboard", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe_metrics'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleSubscribeMetrics", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe_metrics'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleUnsubscribeMetrics", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get_realtime_data'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "handleGetRealtimeData", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get_historical_data'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "handleGetHistoricalData", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get_dashboard_analytics'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "handleGetDashboardAnalytics", null);
exports.RealtimeGateway = RealtimeGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: ['https://fawry-reporting.comply.now', 'https://backendnode-fawry-reporting.comply.now'],
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [realtime_service_1.RealtimeService])
], RealtimeGateway);
//# sourceMappingURL=realtime.gateway.js.map