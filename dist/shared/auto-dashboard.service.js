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
const user_function_access_service_1 = require("./user-function-access.service");
let AutoDashboardService = class AutoDashboardService {
    constructor(databaseService, userFunctionAccess) {
        this.databaseService = databaseService;
        this.userFunctionAccess = userFunctionAccess;
    }
    async getDashboardData(user, startDate, endDate, functionId) {
        const charts = chart_registry_service_1.ChartRegistryService.getChartsForDashboard('main');
        const results = {};
        let functionFilter = '';
        if (user && this.userFunctionAccess) {
            const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
            functionFilter = this.userFunctionAccess.buildControlFunctionFilter('c', access, functionId);
        }
        const chartPromises = charts.map(async (chart) => {
            try {
                const query = this.buildQuery(chart.sql, startDate, endDate, functionFilter);
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
    async getChartData(user, chartId, startDate, endDate, functionId) {
        const chart = chart_registry_service_1.ChartRegistryService.getChart(chartId);
        if (!chart) {
            throw new Error(`Chart ${chartId} not found`);
        }
        let functionFilter = '';
        if (user && this.userFunctionAccess) {
            const access = await this.userFunctionAccess.getUserFunctionAccess(user.id, user.groupName);
            functionFilter = this.userFunctionAccess.buildControlFunctionFilter('c', access, functionId);
        }
        const query = this.buildQuery(chart.sql, startDate, endDate, functionFilter);
        const data = await this.databaseService.query(query);
        return data.map(row => ({
            name: row[chart.xField],
            value: row[chart.yField],
            label: row[chart.labelField] || row[chart.xField]
        }));
    }
    buildQuery(sql, startDate, endDate, functionFilter = '') {
        let dateFilter = '';
        if (startDate) {
            dateFilter += ` AND created_at >= '${startDate}'`;
        }
        if (endDate) {
            dateFilter += ` AND created_at <= '${endDate} 23:59:59'`;
        }
        let query = sql.replace('{dateFilter}', dateFilter);
        if (functionFilter && query.includes('{functionFilter}')) {
            query = query.replace('{functionFilter}', functionFilter);
        }
        else if (functionFilter && query.includes('FROM') && (query.includes('Controls') || query.includes('[Controls]'))) {
            const hasAliasC = /\bFROM\s+.*Controls.*\s+c\b/i.test(query) || /\bFROM\s+.*\s+c\s+.*Controls/i.test(query);
            let filterToInject = functionFilter;
            if (!hasAliasC) {
                const aliasMatch = query.match(/FROM\s+(?:dbo\.)?\[?Controls\]?\s+(\w+)/i);
                if (aliasMatch && aliasMatch[1]) {
                    filterToInject = functionFilter.replace(/c\./g, `${aliasMatch[1]}.`);
                }
                else {
                    query = query.replace(/(FROM\s+(?:dbo\.)?\[?Controls\]?)(\s|$)/i, '$1 c$2');
                }
            }
            const whereIndex = query.toUpperCase().indexOf(' WHERE ');
            if (whereIndex > -1) {
                const beforeWhere = query.substring(0, whereIndex + 7);
                const afterWhere = query.substring(whereIndex + 7);
                query = beforeWhere + filterToInject + ' ' + afterWhere;
            }
            else {
                const fromIndex = query.toUpperCase().lastIndexOf(' FROM ');
                if (fromIndex > -1) {
                    const beforeFrom = query.substring(0, fromIndex);
                    const fromClause = query.substring(fromIndex);
                    const groupByIndex = fromClause.toUpperCase().indexOf(' GROUP BY ');
                    const orderByIndex = fromClause.toUpperCase().indexOf(' ORDER BY ');
                    const endIndex = groupByIndex > -1 ? groupByIndex : (orderByIndex > -1 ? orderByIndex : fromClause.length);
                    const fromPart = fromClause.substring(0, endIndex);
                    const restPart = fromClause.substring(endIndex);
                    query = beforeFrom + fromPart + ' WHERE 1=1 ' + filterToInject + restPart;
                }
            }
        }
        return query;
    }
};
exports.AutoDashboardService = AutoDashboardService;
exports.AutoDashboardService = AutoDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        user_function_access_service_1.UserFunctionAccessService])
], AutoDashboardService);
//# sourceMappingURL=auto-dashboard.service.js.map