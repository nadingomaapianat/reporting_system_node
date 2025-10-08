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
exports.BaseDashboardService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let BaseDashboardService = class BaseDashboardService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async getDashboardData(startDate, endDate) {
        const config = this.getConfig();
        const dateFilter = this.buildDateFilter(startDate, endDate, config.dateField);
        try {
            const [metricsResults, chartsResults, tablesResults] = await Promise.all([
                this.getMetricsData(config.metrics, dateFilter),
                this.getChartsData(config.charts, dateFilter),
                this.getTablesData(config.tables, dateFilter)
            ]);
            return {
                ...metricsResults,
                ...chartsResults,
                ...tablesResults
            };
        }
        catch (error) {
            console.error(`Error fetching ${config.name} dashboard data:`, error);
            throw error;
        }
    }
    async getMetricsData(metrics, dateFilter) {
        const results = {};
        for (const metric of metrics) {
            try {
                const query = metric.query.replace('{dateFilter}', dateFilter);
                const result = await this.databaseService.query(query);
                results[metric.id] = result[0]?.total || result[0]?.count || 0;
                if (metric.changeQuery) {
                    const changeQuery = metric.changeQuery.replace('{dateFilter}', dateFilter);
                    const changeResult = await this.databaseService.query(changeQuery);
                    results[`${metric.id}Change`] = this.calculateChange(results[metric.id], changeResult[0]?.total || changeResult[0]?.count || 0);
                }
            }
            catch (error) {
                console.error(`Error fetching metric ${metric.id}:`, error);
                results[metric.id] = 0;
                results[`${metric.id}Change`] = '+0%';
            }
        }
        return results;
    }
    async getChartsData(charts, dateFilter) {
        const results = {};
        for (const chart of charts) {
            try {
                const query = chart.query.replace('{dateFilter}', dateFilter);
                const result = await this.databaseService.query(query);
                results[chart.id] = result.map(row => ({
                    name: row[chart.xField],
                    value: row[chart.yField],
                    label: chart.labelField ? row[chart.labelField] : row[chart.xField]
                }));
            }
            catch (error) {
                console.error(`Error fetching chart ${chart.id}:`, error);
                results[chart.id] = [];
            }
        }
        return results;
    }
    async getTablesData(tables, dateFilter) {
        const results = {};
        for (const table of tables) {
            try {
                const query = table.query.replace('{dateFilter}', dateFilter);
                const result = await this.databaseService.query(query);
                results[table.id] = result.map(row => {
                    const processedRow = {};
                    for (const column of table.columns) {
                        let value = row[column.key];
                        if (column.render) {
                            value = column.render(value);
                        }
                        else {
                            value = this.formatValue(value, column.type);
                        }
                        processedRow[column.key] = value;
                    }
                    return processedRow;
                });
            }
            catch (error) {
                console.error(`Error fetching table ${table.id}:`, error);
                results[table.id] = [];
            }
        }
        return results;
    }
    buildDateFilter(startDate, endDate, dateField) {
        if (!startDate && !endDate)
            return '';
        const field = dateField || 'createdAt';
        let filter = '';
        if (startDate) {
            filter += ` AND ${field} >= '${startDate}'`;
        }
        if (endDate) {
            filter += ` AND ${field} <= '${endDate} 23:59:59'`;
        }
        return filter;
    }
    calculateChange(current, previous) {
        if (previous === 0)
            return current > 0 ? '+100%' : '0%';
        const change = ((current - previous) / previous) * 100;
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(1)}%`;
    }
    formatValue(value, type) {
        switch (type) {
            case 'number':
                return Number(value) || 0;
            case 'currency':
                return `$${Number(value || 0).toLocaleString()}`;
            case 'date':
                return value ? new Date(value).toLocaleDateString() : 'N/A';
            case 'status':
                return value || 'N/A';
            default:
                return value || 'N/A';
        }
    }
    async getCardData(cardType, page = 1, limit = 10, startDate, endDate) {
        const config = this.getConfig();
        const dateFilter = this.buildDateFilter(startDate, endDate, config.dateField);
        const metric = config.metrics.find(m => m.id === cardType);
        if (!metric) {
            throw new Error(`Card type ${cardType} not found`);
        }
        try {
            let dataQuery;
            let countQuery = metric.query.replace('{dateFilter}', dateFilter);
            if (cardType === 'total') {
                dataQuery = `SELECT id, name, code FROM dbo.[Controls] WHERE 1=1 ${dateFilter}`;
            }
            else if (cardType === 'unmapped') {
                dataQuery = `SELECT c.id, c.name, c.code FROM GRCDB2.dbo.Controls c WHERE c.isDeleted = 0 ${dateFilter} AND NOT EXISTS (SELECT 1 FROM GRCDB2.dbo.ControlCosos ccx WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL)`;
            }
            else if (cardType.startsWith('pending')) {
                const statusField = cardType.replace('pending', '').toLowerCase() + 'Status';
                dataQuery = `SELECT id, name, code FROM dbo.[Controls] WHERE ${statusField} != 'approved' AND 1=1 ${dateFilter}`;
            }
            else {
                dataQuery = `SELECT id, name, code FROM dbo.[Controls] WHERE 1=1 ${dateFilter}`;
            }
            const offset = (page - 1) * limit;
            const paginatedQuery = `${dataQuery} ORDER BY id OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
            const [data, countResult] = await Promise.all([
                this.databaseService.query(paginatedQuery),
                this.databaseService.query(countQuery)
            ]);
            const total = countResult[0]?.total || countResult[0]?.count || 0;
            const totalPages = Math.ceil(total / limit);
            return {
                data: data.map((row, index) => ({
                    control_code: row.code || `CTRL-${row.id}`,
                    control_name: row.name || `Control ${row.id}`,
                    ...row
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error(`Error fetching card data for ${cardType}:`, error);
            throw error;
        }
    }
};
exports.BaseDashboardService = BaseDashboardService;
exports.BaseDashboardService = BaseDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], BaseDashboardService);
//# sourceMappingURL=base-dashboard.service.js.map