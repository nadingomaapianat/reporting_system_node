import { Injectable } from '@nestjs/common';
import { BaseDashboardService, DashboardConfig, MetricConfig, ChartConfig, TableConfig } from './base-dashboard.service';

@Injectable()
export class DashboardConfigService {
  // Chart templates for easy reuse
  static readonly CHART_TEMPLATES = {
    departmentDistribution: (tableName: string, countField: string = 'count') => ({
      id: 'departmentDistribution',
      name: 'Distribution by Department',
      type: 'bar' as const,
      query: `SELECT 'All Controls' as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY 'All Controls' ORDER BY COUNT(*) DESC`,
      xField: 'name',
      yField: 'value',
      labelField: 'name'
    }),
    
    statusDistribution: (tableName: string, statusField: string = 'status') => ({
      id: 'statusDistribution', 
      name: 'Distribution by Status',
      type: 'pie' as const,
      query: `SELECT ${statusField} as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY ${statusField}`,
      xField: 'name',
      yField: 'value',
      labelField: 'name'
    }),
    
    monthlyTrend: (tableName: string, dateField: string = 'createdAt') => ({
      id: 'monthlyTrend',
      name: 'Monthly Trend',
      type: 'line' as const,
      query: `SELECT FORMAT(${dateField}, 'yyyy-MM') as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY FORMAT(${dateField}, 'yyyy-MM') ORDER BY name`,
      xField: 'name',
      yField: 'value',
      labelField: 'name'
    }),
    
    riskDistribution: (tableName: string, riskField: string = 'risk_level') => ({
      id: 'riskDistribution',
      name: 'Risk Level Distribution', 
      type: 'bar' as const,
      query: `SELECT ${riskField} as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY ${riskField} ORDER BY value DESC`,
      xField: 'name',
      yField: 'value',
      labelField: 'name'
    }),
    
    categoryDistribution: (tableName: string, categoryField: string = 'category') => ({
      id: 'categoryDistribution',
      name: 'Category Distribution',
      type: 'pie' as const,
      query: `SELECT ${categoryField} as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY ${categoryField}`,
      xField: 'name', 
      yField: 'value',
      labelField: 'name'
    })
  };

  // Metric templates for easy reuse
  static readonly METRIC_TEMPLATES = {
    totalCount: (tableName: string, label: string, color: string = 'blue') => ({
      id: 'total',
      name: `Total ${label}`,
      query: `SELECT COUNT(*) as total FROM ${tableName} WHERE 1=1 {dateFilter}`,
      color,
      icon: 'chart-bar'
    }),
    
    pendingCount: (tableName: string, statusField: string, label: string, color: string = 'yellow') => ({
      id: 'pending',
      name: `Pending ${label}`,
      query: `SELECT COUNT(*) as total FROM ${tableName} WHERE ${statusField} != 'approved' AND 1=1 {dateFilter}`,
      color,
      icon: 'clock'
    }),
    
    approvedCount: (tableName: string, statusField: string, label: string, color: string = 'green') => ({
      id: 'approved',
      name: `Approved ${label}`,
      query: `SELECT COUNT(*) as total FROM ${tableName} WHERE ${statusField} = 'approved' AND 1=1 {dateFilter}`,
      color,
      icon: 'check-circle'
    }),
    
    financialImpact: (tableName: string, amountField: string, label: string, color: string = 'purple') => ({
      id: 'financialImpact',
      name: `Total ${label} Impact`,
      query: `SELECT SUM(${amountField}) as total FROM ${tableName} WHERE 1=1 {dateFilter}`,
      color,
      icon: 'currency-dollar'
    })
  };

  // Table templates for easy reuse
  static readonly TABLE_TEMPLATES = {
    statusOverview: (tableName: string, idField: string, nameField: string, statusFields: string[]) => ({
      id: 'statusOverview',
      name: 'Status Overview',
      query: `SELECT ${idField} as id, ${nameField} as name, code, ${statusFields.join(', ')} FROM ${tableName} WHERE 1=1 {dateFilter}`,
      columns: [
        { key: 'id', label: 'ID', type: 'text' as const },
        { key: 'name', label: 'Name', type: 'text' as const },
        { key: 'code', label: 'Code', type: 'text' as const },
        ...statusFields.map(field => ({
          key: field,
          label: field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: 'status' as const,
          render: (value: any) => ({
            value: value || 'N/A',
            className: value === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          })
        }))
      ],
      pagination: true
    }),
    
    financialSummary: (tableName: string, idField: string, nameField: string, amountField: string) => ({
      id: 'financialSummary',
      name: 'Financial Summary',
      query: `SELECT ${idField} as id, ${nameField} as name, ${amountField} as amount FROM ${tableName} WHERE 1=1 {dateFilter} ORDER BY ${amountField} DESC`,
      columns: [
        { key: 'id', label: 'ID', type: 'text' as const },
        { key: 'name', label: 'Name', type: 'text' as const },
        { key: 'amount', label: 'Amount', type: 'currency' as const }
      ],
      pagination: true
    })
  };

  // Predefined dashboard configurations
  static getControlsConfig(): DashboardConfig {
    return {
      name: 'Controls Dashboard',
      tableName: 'dbo.[Controls]',
      dateField: 'createdAt',
      metrics: [
        {
          id: 'total',
          name: 'Total Controls',
          query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE 1=1 {dateFilter}`,
          color: 'blue',
          icon: 'chart-bar'
        },
        {
          id: 'pendingPreparer',
          name: 'Pending Preparer',
          query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE preparerStatus != 'approved' AND 1=1 {dateFilter}`,
          color: 'orange',
          icon: 'clock'
        },
        {
          id: 'pendingChecker',
          name: 'Pending Checker',
          query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE checkerStatus != 'approved' AND 1=1 {dateFilter}`,
          color: 'purple',
          icon: 'check-circle'
        },
        {
          id: 'pendingReviewer',
          name: 'Pending Reviewer',
          query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE reviewerStatus != 'approved' AND 1=1 {dateFilter}`,
          color: 'indigo',
          icon: 'document-check'
        },
        {
          id: 'pendingAcceptance',
          name: 'Pending Acceptance',
          query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE acceptanceStatus != 'approved' AND 1=1 {dateFilter}`,
          color: 'red',
          icon: 'exclamation-triangle'
        },
        {
          id: 'unmapped',
          name: 'Unmapped Controls',
          query: `SELECT COUNT(*) as total FROM GRCDB2.dbo.Controls c WHERE c.isDeleted = 0 {dateFilter} AND NOT EXISTS (SELECT 1 FROM GRCDB2.dbo.ControlCosos ccx WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL)`,
          color: 'yellow',
          icon: 'exclamation-triangle'
        }
      ],
      charts: [
        {
          id: 'departmentDistribution',
          name: 'Distribution by Department',
          type: 'bar' as const,
          query: `SELECT 
            f.name as name,
            COUNT(c.id) as value
          FROM GRCDB2.dbo.Controls c
          JOIN GRCDB2.dbo.ControlFunctions cf ON c.id = cf.control_id
          JOIN GRCDB2.dbo.Functions f ON cf.function_id = f.id
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY f.name
          ORDER BY COUNT(c.id) DESC`,
          xField: 'name',
          yField: 'value',
          labelField: 'name'
        },
        this.CHART_TEMPLATES.statusDistribution('dbo.[Controls]', 'risk_response')
      ],
      tables: [
        this.TABLE_TEMPLATES.statusOverview(
          'dbo.[Controls]',
          'id',
          'name',
          ['preparerStatus', 'checkerStatus', 'reviewerStatus', 'acceptanceStatus']
        ),
        {
          id: 'controlsByFunction',
          name: 'Controls by Function',
          query: `SELECT 
            f.name as function_name,
            c.id as control_id,
            c.name as control_name,
            c.code as control_code
          FROM GRCDB2.dbo.Controls c
          JOIN GRCDB2.dbo.ControlFunctions cf ON c.id = cf.control_id
          JOIN GRCDB2.dbo.Functions f ON cf.function_id = f.id
          WHERE c.isDeleted = 0 {dateFilter}
          ORDER BY f.name, c.name`,
          columns: [
            { key: 'function_name', label: 'Function/Department', type: 'text' },
            { key: 'control_id', label: 'Control ID', type: 'number' },
            { key: 'control_code', label: 'Control Code', type: 'text' },
            { key: 'control_name', label: 'Control Name', type: 'text' }
          ],
          pagination: true
        }
      ]
    };
  }

  static getIncidentsConfig(): DashboardConfig {
    return {
      name: 'Incidents Dashboard',
      tableName: 'dbo.[Incidents]',
      dateField: 'createdAt',
      metrics: [
        this.METRIC_TEMPLATES.totalCount('dbo.[Incidents]', 'Incidents', 'red'),
        this.METRIC_TEMPLATES.pendingCount('dbo.[Incidents]', 'preparerStatus', 'Preparer', 'orange'),
        this.METRIC_TEMPLATES.pendingCount('dbo.[Incidents]', 'checkerStatus', 'Checker', 'yellow'),
        this.METRIC_TEMPLATES.pendingCount('dbo.[Incidents]', 'reviewerStatus', 'Reviewer', 'purple'),
        this.METRIC_TEMPLATES.pendingCount('dbo.[Incidents]', 'acceptanceStatus', 'Acceptance', 'indigo'),
        this.METRIC_TEMPLATES.financialImpact('dbo.[Incidents]', 'net_loss', 'Financial', 'green')
      ],
      charts: [
        this.CHART_TEMPLATES.categoryDistribution('dbo.[Incidents]', 'category_name'),
        this.CHART_TEMPLATES.statusDistribution('dbo.[Incidents]', 'status'),
        this.CHART_TEMPLATES.monthlyTrend('dbo.[Incidents]')
      ],
      tables: [
        this.TABLE_TEMPLATES.financialSummary('dbo.[Incidents]', 'id', 'title', 'net_loss')
      ]
    };
  }

  static getRisksConfig(): DashboardConfig {
    return {
      name: 'Risks Dashboard', 
      tableName: 'dbo.[Risks]',
      dateField: 'createdAt',
      metrics: [
        this.METRIC_TEMPLATES.totalCount('dbo.[Risks]', 'Risks', 'red'),
        this.METRIC_TEMPLATES.pendingCount('dbo.[Risks]', 'status', 'Pending', 'yellow'),
        this.METRIC_TEMPLATES.approvedCount('dbo.[Risks]', 'status', 'Approved', 'green')
      ],
      charts: [
        this.CHART_TEMPLATES.riskDistribution('dbo.[Risks]', 'risk_level'),
        this.CHART_TEMPLATES.categoryDistribution('dbo.[Risks]', 'category'),
        this.CHART_TEMPLATES.monthlyTrend('dbo.[Risks]')
      ],
      tables: [
        this.TABLE_TEMPLATES.statusOverview('dbo.[Risks]', 'id', 'name', ['status', 'risk_level'])
      ]
    };
  }

  // Easy method to add new charts to existing dashboards
  static addChartToConfig(config: DashboardConfig, chartType: keyof typeof DashboardConfigService.CHART_TEMPLATES, ...args: any[]): DashboardConfig {
    const newChart = (this.CHART_TEMPLATES[chartType] as any)(...args);
    return {
      ...config,
      charts: [...config.charts, newChart]
    };
  }

  // Easy method to add new metrics to existing dashboards
  static addMetricToConfig(config: DashboardConfig, metricType: keyof typeof DashboardConfigService.METRIC_TEMPLATES, ...args: any[]): DashboardConfig {
    const newMetric = (this.METRIC_TEMPLATES[metricType] as any)(...args);
    return {
      ...config,
      metrics: [...config.metrics, newMetric]
    };
  }
}
