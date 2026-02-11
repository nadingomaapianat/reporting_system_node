#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chart_registry_service_1 = require("../shared/chart-registry.service");
const args = process.argv.slice(2);
if (args.length < 2) {
    process.exit(1);
}
const [name, sql, type = 'bar'] = args;
const validTypes = ['bar', 'pie', 'line', 'area', 'scatter'];
if (!validTypes.includes(type)) {
    console.error(`Invalid chart type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    process.exit(1);
}
const chartId = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();
chart_registry_service_1.ChartRegistryService.addChart({
    id: chartId,
    name,
    type: type,
    sql
});
if (!sql.toLowerCase().includes('select')) {
    console.warn('⚠️  Warning: SQL query should start with SELECT');
}
if (!sql.includes('{dateFilter}')) {
    console.warn('⚠️  Warning: Consider adding {dateFilter} for date filtering support');
}
//# sourceMappingURL=add-chart.js.map