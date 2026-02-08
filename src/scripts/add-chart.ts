#!/usr/bin/env node

// Simple script to add charts with just SQL
// Usage: npm run add-chart "Chart Name" "SELECT category as name, COUNT(*) as value FROM table GROUP BY category" "pie"

import { ChartRegistryService } from '../shared/chart-registry.service';

const args = process.argv.slice(2);

if (args.length < 2) {
  // console.log(`
  // Usage: npm run add-chart "Chart Name" "SQL Query" [Chart Type]
  //
  // Examples:
  //   npm run add-chart "Sales by Region" "SELECT region as name, SUM(amount) as value FROM sales GROUP BY region" "bar"
  //   npm run add-chart "User Status" "SELECT status as name, COUNT(*) as value FROM users GROUP BY status" "pie"
  //   npm run add-chart "Monthly Trend" "SELECT FORMAT(date, 'yyyy-MM') as name, COUNT(*) as value FROM events GROUP BY FORMAT(date, 'yyyy-MM') ORDER BY name" "line"
  //
  // Chart Types: bar, pie, line, area, scatter (default: bar)
  // `);
  process.exit(1);
}

const [name, sql, type = 'bar'] = args;

// Validate chart type
const validTypes = ['bar', 'pie', 'line', 'area', 'scatter'];
if (!validTypes.includes(type)) {
  console.error(`Invalid chart type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  process.exit(1);
}

// Generate chart ID from name
const chartId = name
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, '')
  .replace(/\s+/g, '-')
  .trim();

// Add the chart
ChartRegistryService.addChart({
  id: chartId,
  name,
  type: type as any,
  sql
});

// console.log(`
// ✅ Chart added successfully!
//
// Chart ID: ${chartId}
// Name: ${name}
// Type: ${type}
// SQL: ${sql}
//
// The chart will be available at: /api/charts/${chartId}
// Dashboard data at: /api/charts/dashboard
// `);

// Test the SQL (basic validation)
if (!sql.toLowerCase().includes('select')) {
  console.warn('⚠️  Warning: SQL query should start with SELECT');
}

if (!sql.includes('{dateFilter}')) {
  console.warn('⚠️  Warning: Consider adding {dateFilter} for date filtering support');
  // console.log('   Example: WHERE 1=1 {dateFilter}');
}
