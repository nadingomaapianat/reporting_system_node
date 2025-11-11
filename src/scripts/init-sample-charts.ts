#!/usr/bin/env node

// Initialize sample charts for testing
import { ChartRegistryService } from '../shared/chart-registry.service';

console.log('🚀 Initializing sample charts...');

// Sample chart 1: Sales by Region
ChartRegistryService.addChart({
  id: 'sales-by-region',
  name: 'Sales by Region',
  type: 'bar',
  sql: `
    SELECT 
      CASE 
        WHEN region = 'North' THEN 'North America'
        WHEN region = 'South' THEN 'South America' 
        WHEN region = 'Europe' THEN 'Europe'
        WHEN region = 'Asia' THEN 'Asia Pacific'
        ELSE 'Other'
      END as name,
      SUM(amount) as value
    FROM (
      SELECT 'North' as region, 150000 as amount
      UNION ALL SELECT 'South', 120000
      UNION ALL SELECT 'Europe', 180000
      UNION ALL SELECT 'Asia', 200000
      UNION ALL SELECT 'Other', 50000
    ) sales
    WHERE 1=1 {dateFilter}
    GROUP BY region
    ORDER BY SUM(amount) DESC
  `
});

// Sample chart 2: User Status Distribution
ChartRegistryService.addChart({
  id: 'user-status',
  name: 'User Status Distribution',
  type: 'pie',
  sql: `
    SELECT 
      status as name,
      COUNT(*) as value
    FROM (
      SELECT 'Active' as status
      UNION ALL SELECT 'Active'
      UNION ALL SELECT 'Active'
      UNION ALL SELECT 'Inactive'
      UNION ALL SELECT 'Pending'
      UNION ALL SELECT 'Suspended'
    ) users
    WHERE 1=1 {dateFilter}
    GROUP BY status
    ORDER BY COUNT(*) DESC
  `
});

// Sample chart 3: Monthly Growth Trend
ChartRegistryService.addChart({
  id: 'monthly-growth',
  name: 'Monthly Growth Trend',
  type: 'line',
  sql: `
    SELECT 
      FORMAT(date, 'yyyy-MM') as name,
      COUNT(*) as value
    FROM (
      SELECT '2024-01-01' as date
      UNION ALL SELECT '2024-02-01'
      UNION ALL SELECT '2024-03-01'
      UNION ALL SELECT '2024-04-01'
      UNION ALL SELECT '2024-05-01'
      UNION ALL SELECT '2024-06-01'
      UNION ALL SELECT '2024-07-01'
      UNION ALL SELECT '2024-08-01'
      UNION ALL SELECT '2024-09-01'
      UNION ALL SELECT '2024-10-01'
      UNION ALL SELECT '2024-11-01'
      UNION ALL SELECT '2024-12-01'
    ) months
    WHERE 1=1 {dateFilter}
    GROUP BY FORMAT(date, 'yyyy-MM')
    ORDER BY name
  `
});

// Sample chart 4: Product Categories
ChartRegistryService.addChart({
  id: 'product-categories',
  name: 'Product Categories',
  type: 'bar',
  sql: `
    SELECT 
      category as name,
      COUNT(*) as value
    FROM (
      SELECT 'Electronics' as category
      UNION ALL SELECT 'Electronics'
      UNION ALL SELECT 'Electronics'
      UNION ALL SELECT 'Clothing'
      UNION ALL SELECT 'Clothing'
      UNION ALL SELECT 'Books'
      UNION ALL SELECT 'Home & Garden'
      UNION ALL SELECT 'Sports'
    ) products
    WHERE 1=1 {dateFilter}
    GROUP BY category
    ORDER BY COUNT(*) DESC
  `
});

// Sample chart 5: Performance Score Distribution
ChartRegistryService.addChart({
  id: 'performance-scores',
  name: 'Performance Score Distribution',
  type: 'scatter',
  sql: `
    SELECT 
      'Team A' as name,
      score as value
    FROM (
      SELECT 85 as score
      UNION ALL SELECT 92
      UNION ALL SELECT 78
      UNION ALL SELECT 88
      UNION ALL SELECT 95
      UNION ALL SELECT 82
      UNION ALL SELECT 90
      UNION ALL SELECT 87
    ) performance
    WHERE 1=1 {dateFilter}
    ORDER BY score DESC
  `
});

console.log('✅ Sample charts initialized successfully!');
console.log('📊 Available charts:');
ChartRegistryService.listCharts().forEach(chart => {
  console.log(`   - ${chart.name} (${chart.type})`);
});

console.log(`
🚀 Next steps:
1. Start your backend: npm run start:dev
2. Visit: http://localhost:3000/api/charts/dashboard
3. Or use the frontend: http://localhost:3001/auto-dashboard
`);
