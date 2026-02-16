"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartRegistryService = void 0;
const common_1 = require("@nestjs/common");
let ChartRegistryService = class ChartRegistryService {
    static addChart(config) {
        this.charts.set(config.id, {
            ...config,
            xField: config.xField || 'name',
            yField: config.yField || 'value',
            labelField: config.labelField || 'name'
        });
    }
    static getChartsForDashboard(dashboardId) {
        return Array.from(this.charts.values());
    }
    static getChart(chartId) {
        return this.charts.get(chartId);
    }
    static removeChart(chartId) {
        this.charts.delete(chartId);
    }
    static listCharts() {
        return Array.from(this.charts.entries()).map(([id, config]) => ({
            id,
            name: config.name,
            type: config.type
        }));
    }
};
exports.ChartRegistryService = ChartRegistryService;
ChartRegistryService.charts = new Map();
exports.ChartRegistryService = ChartRegistryService = __decorate([
    (0, common_1.Injectable)()
], ChartRegistryService);
//# sourceMappingURL=chart-registry.service.js.map