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
exports.SimpleChartController = void 0;
const common_1 = require("@nestjs/common");
const chart_registry_service_1 = require("./chart-registry.service");
const auto_dashboard_service_1 = require("./auto-dashboard.service");
let SimpleChartController = class SimpleChartController {
    constructor(autoDashboardService) {
        this.autoDashboardService = autoDashboardService;
    }
    async getDashboard(startDate, endDate) {
        return this.autoDashboardService.getDashboardData(startDate, endDate);
    }
    async getChart(chartId, startDate, endDate) {
        return this.autoDashboardService.getChartData(chartId, startDate, endDate);
    }
    async addChart(chartConfig) {
        chart_registry_service_1.ChartRegistryService.addChart(chartConfig);
        return {
            success: true,
            message: `Chart '${chartConfig.name}' added successfully`,
            chartId: chartConfig.id
        };
    }
    async listCharts() {
        return chart_registry_service_1.ChartRegistryService.listCharts();
    }
    async removeChart(chartId) {
        chart_registry_service_1.ChartRegistryService.removeChart(chartId);
        return {
            success: true,
            message: `Chart '${chartId}' removed successfully`
        };
    }
};
exports.SimpleChartController = SimpleChartController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SimpleChartController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)(':chartId'),
    __param(0, (0, common_1.Param)('chartId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SimpleChartController.prototype, "getChart", null);
__decorate([
    (0, common_1.Post)('add'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SimpleChartController.prototype, "addChart", null);
__decorate([
    (0, common_1.Get)('list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SimpleChartController.prototype, "listCharts", null);
__decorate([
    (0, common_1.Post)('remove/:chartId'),
    __param(0, (0, common_1.Param)('chartId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimpleChartController.prototype, "removeChart", null);
exports.SimpleChartController = SimpleChartController = __decorate([
    (0, common_1.Controller)('charts'),
    __metadata("design:paramtypes", [auto_dashboard_service_1.AutoDashboardService])
], SimpleChartController);
//# sourceMappingURL=simple-chart.controller.js.map