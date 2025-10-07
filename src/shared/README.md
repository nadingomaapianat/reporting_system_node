# Reusable Backend Dashboard Architecture

This architecture makes it incredibly easy to add new charts, metrics, and tables to any dashboard in just a few minutes.

## 🚀 Quick Start - Adding Charts in 2 Days

### Method 1: Using Templates (Easiest)
```typescript
// Add a new chart using existing templates
const config = DashboardConfigService.addChartToConfig(
  baseConfig,
  'monthlyTrend',  // Template name
  'dbo.[Controls]', // Table name
  'createdAt'      // Date field
);
```

### Method 2: Custom Charts (More Control)
```typescript
const config = {
  ...baseConfig,
  charts: [
    ...baseConfig.charts,
    {
      id: 'myNewChart',
      name: 'My Custom Chart',
      type: 'bar',
      query: `SELECT category as name, COUNT(*) as value FROM my_table WHERE 1=1 {dateFilter} GROUP BY category`,
      xField: 'name',
      yField: 'value'
    }
  ]
};
```

## 📊 Available Chart Templates

| Template | Type | Description |
|----------|------|-------------|
| `departmentDistribution` | bar | Distribution by department |
| `statusDistribution` | pie | Distribution by status |
| `monthlyTrend` | line | Monthly trend over time |
| `riskDistribution` | bar | Risk level distribution |
| `categoryDistribution` | pie | Category distribution |

## 📈 Available Metric Templates

| Template | Description |
|----------|-------------|
| `totalCount` | Total count of records |
| `pendingCount` | Count of pending records |
| `approvedCount` | Count of approved records |
| `financialImpact` | Sum of financial amounts |

## 📋 Available Table Templates

| Template | Description |
|----------|-------------|
| `statusOverview` | Status overview with multiple status columns |
| `financialSummary` | Financial summary with amounts |

## 🏗️ Architecture Components

### 1. BaseDashboardService
- Handles all common dashboard operations
- Executes queries in parallel for performance
- Provides date filtering, pagination, and data formatting
- Extend this class for specific dashboard needs

### 2. DashboardConfigService
- Contains all chart, metric, and table templates
- Pre-configured dashboard setups
- Easy methods to add new components

### 3. ChartExtensionsService
- Examples of how to add new charts
- Enhanced configurations with multiple charts
- Ready-to-use chart combinations

## 🔧 Creating a New Dashboard

### Step 1: Create Service
```typescript
@Injectable()
export class MyDashboardService extends BaseDashboardService {
  constructor(databaseService: DatabaseService) {
    super(databaseService);
  }

  getConfig(): DashboardConfig {
    return {
      name: 'My Dashboard',
      tableName: 'my_table',
      dateField: 'createdAt',
      metrics: [
        DashboardConfigService.METRIC_TEMPLATES.totalCount('my_table', 'Items', 'blue')
      ],
      charts: [
        DashboardConfigService.CHART_TEMPLATES.departmentDistribution('my_table')
      ],
      tables: [
        DashboardConfigService.TABLE_TEMPLATES.statusOverview('my_table', 'id', 'name', ['status'])
      ]
    };
  }
}
```

### Step 2: Create Controller
```typescript
@Controller('my-dashboard')
export class MyDashboardController {
  constructor(private readonly myDashboardService: MyDashboardService) {}

  @Get()
  async getDashboard(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.myDashboardService.getDashboardData(startDate, endDate);
  }
}
```

## 🎯 Adding New Charts (2 Days Plan)

### Day 1: Setup and Basic Charts
1. Use existing templates to add 3-5 basic charts
2. Test with sample data
3. Verify date filtering works

### Day 2: Advanced Charts and Customization
1. Add custom charts with complex queries
2. Implement interactive features
3. Add new chart types (scatter, area, etc.)

## 📝 Example: Adding 6 New Charts to Controls Dashboard

```typescript
// In your service
getConfig(): DashboardConfig {
  return ChartExtensionsService.getEnhancedControlsConfig();
}
```

This automatically adds:
- Risk Level Distribution
- Monthly Trend
- Priority Distribution
- Compliance Status
- Geographic Distribution
- Control Effectiveness

## 🔄 Benefits

1. **Reusability**: Write once, use everywhere
2. **Consistency**: All dashboards follow the same patterns
3. **Maintainability**: Changes in one place affect all dashboards
4. **Performance**: Parallel query execution
5. **Flexibility**: Easy to add new chart types and metrics
6. **Type Safety**: Full TypeScript support

## 🚀 Next Steps

1. Replace existing dashboard services with this architecture
2. Add new chart templates as needed
3. Create dashboard-specific configurations
4. Add more chart types (gauge, heatmap, etc.)
5. Implement real-time data updates

## 📚 Files Structure

```
src/shared/
├── base-dashboard.service.ts      # Base service with common functionality
├── base-dashboard.controller.ts   # Base controller with common endpoints
├── dashboard-config.service.ts    # Templates and configurations
├── chart-extensions.service.ts    # Examples and enhanced configs
└── README.md                      # This documentation

src/scripts/
└── add-charts-example.ts          # Examples of adding new charts
```

## 🎉 Result

With this architecture, adding new charts becomes as simple as:

```typescript
// Add one chart
const config = DashboardConfigService.addChartToConfig(baseConfig, 'monthlyTrend', 'my_table', 'createdAt');

// Add multiple charts
const enhancedConfig = ChartExtensionsService.getEnhancedControlsConfig();
```

No more copying and pasting code! 🚀
