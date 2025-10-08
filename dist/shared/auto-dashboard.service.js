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
exports.AutoDashboardService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const chart_registry_service_1 = require("./chart-registry.service");
let AutoDashboardService = class AutoDashboardService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async getDashboardData(startDate, endDate) {
        const charts = chart_registry_service_1.ChartRegistryService.getChartsForDashboard('main');
        const results = {};
        const chartPromises = charts.map(async (chart) => {
            try {
                const query = this.buildQuery(chart.sql, startDate, endDate);
                const data = await this.databaseService.query(query);
                return {
                    id: chart.id,
                    data: data.map(row => ({
                        name: row[chart.xField],
                        value: row[chart.yField],
                        label: row[chart.labelField] || row[chart.xField]
                    }))
                };
            }
            catch (error) {
                console.error(`Error fetching chart ${chart.id}:`, error);
                return {
                    id: chart.id,
                    data: []
                };
            }
        });
        const chartResults = await Promise.all(chartPromises);
        chartResults.forEach(result => {
            results[result.id] = result.data;
        });
        return results;
    }
    async getChartData(chartId, startDate, endDate) {
        const chart = chart_registry_service_1.ChartRegistryService.getChart(chartId);
        if (!chart) {
            throw new Error(`Chart ${chartId} not found`);
        }
        const query = this.buildQuery(chart.sql, startDate, endDate);
        const data = await this.databaseService.query(query);
        return data.map(row => ({
            name: row[chart.xField],
            value: row[chart.yField],
            label: row[chart.labelField] || row[chart.xField]
        }));
    }
    buildQuery(sql, startDate, endDate) {
        let dateFilter = '';
        if (startDate) {
            dateFilter += ` AND created_at >= '${startDate}'`;
        }
        if (endDate) {
            dateFilter += ` AND created_at <= '${endDate} 23:59:59'`;
        }
        return sql.replace('{dateFilter}', dateFilter);
    }
};
exports.AutoDashboardService = AutoDashboardService;
exports.AutoDashboardService = AutoDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AutoDashboardService);
//# sourceMappingURL=auto-dashboard.service.js.map