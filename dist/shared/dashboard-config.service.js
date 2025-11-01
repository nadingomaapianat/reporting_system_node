"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DashboardConfigService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardConfigService = void 0;
const common_1 = require("@nestjs/common");
const db_config_1 = require("./db-config");
let DashboardConfigService = DashboardConfigService_1 = class DashboardConfigService {
    static getControlsConfig() {
        return {
            name: 'Controls Dashboard',
            tableName: 'dbo.[Controls]',
            dateField: 'createdAt',
            metrics: [
                {
                    id: 'total',
                    name: 'Total Controls',
                    query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE isDeleted = 0 AND deletedAt IS NULL AND 1=1 {dateFilter}`,
                    color: 'blue',
                    icon: 'chart-bar'
                },
                {
                    id: 'testsPendingPreparer',
                    name: 'Control Tests pending Preparer',
                    query: `SELECT COUNT(DISTINCT t.id) AS total
            FROM ${(0, db_config_1.fq)('ControlDesignTests')} AS t
            INNER JOIN ${(0, db_config_1.fq)('Controls')} AS c ON c.id = t.control_id
            WHERE (t.preparerStatus <> 'sent' OR t.preparerStatus IS NULL) AND t.function_id IS NOT NULL AND c.isDeleted = 0 AND c.deletedAt IS NULL {dateFilter}`,
                    color: 'orange',
                    icon: 'clock'
                },
                {
                    id: 'testsPendingChecker',
                    name: 'Control Tests pending Checker',
                    query: `SELECT COUNT(DISTINCT t.id) AS total
            FROM ${(0, db_config_1.fq)('ControlDesignTests')} AS t
            INNER JOIN ${(0, db_config_1.fq)('Controls')} AS c ON c.id = t.control_id
            WHERE (t.checkerStatus <> 'approved' OR t.checkerStatus IS NULL) AND t.function_id IS NOT NULL AND c.isDeleted = 0 AND c.deletedAt IS NULL {dateFilter}`,
                    color: 'purple',
                    icon: 'check-circle'
                },
                {
                    id: 'testsPendingReviewer',
                    name: 'Control Tests pending Reviewer',
                    query: `SELECT COUNT(DISTINCT t.id) AS total
            FROM ${(0, db_config_1.fq)('ControlDesignTests')} AS t
            INNER JOIN ${(0, db_config_1.fq)('Controls')} AS c ON c.id = t.control_id
            WHERE (t.reviewerStatus <> 'approved' OR t.reviewerStatus IS NULL) AND t.function_id IS NOT NULL AND c.isDeleted = 0 AND c.deletedAt IS NULL {dateFilter}`,
                    color: 'indigo',
                    icon: 'document-check'
                },
                {
                    id: 'testsPendingAcceptance',
                    name: 'Control Tests pending Acceptance',
                    query: `SELECT COUNT(DISTINCT t.id) AS total
            FROM ${(0, db_config_1.fq)('ControlDesignTests')} AS t
            INNER JOIN ${(0, db_config_1.fq)('Controls')} AS c ON c.id = t.control_id
            WHERE (t.acceptanceStatus <> 'approved' OR t.acceptanceStatus IS NULL) AND t.function_id IS NOT NULL AND c.isDeleted = 0 AND c.deletedAt IS NULL {dateFilter}`,
                    color: 'red',
                    icon: 'exclamation-triangle'
                },
                {
                    id: 'pendingPreparer',
                    name: 'Pending Preparer',
                    query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE (preparerStatus != 'sent' OR preparerStatus IS NULL) AND deletedAt IS NULL AND isDeleted = 0 AND 1=1 {dateFilter}`,
                    color: 'orange',
                    icon: 'clock'
                },
                {
                    id: 'pendingChecker',
                    name: 'Pending Checker',
                    query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE (checkerStatus != 'approved' OR checkerStatus IS NULL) AND deletedAt IS NULL AND isDeleted = 0 AND 1=1 {dateFilter}`,
                    color: 'purple',
                    icon: 'check-circle'
                },
                {
                    id: 'pendingReviewer',
                    name: 'Pending Reviewer',
                    query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE (reviewerStatus != 'approved' OR reviewerStatus IS NULL) AND deletedAt IS NULL AND isDeleted = 0 AND 1=1 {dateFilter}`,
                    color: 'indigo',
                    icon: 'document-check'
                },
                {
                    id: 'pendingAcceptance',
                    name: 'Pending Acceptance',
                    query: `SELECT COUNT(*) as total FROM dbo.[Controls] WHERE (acceptanceStatus != 'approved' OR acceptanceStatus IS NULL) AND deletedAt IS NULL AND isDeleted = 0 AND 1=1 {dateFilter}`,
                    color: 'red',
                    icon: 'exclamation-triangle'
                },
                {
                    id: 'unmapped',
                    name: 'Unmapped Controls',
                    query: `SELECT COUNT(*) as total FROM ${(0, db_config_1.fq)('Controls')} c WHERE c.isDeleted = 0 {dateFilter} AND NOT EXISTS (SELECT 1 FROM ${(0, db_config_1.fq)('ControlCosos')} ccx WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL)`,
                    color: 'yellow',
                    icon: 'exclamation-triangle'
                },
                {
                    id: 'unmappedIcofrControls',
                    name: 'Unmapped ICOFR Controls to COSO',
                    query: `SELECT COUNT(*) AS total FROM ${(0, db_config_1.fq)('Controls')} c JOIN ${(0, db_config_1.fq)('Assertions')} a ON c.icof_id = a.id WHERE c.isDeleted = 0 {dateFilter} AND c.icof_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ${(0, db_config_1.fq)('ControlCosos')} ccx WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL) AND ((a.C = 1 OR a.E = 1 OR a.A = 1 OR a.V = 1 OR a.O = 1 OR a.P = 1) AND a.account_type IN ('Balance Sheet', 'Income Statement')) AND a.isDeleted = 0`,
                    color: 'red',
                    icon: 'exclamation-triangle'
                },
                {
                    id: 'unmappedNonIcofrControls',
                    name: 'Unmapped Non-ICOFR Controls to COSO',
                    query: `SELECT COUNT(*) AS total FROM ${(0, db_config_1.fq)('Controls')} c LEFT JOIN ${(0, db_config_1.fq)('Assertions')} a ON c.icof_id = a.id WHERE c.isDeleted = 0 {dateFilter} AND NOT EXISTS (SELECT 1 FROM ${(0, db_config_1.fq)('ControlCosos')} ccx WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL) AND (c.icof_id IS NULL OR ((a.C IS NULL OR a.C = 0) AND (a.E IS NULL OR a.E = 0) AND (a.A IS NULL OR a.A = 0) AND (a.V IS NULL OR a.V = 0) AND (a.O IS NULL OR a.O = 0) AND (a.P IS NULL OR a.P = 0) OR a.account_type NOT IN ('Balance Sheet', 'Income Statement'))) AND (a.isDeleted = 0 OR a.id IS NULL)`,
                    color: 'orange',
                    icon: 'exclamation-triangle'
                }
            ],
            charts: [
                {
                    id: 'departmentDistribution',
                    name: 'Distribution by Department',
                    type: 'bar',
                    query: `SELECT 
            f.name as name,
            COUNT(c.id) as value
          FROM ${(0, db_config_1.fq)('Controls')} c
          JOIN ${(0, db_config_1.fq)('ControlFunctions')} cf ON c.id = cf.control_id
          JOIN ${(0, db_config_1.fq)('Functions')} f ON cf.function_id = f.id
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY f.name
          ORDER BY COUNT(c.id) DESC, f.name`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                this.CHART_TEMPLATES.statusDistribution('dbo.[Controls]', 'risk_response'),
                {
                    id: 'quarterlyControlCreationTrend',
                    name: 'Quarterly Control Creation Trend',
                    type: 'line',
                    query: `SELECT 
            CONCAT('Q', DATEPART(QUARTER, c.createdAt), ' ', YEAR(c.createdAt)) AS name,
            COUNT(c.id) AS value
          FROM ${(0, db_config_1.fq)('Controls')} c
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY YEAR(c.createdAt), DATEPART(QUARTER, c.createdAt)
          ORDER BY YEAR(c.createdAt), DATEPART(QUARTER, c.createdAt)`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'controlsByType',
                    name: 'Controls by Type',
                    type: 'pie',
                    query: `SELECT 
            CASE 
              WHEN c.type IS NULL OR c.type = '' THEN 'Not Specified'
              ELSE c.type
            END AS name,
            COUNT(c.id) AS value
          FROM ${(0, db_config_1.fq)('Controls')} c
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY c.type
          ORDER BY COUNT(c.id) DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'antiFraudDistribution',
                    name: 'Anti-Fraud vs Non Anti-Fraud Controls',
                    type: 'pie',
                    query: `SELECT 
            CASE 
              WHEN c.AntiFraud = 1 THEN 'Anti-Fraud'
              WHEN c.AntiFraud = 0 THEN 'Non-Anti-Fraud'
              ELSE 'Unknown'
            END AS name,
            COUNT(c.id) AS value
          FROM ${(0, db_config_1.fq)('Controls')} c
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY c.AntiFraud
          ORDER BY COUNT(c.id) DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'controlsPerLevel',
                    name: 'Controls per Control Level',
                    type: 'bar',
                    query: `SELECT 
            CASE 
              WHEN c.entityLevel IS NULL OR c.entityLevel = '' THEN 'Not Specified'
              ELSE c.entityLevel
            END AS name,
            COUNT(c.id) AS value
          FROM ${(0, db_config_1.fq)('Controls')} c
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY c.entityLevel
          ORDER BY COUNT(c.id) DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'controlExecutionFrequency',
                    name: 'Control Execution Frequency',
                    type: 'bar',
                    query: `SELECT 
            CASE 
              WHEN c.frequency = 'Daily' THEN 'Daily'
              WHEN c.frequency = 'Event Base' THEN 'Event Base'
              WHEN c.frequency = 'Weekly' THEN 'Weekly'
              WHEN c.frequency = 'Monthly' THEN 'Monthly'
              WHEN c.frequency = 'Quarterly' THEN 'Quarterly'
              WHEN c.frequency = 'Semi Annually' THEN 'Semi Annually'
              WHEN c.frequency = 'Annually' THEN 'Annually'
              WHEN c.frequency IS NULL OR c.frequency = '' THEN 'Not Specified'
              ELSE c.frequency
            END AS name,
            COUNT(c.id) AS value
          FROM ${(0, db_config_1.fq)('Controls')} c
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY c.frequency
          ORDER BY COUNT(c.id) DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'numberOfControlsByIcofrStatus',
                    name: 'Number of Controls by ICOFR Status',
                    type: 'pie',
                    query: `SELECT 
            CASE 
              WHEN a.id IS NULL THEN 'Non-ICOFR'
              WHEN (a.C = 1 OR a.E = 1 OR a.A = 1 OR a.V = 1 OR a.O = 1 OR a.P = 1)
                   AND (a.account_type IN ('Balance Sheet', 'Income Statement')) 
                THEN 'ICOFR' 
              ELSE 'Non-ICOFR' 
            END AS name,
            COUNT(c.id) AS value
          FROM ${(0, db_config_1.fq)('Controls')} c
          LEFT JOIN ${(0, db_config_1.fq)('Assertions')} a ON c.icof_id = a.id AND a.isDeleted = 0
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY 
            CASE 
              WHEN a.id IS NULL THEN 'Non-ICOFR'
              WHEN (a.C = 1 OR a.E = 1 OR a.A = 1 OR a.V = 1 OR a.O = 1 OR a.P = 1)
                   AND (a.account_type IN ('Balance Sheet', 'Income Statement')) 
                THEN 'ICOFR' 
              ELSE 'Non-ICOFR' 
            END
          ORDER BY COUNT(c.id) DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'numberOfFocusPointsPerPrinciple',
                    name: 'Number of Focus Points per Principle',
                    type: 'bar',
                    query: `SELECT 
            prin.name AS name,
            COUNT(point.id) AS value
          FROM ${(0, db_config_1.fq)('CosoPrinciples')} prin
          LEFT JOIN ${(0, db_config_1.fq)('CosoPoints')} point ON prin.id = point.principle_id
          WHERE prin.deletedAt IS NULL {dateFilter}
          GROUP BY prin.name
          ORDER BY COUNT(point.id) DESC, prin.name`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'numberOfFocusPointsPerComponent',
                    name: 'Number of Focus Points per Component',
                    type: 'pie',
                    query: `SELECT 
            comp.name AS name,
            COUNT(point.id) AS value
          FROM ${(0, db_config_1.fq)('CosoComponents')} comp
          JOIN ${(0, db_config_1.fq)('CosoPrinciples')} prin ON prin.component_id = comp.id
          LEFT JOIN ${(0, db_config_1.fq)('CosoPoints')} point ON point.principle_id = prin.id
          WHERE comp.deletedAt IS NULL AND prin.deletedAt IS NULL {dateFilter}
          GROUP BY comp.name
          ORDER BY COUNT(point.id) DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'actionPlansStatus',
                    name: 'Action Plans Status',
                    type: 'pie',
                    query: `SELECT 
            CASE 
              WHEN a.done = 0 AND a.implementation_date < GETDATE() THEN 'Overdue'
              ELSE 'Not Overdue'
            END AS name,
            COUNT(a.id) AS value
          FROM ${(0, db_config_1.fq)('Actionplans')} a
          WHERE a.deletedAt IS NULL {dateFilter}
          GROUP BY 
            CASE 
              WHEN a.done = 0 AND a.implementation_date < GETDATE() THEN 'Overdue'
              ELSE 'Not Overdue'
            END
          ORDER BY COUNT(a.id) DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'numberOfControlsPerComponent',
                    name: 'Number of Controls per Component',
                    type: 'bar',
                    query: `SELECT 
            cc.name AS name,
            COUNT(DISTINCT c.id) AS value
          FROM ${(0, db_config_1.fq)('Controls')} c
          JOIN ${(0, db_config_1.fq)('ControlCosos')} ccx ON c.id = ccx.control_id
          JOIN ${(0, db_config_1.fq)('CosoPoints')} cp ON ccx.coso_id = cp.id
          JOIN ${(0, db_config_1.fq)('CosoPrinciples')} pr ON cp.principle_id = pr.id
          JOIN ${(0, db_config_1.fq)('CosoComponents')} cc ON pr.component_id = cc.id
          WHERE c.isDeleted = 0 
            AND ccx.deletedAt IS NULL 
            AND cp.deletedAt IS NULL 
            AND pr.deletedAt IS NULL 
            AND cc.deletedAt IS NULL {dateFilter}
          GROUP BY cc.name
          ORDER BY COUNT(DISTINCT c.id) DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                }
            ],
            tables: [
                {
                    id: 'statusOverview',
                    name: 'Control Creation Approval Cycle',
                    query: `SELECT 
            c.id AS id,
            c.name AS name,
            c.createdAt,
            c.code AS code,
            STRING_AGG(f.name, ', ') WITHIN GROUP (ORDER BY f.name) AS business_unit,
            c.preparerStatus,
            c.checkerStatus,
            c.reviewerStatus,
            c.acceptanceStatus
          FROM ${(0, db_config_1.fq)('Controls')} c
          LEFT JOIN ${(0, db_config_1.fq)('ControlFunctions')} cf ON cf.control_id = c.id
          LEFT JOIN ${(0, db_config_1.fq)('Functions')} f ON f.id = cf.function_id
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY 
            c.id,
            c.name,
            c.createdAt,
            c.code,
            c.preparerStatus,
            c.checkerStatus,
            c.reviewerStatus,
            c.acceptanceStatus
          ORDER BY 
            c.createdAt DESC,
            c.name`,
                    columns: [
                        { key: 'id', label: 'ID', type: 'text' },
                        { key: 'name', label: 'Name', type: 'text' },
                        { key: 'code', label: 'Code', type: 'text' },
                        { key: 'business_unit', label: 'Business Unit', type: 'text' },
                        { key: 'preparerStatus', label: 'Preparer Status', type: 'status' },
                        { key: 'checkerStatus', label: 'Checker Status', type: 'status' },
                        { key: 'reviewerStatus', label: 'Reviewer Status', type: 'status' },
                        { key: 'acceptanceStatus', label: 'Acceptance Status', type: 'status' }
                    ],
                    pagination: true
                },
                {
                    id: 'controlsTestingApprovalCycle',
                    name: 'Controls Testing Approval Cycle',
                    query: `SELECT 
            c.name AS [Control Name],
            c.createdAt AS [Created At],
            c.id AS [Control ID],
            c.code AS [Code],
            t.preparerStatus AS [Preparer Status],
            t.checkerStatus AS [Checker Status],
            t.reviewerStatus AS [Reviewer Status],
            t.acceptanceStatus AS [Acceptance Status],
            f.name AS [Business Unit]
          FROM ${(0, db_config_1.fq)('ControlDesignTests')} AS t
          INNER JOIN ${(0, db_config_1.fq)('Controls')} AS c ON t.control_id = c.id
          INNER JOIN ${(0, db_config_1.fq)('Functions')} AS f ON t.function_id = f.id
          WHERE c.isDeleted = 0 AND (t.deletedAt IS NULL) AND t.function_id IS NOT NULL {dateFilter}
          ORDER BY c.createdAt DESC, c.name`,
                    columns: [
                        { key: 'index', label: 'Index', type: 'number' },
                        { key: 'Code', label: 'Code', type: 'text' },
                        { key: 'Control Name', label: 'Control Name', type: 'text' },
                        { key: 'Business Unit', label: 'Business Unit', type: 'text' },
                        { key: 'Preparer Status', label: 'Preparer Status', type: 'status' },
                        { key: 'Checker Status', label: 'Checker Status', type: 'status' },
                        { key: 'Reviewer Status', label: 'Reviewer Status', type: 'status' },
                        { key: 'Acceptance Status', label: 'Acceptance Status', type: 'status' }
                    ],
                    pagination: true
                },
                {
                    id: 'controlsByFunction',
                    name: 'Controls by Function',
                    query: `SELECT 
            f.name as function_name,
            c.id as control_id,
            c.name as control_name,
            c.code as control_code
          FROM ${(0, db_config_1.fq)('Controls')} c
          JOIN ${(0, db_config_1.fq)('ControlFunctions')} cf ON c.id = cf.control_id
          JOIN ${(0, db_config_1.fq)('Functions')} f ON cf.function_id = f.id
          WHERE c.isDeleted = 0 {dateFilter}
          ORDER BY c.createdAt DESC, f.name, c.name`,
                    columns: [
                        { key: 'function_name', label: 'Function/Department', type: 'text' },
                        { key: 'control_id', label: 'Control ID', type: 'number' },
                        { key: 'control_code', label: 'Control Code', type: 'text' },
                        { key: 'control_name', label: 'Control Name', type: 'text' }
                    ],
                    pagination: true
                },
                {
                    id: 'keyNonKeyControlsPerDepartment',
                    name: 'Key vs Non-Key Controls per Department',
                    query: `SELECT 
            COALESCE(jt.name, 'Unassigned Department') AS [Department],
            SUM(CASE WHEN c.keyControl = 1 THEN 1 ELSE 0 END) AS [Key Controls],
            SUM(CASE WHEN c.keyControl = 0 THEN 1 ELSE 0 END) AS [Non-Key Controls],
            COUNT(c.id) AS [Total Controls]
          FROM ${(0, db_config_1.fq)('Controls')} c
          LEFT JOIN ${(0, db_config_1.fq)('JobTitles')} jt ON c.departmentId = jt.id
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY COALESCE(jt.name, 'Unassigned Department'), c.departmentId
          ORDER BY COUNT(c.id) DESC, COALESCE(jt.name, 'Unassigned Department')`,
                    columns: [
                        { key: 'Department', label: 'Department', type: 'text' },
                        { key: 'Key Controls', label: 'Key Controls', type: 'number' },
                        { key: 'Non-Key Controls', label: 'Non-Key Controls', type: 'number' },
                        { key: 'Total Controls', label: 'Total Controls', type: 'number' }
                    ],
                    pagination: true
                },
                {
                    id: 'keyNonKeyControlsPerProcess',
                    name: 'Key vs Non-Key Controls per Process',
                    query: `SELECT 
            CASE 
              WHEN p.name IS NULL THEN 'Unassigned Process'
              ELSE p.name
            END AS [Process],
            SUM(CASE WHEN c.keyControl = 1 THEN 1 ELSE 0 END) AS [Key Controls],
            SUM(CASE WHEN c.keyControl = 0 THEN 1 ELSE 0 END) AS [Non-Key Controls],
            COUNT(c.id) AS [Total Controls]
          FROM ${(0, db_config_1.fq)('Controls')} c
          LEFT JOIN ${(0, db_config_1.fq)('ControlProcesses')} cp ON c.id = cp.control_id
          LEFT JOIN ${(0, db_config_1.fq)('Processes')} p ON cp.process_id = p.id
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY 
            CASE 
              WHEN p.name IS NULL THEN 'Unassigned Process'
              ELSE p.name
            END
          ORDER BY COUNT(c.id) DESC, 
            CASE 
              WHEN p.name IS NULL THEN 'Unassigned Process'
              ELSE p.name
            END`,
                    columns: [
                        { key: 'Process', label: 'Process', type: 'text' },
                        { key: 'Key Controls', label: 'Key Controls', type: 'number' },
                        { key: 'Non-Key Controls', label: 'Non-Key Controls', type: 'number' },
                        { key: 'Total Controls', label: 'Total Controls', type: 'number' }
                    ],
                    pagination: true
                },
                {
                    id: 'keyNonKeyControlsPerBusinessUnit',
                    name: 'Key vs Non-Key Controls per Business Unit',
                    query: `SELECT 
            f.name AS [Business Unit],
            SUM(CASE WHEN c.keyControl = 1 THEN 1 ELSE 0 END) AS [Key Controls],
            SUM(CASE WHEN c.keyControl = 0 THEN 1 ELSE 0 END) AS [Non-Key Controls],
            COUNT(c.id) AS [Total Controls]
          FROM ${(0, db_config_1.fq)('ControlFunctions')} cf
          JOIN ${(0, db_config_1.fq)('Functions')} f ON cf.function_id = f.id
          JOIN ${(0, db_config_1.fq)('Controls')} c ON cf.control_id = c.id
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY f.name
          ORDER BY COUNT(c.id) DESC, f.name`,
                    columns: [
                        { key: 'Business Unit', label: 'Business Unit', type: 'text' },
                        { key: 'Key Controls', label: 'Key Controls', type: 'number' },
                        { key: 'Non-Key Controls', label: 'Non-Key Controls', type: 'number' },
                        { key: 'Total Controls', label: 'Total Controls', type: 'number' }
                    ],
                    pagination: true
                },
                {
                    id: 'controlCountByAssertionName',
                    name: 'Control Count by Account',
                    query: `SELECT 
            COALESCE(a.name, 'Unassigned Assertion') AS [Assertion Name],
            COALESCE(a.account_type, 'Not Specified') AS [Type],
            COUNT(c.id) AS [Control Count]
          FROM ${(0, db_config_1.fq)('Controls')} c
          LEFT JOIN ${(0, db_config_1.fq)('Assertions')} a ON c.icof_id = a.id AND a.isDeleted = 0
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY a.name, a.account_type
          ORDER BY COUNT(c.id) DESC, a.name`,
                    columns: [
                        { key: 'Assertion Name', label: 'Account', type: 'text' },
                        { key: 'Type', label: 'Type', type: 'text' },
                        { key: 'Control Count', label: 'Control Count', type: 'number' }
                    ],
                    pagination: true
                },
                {
                    id: 'icofrControlCoverageByCoso',
                    name: 'ICOFR Control Coverage by COSO Component',
                    query: `SELECT 
            comp.name AS [Component], 
            CASE 
              WHEN c.icof_id IS NOT NULL 
                AND (a.C = 1 OR a.E = 1 OR a.A = 1 OR a.V = 1 OR a.O = 1 OR a.P = 1) 
                AND (a.account_type IN ('Balance Sheet', 'Income Statement')) 
              THEN 'ICOFR' 
              WHEN c.icof_id IS NULL 
                OR ((a.C IS NULL OR a.C = 0) AND (a.E IS NULL OR a.E = 0) AND (a.A IS NULL OR a.A = 0) 
                    AND (a.V IS NULL OR a.V = 0) AND (a.O IS NULL OR a.O = 0) AND (a.P IS NULL OR a.P = 0)) 
                OR a.account_type NOT IN ('Balance Sheet', 'Income Statement')
              THEN 'Non-ICOFR'
              ELSE 'Other'
            END AS [IcofrStatus], 
            COUNT(DISTINCT c.id) AS [Control Count]
          FROM ${(0, db_config_1.fq)('Controls')} c
          LEFT JOIN ${(0, db_config_1.fq)('Assertions')} a ON c.icof_id = a.id AND (a.isDeleted = 0 OR a.id IS NULL)
          JOIN ${(0, db_config_1.fq)('ControlCosos')} ccx ON c.id = ccx.control_id AND ccx.deletedAt IS NULL
          JOIN ${(0, db_config_1.fq)('CosoPoints')} point ON ccx.coso_id = point.id AND point.deletedAt IS NULL
          JOIN ${(0, db_config_1.fq)('CosoPrinciples')} prin ON point.principle_id = prin.id AND prin.deletedAt IS NULL
          JOIN ${(0, db_config_1.fq)('CosoComponents')} comp ON prin.component_id = comp.id AND comp.deletedAt IS NULL
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY comp.name, 
            CASE 
              WHEN c.icof_id IS NOT NULL 
                AND (a.C = 1 OR a.E = 1 OR a.A = 1 OR a.V = 1 OR a.O = 1 OR a.P = 1) 
                AND (a.account_type IN ('Balance Sheet', 'Income Statement')) 
              THEN 'ICOFR' 
              WHEN c.icof_id IS NULL 
                OR ((a.C IS NULL OR a.C = 0) AND (a.E IS NULL OR a.E = 0) AND (a.A IS NULL OR a.A = 0) 
                    AND (a.V IS NULL OR a.V = 0) AND (a.O IS NULL OR a.O = 0) AND (a.P IS NULL OR a.P = 0)) 
                OR a.account_type NOT IN ('Balance Sheet', 'Income Statement')
              THEN 'Non-ICOFR'
              ELSE 'Other'
            END
          ORDER BY comp.name, [IcofrStatus]`,
                    columns: [
                        { key: 'Component', label: 'Component', type: 'text' },
                        { key: 'IcofrStatus', label: 'ICOFR Status', type: 'text' },
                        { key: 'Control Count', label: 'Control Count', type: 'number' }
                    ],
                    pagination: true
                },
                {
                    id: 'actionPlanForAdequacy',
                    name: 'Action Plan for Adequacy',
                    query: `SELECT 
            COALESCE(c.name, 'N/A') AS [Control Name], 
            COALESCE(f.name, 'N/A') AS [Function Name], 
            ap.factor AS [Factor], 
            ap.riskType AS [Risk Treatment], 
            ap.control_procedure AS [Control Procedure], 
            ap.[type] AS [Control Procedure Type], 
            ap.responsible AS [Action Plan Owner], 
            ap.expected_cost AS [Expected Cost], 
            ap.business_unit AS [Business Unit Status], 
            ap.meeting_date AS [Meeting Date], 
            ap.implementation_date AS [Expected Implementation Date], 
            ap.not_attend AS [Did Not Attend]
          FROM ${(0, db_config_1.fq)('Actionplans')} ap
          LEFT JOIN ${(0, db_config_1.fq)('ControlDesignTests')} cdt ON ap.controlDesignTest_id = cdt.id AND cdt.deletedAt IS NULL
          LEFT JOIN ${(0, db_config_1.fq)('Controls')} c ON cdt.control_id = c.id AND c.isDeleted = 0
          LEFT JOIN ${(0, db_config_1.fq)('Functions')} f ON cdt.function_id = f.id AND f.deletedAt IS NULL
          WHERE ap.[from] = 'adequacy' 
            AND ap.deletedAt IS NULL AND ap.controlDesignTest_id IS NOT NULL {dateFilter}
          ORDER BY ap.createdAt DESC`,
                    columns: [
                        { key: 'Control Name', label: 'Control Name', type: 'text' },
                        { key: 'Function Name', label: 'Function Name', type: 'text' },
                        { key: 'Factor', label: 'Factor', type: 'text' },
                        { key: 'Risk Treatment', label: 'Risk Treatment', type: 'text' },
                        { key: 'Control Procedure', label: 'Control Procedure', type: 'text' },
                        { key: 'Control Procedure Type', label: 'Control Procedure Type', type: 'text' },
                        { key: 'Action Plan Owner', label: 'Action Plan Owner', type: 'text' },
                        { key: 'Expected Cost', label: 'Expected Cost', type: 'currency' },
                        { key: 'Business Unit Status', label: 'Business Unit Status', type: 'text' },
                        { key: 'Meeting Date', label: 'Meeting Date', type: 'date' },
                        { key: 'Expected Implementation Date', label: 'Expected Implementation Date', type: 'date' },
                        { key: 'Did Not Attend', label: 'Did Not Attend', type: 'text' }
                    ],
                    pagination: true
                },
                {
                    id: 'actionPlanForEffectiveness',
                    name: 'Action Plan for Effectiveness',
                    query: `SELECT 
            COALESCE(c.name, 'N/A') AS [Control Name], 
            COALESCE(f.name, 'N/A') AS [Function Name], 
            ap.factor AS [Factor], 
            ap.riskType AS [Risk Treatment], 
            ap.control_procedure AS [Control Procedure], 
            ap.[type] AS [Control Procedure Type], 
            ap.responsible AS [Action Plan Owner], 
            ap.expected_cost AS [Expected Cost], 
            ap.business_unit AS [Business Unit Status], 
            ap.meeting_date AS [Meeting Date], 
            ap.implementation_date AS [Expected Implementation Date], 
            ap.not_attend AS [Did Not Attend]
          FROM ${(0, db_config_1.fq)('Actionplans')} ap
          LEFT JOIN ${(0, db_config_1.fq)('ControlDesignTests')} cdt ON ap.controlDesignTest_id = cdt.id AND cdt.deletedAt IS NULL
          LEFT JOIN ${(0, db_config_1.fq)('Controls')} c ON cdt.control_id = c.id AND c.isDeleted = 0
          LEFT JOIN ${(0, db_config_1.fq)('ControlFunctions')} cf ON c.id = cf.control_id
          LEFT JOIN ${(0, db_config_1.fq)('Functions')} f ON cf.function_id = f.id
          WHERE ap.[from] = 'effective' 
            AND ap.deletedAt IS NULL AND ap.controlDesignTest_id IS NOT NULL {dateFilter}
          ORDER BY ap.createdAt DESC`,
                    columns: [
                        { key: 'Control Name', label: 'Control Name', type: 'text' },
                        { key: 'Function Name', label: 'Function Name', type: 'text' },
                        { key: 'Factor', label: 'Factor', type: 'text' },
                        { key: 'Risk Treatment', label: 'Risk Treatment', type: 'text' },
                        { key: 'Control Procedure', label: 'Control Procedure', type: 'text' },
                        { key: 'Control Procedure Type', label: 'Control Procedure Type', type: 'text' },
                        { key: 'Action Plan Owner', label: 'Action Plan Owner', type: 'text' },
                        { key: 'Expected Cost', label: 'Expected Cost', type: 'currency' },
                        { key: 'Business Unit Status', label: 'Business Unit Status', type: 'text' },
                        { key: 'Meeting Date', label: 'Meeting Date', type: 'date' },
                        { key: 'Expected Implementation Date', label: 'Expected Implementation Date', type: 'date' },
                        { key: 'Did Not Attend', label: 'Did Not Attend', type: 'text' }
                    ],
                    pagination: true
                },
                {
                    id: 'controlSubmissionStatusByQuarterFunction',
                    name: 'Control Submission Status by Quarter and Function',
                    query: `SELECT 
            c.name AS [Control Name], 
            f.name AS [Function Name], 
            CASE WHEN cdt.quarter = 'quarterOne' THEN 1 
                 WHEN cdt.quarter = 'quarterTwo' THEN 2 
                 WHEN cdt.quarter = 'quarterThree' THEN 3 
                 WHEN cdt.quarter = 'quarterFour' THEN 4 
                 ELSE NULL END AS [Quarter], 
            cdt.year AS [Year], 
            -- Submitted? (Control-level full approval cycle)
            CASE WHEN ( c.preparerStatus = 'sent' AND c.acceptanceStatus = 'approved' ) 
                 THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS [Control Submitted?], 
            -- Approved? (ControlDesignTests-level full approval cycle)
            CASE WHEN ( cdt.preparerStatus = 'sent' AND cdt.acceptanceStatus = 'approved' ) 
                 THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS [Test Approved?] 
          FROM ${(0, db_config_1.fq)('ControlDesignTests')} cdt 
          JOIN ${(0, db_config_1.fq)('Controls')} c ON cdt.control_id = c.id 
          JOIN ${(0, db_config_1.fq)('Functions')} f ON cdt.function_id = f.id 
          WHERE c.isDeleted = 0 AND cdt.deletedAt IS NULL {dateFilter}
          ORDER BY c.createdAt DESC`,
                    columns: [
                        { key: 'Control Name', label: 'Control Name', type: 'text' },
                        { key: 'Function Name', label: 'Function Name', type: 'text' },
                        { key: 'Quarter', label: 'Quarter', type: 'number' },
                        { key: 'Year', label: 'Year', type: 'number' },
                        { key: 'Control Submitted?', label: 'Control Submitted?', type: 'boolean' },
                        { key: 'Test Approved?', label: 'Test Approved?', type: 'boolean' }
                    ],
                    pagination: true
                },
                {
                    id: 'functionsWithFullyTestedControlTests',
                    name: 'Functions with Fully Tested Control Tests',
                    query: `SELECT 
            f.name AS [Function Name],
            CASE WHEN cdt.quarter = 'quarterOne' THEN 1 
                 WHEN cdt.quarter = 'quarterTwo' THEN 2 
                 WHEN cdt.quarter = 'quarterThree' THEN 3 
                 WHEN cdt.quarter = 'quarterFour' THEN 4 
                 ELSE NULL END AS [Quarter],
            cdt.year AS [Year],
            COUNT(DISTINCT c.id) AS [Total Controls],
            COUNT(DISTINCT CASE WHEN (c.preparerStatus = 'sent' AND c.acceptanceStatus = 'approved') THEN c.id END) AS [Controls Submitted],
            COUNT(DISTINCT CASE WHEN (cdt.preparerStatus = 'sent' AND cdt.acceptanceStatus = 'approved') THEN c.id END) AS [Tests Approved]
          FROM ${(0, db_config_1.fq)('Functions')} AS f 
          JOIN ${(0, db_config_1.fq)('ControlFunctions')} AS cf ON f.id = cf.function_id 
          JOIN ${(0, db_config_1.fq)('Controls')} AS c ON cf.control_id = c.id AND c.isDeleted = 0 
          LEFT JOIN ${(0, db_config_1.fq)('ControlDesignTests')} AS cdt ON cdt.control_id = c.id AND cdt.deletedAt IS NULL 
          WHERE 1=1 {dateFilter}
          GROUP BY f.name, cdt.quarter, cdt.year
          ORDER BY f.name, cdt.year, cdt.quarter`,
                    columns: [
                        { key: 'Function Name', label: 'Function Name', type: 'text' },
                        { key: 'Quarter', label: 'Quarter', type: 'number' },
                        { key: 'Year', label: 'Year', type: 'number' },
                        { key: 'Total Controls', label: 'Total Controls', type: 'number' },
                        { key: 'Controls Submitted', label: 'Controls Submitted', type: 'number' },
                        { key: 'Tests Approved', label: 'Tests Approved', type: 'number' }
                    ],
                    pagination: true
                },
                {
                    id: 'controlsNotMappedToAssertions',
                    name: 'Controls not mapped to any Account',
                    query: `SELECT 
            c.name AS [Control Name], 
            f.name AS [Function Name]
          FROM ${(0, db_config_1.fq)('Controls')} c
          LEFT JOIN ${(0, db_config_1.fq)('ControlFunctions')} cf ON cf.control_id = c.id 
          LEFT JOIN ${(0, db_config_1.fq)('Functions')} f ON f.id = cf.function_id 
          WHERE c.icof_id IS NULL AND c.isDeleted = 0 {dateFilter}
          ORDER BY c.createdAt DESC`,
                    columns: [
                        { key: 'Control Name', label: 'Control Name', type: 'text' },
                        { key: 'Function Name', label: 'Function Name', type: 'text' }
                    ],
                    pagination: true
                },
                {
                    id: 'controlsNotMappedToPrinciples',
                    name: 'Controls not mapped to any Principles',
                    query: `SELECT 
            c.name AS [Control Name], 
            f.name AS [Function Name]
          FROM ${(0, db_config_1.fq)('Controls')} c
          LEFT JOIN ${(0, db_config_1.fq)('ControlFunctions')} cf ON cf.control_id = c.id 
          LEFT JOIN ${(0, db_config_1.fq)('Functions')} f ON f.id = cf.function_id 
          LEFT JOIN ${(0, db_config_1.fq)('ControlCosos')} ccx ON ccx.control_id = c.id AND ccx.deletedAt IS NULL 
          WHERE ccx.control_id IS NULL AND c.isDeleted = 0 {dateFilter}
          ORDER BY c.createdAt DESC`,
                    columns: [
                        { key: 'Control Name', label: 'Control Name', type: 'text' },
                        { key: 'Function Name', label: 'Function Name', type: 'text' }
                    ],
                    pagination: true
                }
            ]
        };
    }
    static getIncidentsConfig() {
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
    static getRisksConfig() {
        return {
            name: 'Risks Dashboard',
            tableName: 'dbo.[Risks]',
            dateField: 'createdAt',
            metrics: [
                {
                    id: 'total',
                    name: 'Total Risks',
                    query: `SELECT COUNT(*) as total FROM dbo.[Risks] WHERE isDeleted = 0 AND 1=1 {dateFilter}`,
                    color: 'red',
                    icon: 'chart-bar'
                },
                {
                    id: 'high',
                    name: 'High Risks',
                    query: `SELECT COUNT(*) as total FROM dbo.[Risks] WHERE isDeleted = 0 AND inherent_value = 'High' AND 1=1 {dateFilter}`,
                    color: 'orange',
                    icon: 'exclamation-triangle'
                },
                {
                    id: 'medium',
                    name: 'Medium Risks',
                    query: `SELECT COUNT(*) as total FROM dbo.[Risks] WHERE isDeleted = 0 AND inherent_value = 'Medium' AND 1=1 {dateFilter}`,
                    color: 'yellow',
                    icon: 'exclamation-circle'
                },
                {
                    id: 'low',
                    name: 'Low Risks',
                    query: `SELECT COUNT(*) as total FROM dbo.[Risks] WHERE isDeleted = 0 AND inherent_value = 'Low' AND 1=1 {dateFilter}`,
                    color: 'green',
                    icon: 'shield-check'
                },
                {
                    id: 'reduction',
                    name: 'Risks Reduced',
                    query: `SELECT COUNT(*) as total 
    FROM dbo.[Risks] r
    INNER JOIN dbo.[ResidualRisks] rr ON r.id = rr.riskId
    WHERE r.isDeleted = 0 
      AND rr.isDeleted = 0
      AND rr.quarter = @current_quarter
      AND rr.year = @current_year
      AND (
        CASE 
          WHEN r.inherent_value = 'High' THEN 3 
          WHEN r.inherent_value = 'Medium' THEN 2 
          WHEN r.inherent_value = 'Low' THEN 1 
          ELSE NULL  -- Handle unexpected values
        END
        > 
        CASE 
          WHEN rr.residual_value = 'High' THEN 3 
          WHEN rr.residual_value = 'Medium' THEN 2 
          WHEN rr.residual_value = 'Low' THEN 1 
          ELSE NULL  -- Handle unexpected values
        END
      ) 
      AND r.inherent_value IS NOT NULL  -- Exclude NULL values
      AND rr.residual_value IS NOT NULL {dateFilter}`,
                    color: 'purple',
                    icon: 'arrow-trending-down'
                },
                {
                    id: 'newRisks',
                    name: 'New Risks (This Month)',
                    query: `SELECT COUNT(*) as total FROM dbo.[Risks] WHERE isDeleted = 0 AND DATEDIFF(month, createdAt, GETDATE()) = 0 {dateFilter}`,
                    color: 'indigo',
                    icon: 'sparkles'
                }
            ],
            charts: [
                {
                    id: 'risksByCategory',
                    name: 'Risks by Category',
                    type: 'bar',
                    query: `SELECT 
            ISNULL(c.name, 'Uncategorized') as name,
            COUNT(r.id) as value
          FROM dbo.[Risks] r
          LEFT JOIN dbo.RiskCategories rc ON r.id = rc.risk_id AND rc.isDeleted = 0
          LEFT JOIN dbo.Categories c ON rc.category_id = c.id AND c.isDeleted = 0
          WHERE r.isDeleted = 0 {dateFilter}
          GROUP BY c.name
          ORDER BY value DESC`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'risksByEventType',
                    name: 'Risks by Event Type',
                    type: 'pie',
                    query: `SELECT 
            ISNULL(et.name, 'Unknown') as name,
            COUNT(r.id) as value
          FROM dbo.[Risks] r
          LEFT JOIN dbo.[EventTypes] et ON r.event = et.id
          WHERE r.isDeleted = 0 {dateFilter}
          GROUP BY et.name`,
                    xField: 'name',
                    yField: 'value',
                    labelField: 'name'
                },
                {
                    id: 'createdDeletedRisksPerQuarter',
                    name: 'Created & Deleted Risks Per Quarter',
                    type: 'bar',
                    query: `WITH AllQuarters AS (
            SELECT 1 AS quarter_num, 'Q1 2025' AS quarter_label, CAST('2025-01-01' AS datetime2) AS quarter_start
            UNION ALL SELECT 2, 'Q2 2025', CAST('2025-04-01' AS datetime2)
            UNION ALL SELECT 3, 'Q3 2025', CAST('2025-07-01' AS datetime2)
            UNION ALL SELECT 4, 'Q4 2025', CAST('2025-10-01' AS datetime2)
          ),
          QuarterData AS (
            SELECT 
              DATEPART(quarter, r.createdAt) AS quarter_num,
              'Q' + CAST(DATEPART(quarter, r.createdAt) AS VARCHAR(1)) + ' 2025' AS quarter_label,
              SUM(CASE WHEN r.isDeleted = 0 AND (r.deletedAt IS NULL OR r.deletedAt = '') THEN 1 ELSE 0 END) AS created,
              SUM(CASE WHEN r.isDeleted = 1 OR r.deletedAt IS NOT NULL THEN 1 ELSE 0 END) AS deleted
            FROM dbo.[Risks] r
            WHERE YEAR(r.createdAt) = YEAR(GETDATE()) {dateFilter}
            GROUP BY DATEPART(quarter, r.createdAt), 
                     'Q' + CAST(DATEPART(quarter, r.createdAt) AS VARCHAR(1)) + ' 2025'
          )
          SELECT 
            q.quarter_label AS name,
            ISNULL(qd.created, 0) AS created,
            ISNULL(qd.deleted, 0) AS deleted
          FROM AllQuarters q
          LEFT JOIN QuarterData qd ON q.quarter_num = qd.quarter_num
          ORDER BY q.quarter_num ASC`,
                    xField: 'name',
                    yField: 'created',
                    labelField: 'name'
                },
                {
                    id: 'quarterlyRiskCreationTrends',
                    name: 'Quarterly Risk Creation Trends',
                    type: 'line',
                    query: `SELECT 
            creation_quarter AS creation_quarter, 
            SUM(risk_count) AS [SUM(risk_count)] 
          FROM ( 
            SELECT 
              CONCAT(YEAR(r.createdAt), '-Q', DATEPART(QUARTER, r.createdAt)) AS creation_quarter, 
              COUNT(r.id) AS risk_count 
            FROM dbo.[Risks] r 
            WHERE r.isDeleted = 0 {dateFilter}
            GROUP BY YEAR(r.createdAt), DATEPART(QUARTER, r.createdAt) 
          ) AS virtual_table 
          GROUP BY creation_quarter 
          ORDER BY creation_quarter`,
                    xField: 'creation_quarter',
                    yField: 'SUM(risk_count)',
                    labelField: 'creation_quarter'
                },
                {
                    id: 'riskApprovalStatusDistribution',
                    name: 'Risk Approval Status Distribution',
                    type: 'pie',
                    query: `SELECT 
            CASE 
              WHEN rr.preparerResidualStatus = 'sent' AND rr.acceptanceResidualStatus = 'approved' THEN 'Approved'
              ELSE 'Not Approved'
            END AS approve,
            COUNT(*) AS count
          FROM dbo.[Risks] r
          INNER JOIN dbo.[ResidualRisks] rr ON r.id = rr.riskId
          WHERE r.isDeleted = 0 {dateFilter}
          GROUP BY 
            CASE 
              WHEN rr.preparerResidualStatus = 'sent' AND rr.acceptanceResidualStatus = 'approved' THEN 'Approved'
              ELSE 'Not Approved'
            END
          ORDER BY approve ASC`,
                    xField: 'approve',
                    yField: 'count',
                    labelField: 'approve'
                },
                {
                    id: 'riskDistributionByFinancialImpact',
                    name: 'Risk Distribution by Financial Impact Level',
                    type: 'pie',
                    query: `SELECT 
            CASE 
              WHEN r.inherent_financial_value <= 2 THEN 'Low' 
              WHEN r.inherent_financial_value = 3 THEN 'Medium' 
              WHEN r.inherent_financial_value >= 4 THEN 'High' 
              ELSE 'Unknown' 
            END AS [Financial Status],
            COUNT(*) AS count
          FROM dbo.[Risks] r
          WHERE r.isDeleted = 0 {dateFilter}
          GROUP BY 
            CASE 
              WHEN r.inherent_financial_value <= 2 THEN 'Low' 
              WHEN r.inherent_financial_value = 3 THEN 'Medium' 
              WHEN r.inherent_financial_value >= 4 THEN 'High' 
              ELSE 'Unknown' 
            END
          ORDER BY [Financial Status] ASC`,
                    xField: 'Financial Status',
                    yField: 'count',
                    labelField: 'Financial Status'
                }
            ],
            tables: [
                {
                    id: 'risksPerDepartment',
                    name: 'Total Number of Risks per Department',
                    query: `SELECT
            f.name AS [Functions__name], 
            COUNT(*) AS [count] 
          FROM dbo.[Risks] r
          LEFT JOIN dbo.[RiskFunctions] rf ON r.id = rf.risk_id
          LEFT JOIN dbo.[Functions] f ON rf.function_id = f.id
          WHERE r.isDeleted = 0 {dateFilter}
          GROUP BY f.name
          ORDER BY [count] DESC, f.name ASC`,
                    columns: [
                        { key: 'Functions__name', label: 'Department Name', type: 'text' },
                        { key: 'count', label: 'Risk Count', type: 'number' }
                    ],
                    pagination: true
                },
                {
                    id: 'risksPerBusinessProcess',
                    name: 'Number of Risks per Business Process',
                    query: `SELECT 
            p.name AS process_name, 
            COUNT(rp.risk_id) AS risk_count 
          FROM dbo.[RiskProcesses] rp 
          JOIN dbo.[Processes] p ON rp.process_id = p.id 
          JOIN dbo.[Risks] r ON rp.risk_id = r.id
          WHERE r.isDeleted = 0 {dateFilter}
          GROUP BY p.name 
          ORDER BY risk_count DESC, p.name ASC`,
                    columns: [
                        { key: 'process_name', label: 'Process Name', type: 'text' },
                        { key: 'risk_count', label: 'Risk Count', type: 'number' }
                    ],
                    pagination: true
                },
                {
                    id: 'inherentResidualRiskComparison',
                    name: 'Inherent Risk & Residual Risk Comparison',
                    query: `SELECT 
            r.name AS [Risk Name], 
            d.name AS [Department Name], 
            r.inherent_value AS [Inherent Value], 
            rr.residual_value AS [Residual Value] 
          FROM dbo.[Risks] r
          JOIN dbo.[ResidualRisks] rr ON rr.riskId = r.id 
          LEFT JOIN dbo.[Departments] d ON r.departmentId = d.id 
          WHERE r.isDeleted = 0 AND rr.isDeleted = 0 {dateFilter}
          ORDER BY r.createdAt DESC`,
                    columns: [
                        { key: 'Risk Name', label: 'Risk Name', type: 'text' },
                        { key: 'Department Name', label: 'Department Name', type: 'text' },
                        { key: 'Inherent Value', label: 'Inherent Value', type: 'text' },
                        { key: 'Residual Value', label: 'Residual Value', type: 'text' }
                    ],
                    pagination: true
                },
                {
                    id: 'highResidualRiskOverview',
                    name: 'Inherent vs Residual Risk Comparison',
                    query: `SELECT 
            risk_name AS [Risk Name], 
            residual_level AS [Residual Level], 
            inherent_value AS [Inherent Value], 
            inherent_frequency_label AS [Inherent Frequency], 
            inherent_financial_label AS [Inherent Financial],
            residual_frequency_label AS [Residual Frequency], 
            residual_financial_label AS [Residual Financial],
            quarter AS [Quarter],
            year AS [Year]
          FROM ( 
            SELECT 
              r.name AS risk_name, 
              rr.residual_value AS residual_level, 
              r.inherent_value AS inherent_value,
              r.inherent_frequency AS inherent_frequency,
              r.inherent_financial_value AS inherent_financial_value,
              rr.residual_frequency AS residual_frequency,
              rr.residual_financial_value AS residual_financial_value,
              rr.quarter AS quarter,
              rr.year AS year,
              -- Inherent Frequency Labels
              CASE 
                WHEN r.inherent_frequency = 1 THEN 'Once in Three Years'
                WHEN r.inherent_frequency = 2 THEN 'Annually'
                WHEN r.inherent_frequency = 3 THEN 'Half Yearly'
                WHEN r.inherent_frequency = 4 THEN 'Quarterly'
                WHEN r.inherent_frequency = 5 THEN 'Monthly'
                ELSE 'Unknown'
              END AS inherent_frequency_label,
              -- Inherent Financial Labels
              CASE 
                WHEN r.inherent_financial_value = 1 THEN '0 - 10,000'
                WHEN r.inherent_financial_value = 2 THEN '10,000 - 100,000'
                WHEN r.inherent_financial_value = 3 THEN '100,000 - 1,000,000'
                WHEN r.inherent_financial_value = 4 THEN '1,000,000 - 10,000,000'
                WHEN r.inherent_financial_value = 5 THEN '> 10,000,000'
                ELSE 'Unknown'
              END AS inherent_financial_label,
              -- Residual Frequency Labels
              CASE 
                WHEN rr.residual_frequency = 1 THEN 'Once in Three Years'
                WHEN rr.residual_frequency = 2 THEN 'Annually'
                WHEN rr.residual_frequency = 3 THEN 'Half Yearly'
                WHEN rr.residual_frequency = 4 THEN 'Quarterly'
                WHEN rr.residual_frequency = 5 THEN 'Monthly'
                ELSE 'Unknown'
              END AS residual_frequency_label,
              -- Residual Financial Labels
              CASE 
                WHEN rr.residual_financial_value = 1 THEN '0 - 10,000'
                WHEN rr.residual_financial_value = 2 THEN '10,000 - 100,000'
                WHEN rr.residual_financial_value = 3 THEN '100,000 - 1,000,000'
                WHEN rr.residual_financial_value = 4 THEN '1,000,000 - 10,000,000'
                WHEN rr.residual_financial_value = 5 THEN '> 10,000,000'
                ELSE 'Unknown'
              END AS residual_financial_label
            FROM dbo.[ResidualRisks] rr 
            JOIN dbo.[Risks] r ON rr.riskId = r.id 
            WHERE r.isDeleted = 0 AND rr.residual_value = 'High' {dateFilter}
          ) AS virtual_table
          ORDER BY year DESC, quarter DESC, inherent_value DESC`,
                    columns: [
                        { key: 'Risk Name', label: 'Risk Name', type: 'text' },
                        { key: 'Residual Level', label: 'Residual Level', type: 'text' },
                        { key: 'Inherent Value', label: 'Inherent Value', type: 'text' },
                        { key: 'Inherent Frequency', label: 'Inherent Frequency', type: 'text' },
                        { key: 'Inherent Financial', label: 'Inherent Financial', type: 'text' },
                        { key: 'Residual Frequency', label: 'Residual Frequency', type: 'text' },
                        { key: 'Residual Financial', label: 'Residual Financial', type: 'text' },
                        { key: 'Quarter', label: 'Quarter', type: 'text' },
                        { key: 'Year', label: 'Year', type: 'number' }
                    ],
                    pagination: true
                },
                {
                    id: 'risksAndControlsCount',
                    name: 'Risks and their Controls Count',
                    query: `SELECT 
            r.name AS risk_name, 
            COUNT(DISTINCT rc.control_id) AS control_count 
          FROM dbo.[Risks] r 
          LEFT JOIN dbo.[RiskControls] rc ON r.id = rc.risk_id 
          LEFT JOIN dbo.[Controls] c ON rc.control_id = c.id 
          WHERE r.isDeleted = 0 AND r.deletedAt IS NULL AND c.isDeleted = 0 AND c.deletedAt IS NULL {dateFilter}
          GROUP BY r.name 
          ORDER BY control_count DESC`,
                    columns: [
                        { key: 'risk_name', label: 'Risk Name', type: 'text' },
                        { key: 'control_count', label: 'Control Count', type: 'number' }
                    ],
                    pagination: true
                },
                {
                    id: 'controlsAndRiskCount',
                    name: 'Controls and Risk Count',
                    query: `SELECT 
            c.name AS [Controls__name], 
            COUNT(DISTINCT rc.risk_id) AS [count] 
          FROM dbo.[Controls] c
          LEFT JOIN dbo.[RiskControls] rc ON c.id = rc.control_id 
          LEFT JOIN dbo.[Risks] r ON rc.risk_id = r.id AND r.isDeleted = 0
          WHERE c.isDeleted = 0 {dateFilter}
          GROUP BY c.name 
          ORDER BY [count] DESC, c.name ASC`,
                    columns: [
                        { key: 'Controls__name', label: 'Control Name', type: 'text' },
                        { key: 'count', label: 'Risk Count', type: 'number' }
                    ],
                    pagination: true
                },
                {
                    id: 'risksDetails',
                    name: 'Risks Details',
                    query: `SELECT
            r.name AS [RiskName], 
            r.description AS [RiskDesc], 
            et.name AS [RiskEventName], 
            r.approve AS [RiskApprove], 
            r.inherent_value AS [InherentValue], 
            r.residual_value AS [ResidualValue], 
            r.inherent_frequency AS [InherentFrequency], 
            r.inherent_financial_value AS [InherentFinancialValue], 
            rr.residual_value AS [RiskResidualValue], 
            rr.quarter AS [ResidualQuarter], 
            rr.year AS [ResidualYear] 
          FROM dbo.[Risks] r 
          INNER JOIN dbo.[ResidualRisks] rr ON rr.riskId = r.id AND rr.isDeleted = 0 
          INNER JOIN dbo.[EventTypes] et ON et.id = r.event 
          WHERE r.isDeleted = 0 {dateFilter}
          ORDER BY r.createdAt DESC`,
                    columns: [
                        { key: 'RiskName', label: 'Risk Name', type: 'text' },
                        { key: 'RiskDesc', label: 'Risk Description', type: 'text' },
                        { key: 'RiskEventName', label: 'Risk Event Name', type: 'text' },
                        { key: 'RiskApprove', label: 'Risk Approve', type: 'text' },
                        { key: 'InherentValue', label: 'Inherent Value', type: 'text' },
                        { key: 'ResidualValue', label: 'Residual Value', type: 'text' },
                        { key: 'InherentFrequency', label: 'Inherent Frequency', type: 'text' },
                        { key: 'InherentFinancialValue', label: 'Inherent Financial Value', type: 'text' },
                        { key: 'RiskResidualValue', label: 'Risk Residual Value', type: 'text' },
                        { key: 'ResidualQuarter', label: 'Residual Quarter', type: 'text' },
                        { key: 'ResidualYear', label: 'Residual Year', type: 'number' }
                    ],
                    pagination: true
                }
            ]
        };
    }
    static addChartToConfig(config, chartType, ...args) {
        const newChart = this.CHART_TEMPLATES[chartType](...args);
        return {
            ...config,
            charts: [...config.charts, newChart]
        };
    }
    static addMetricToConfig(config, metricType, ...args) {
        const newMetric = this.METRIC_TEMPLATES[metricType](...args);
        return {
            ...config,
            metrics: [...config.metrics, newMetric]
        };
    }
};
exports.DashboardConfigService = DashboardConfigService;
DashboardConfigService.CHART_TEMPLATES = {
    departmentDistribution: (tableName, countField = 'count') => ({
        id: 'departmentDistribution',
        name: 'Distribution by Department',
        type: 'bar',
        query: `SELECT 'All Controls' as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY 'All Controls' ORDER BY COUNT(*) DESC`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
    }),
    statusDistribution: (tableName, statusField = 'status') => ({
        id: 'statusDistribution',
        name: 'Distribution by Status',
        type: 'pie',
        query: `SELECT ${statusField} as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY ${statusField}`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
    }),
    monthlyTrend: (tableName, dateField = 'createdAt') => ({
        id: 'monthlyTrend',
        name: 'Monthly Trend',
        type: 'line',
        query: `SELECT FORMAT(${dateField}, 'yyyy-MM') as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY FORMAT(${dateField}, 'yyyy-MM') ORDER BY name`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
    }),
    riskDistribution: (tableName, riskField = 'risk_level') => ({
        id: 'riskDistribution',
        name: 'Risk Level Distribution',
        type: 'bar',
        query: `SELECT ${riskField} as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY ${riskField} ORDER BY value DESC`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
    }),
    categoryDistribution: (tableName, categoryField = 'category') => ({
        id: 'categoryDistribution',
        name: 'Category Distribution',
        type: 'pie',
        query: `SELECT ${categoryField} as name, COUNT(*) as value FROM ${tableName} WHERE 1=1 {dateFilter} GROUP BY ${categoryField}`,
        xField: 'name',
        yField: 'value',
        labelField: 'name'
    })
};
DashboardConfigService.METRIC_TEMPLATES = {
    totalCount: (tableName, label, color = 'blue') => ({
        id: 'total',
        name: `Total ${label}`,
        query: `SELECT COUNT(*) as total FROM ${tableName} WHERE isDeleted = 0 AND deletedAt IS NULL AND 1=1 {dateFilter}`,
        color,
        icon: 'chart-bar'
    }),
    pendingCount: (tableName, statusField, label, color = 'yellow') => ({
        id: 'pending',
        name: `Pending ${label}`,
        query: `SELECT COUNT(*) as total FROM ${tableName} WHERE ${statusField} != 'approved' AND 1=1 {dateFilter}`,
        color,
        icon: 'clock'
    }),
    approvedCount: (tableName, statusField, label, color = 'green') => ({
        id: 'approved',
        name: `Approved ${label}`,
        query: `SELECT COUNT(*) as total FROM ${tableName} WHERE ${statusField} = 'approved' AND 1=1 {dateFilter}`,
        color,
        icon: 'check-circle'
    }),
    financialImpact: (tableName, amountField, label, color = 'purple') => ({
        id: 'financialImpact',
        name: `Total ${label} Impact`,
        query: `SELECT SUM(${amountField}) as total FROM ${tableName} WHERE 1=1 {dateFilter}`,
        color,
        icon: 'currency-dollar'
    })
};
DashboardConfigService.TABLE_TEMPLATES = {
    statusOverview: (tableName, idField, nameField, statusFields) => ({
        id: 'statusOverview',
        name: 'Status Overview',
        query: `SELECT ${idField} as id, ${nameField} as name, code, ${statusFields.join(', ')} FROM ${tableName} WHERE 1=1 {dateFilter}`,
        columns: [
            { key: 'id', label: 'ID', type: 'text' },
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'code', label: 'Code', type: 'text' },
            ...statusFields.map(field => ({
                key: field,
                label: field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                type: 'status',
                render: (value) => ({
                    value: value || 'N/A',
                    className: value === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                })
            }))
        ],
        pagination: true
    }),
    financialSummary: (tableName, idField, nameField, amountField) => ({
        id: 'financialSummary',
        name: 'Financial Summary',
        query: `SELECT ${idField} as id, ${nameField} as name, ${amountField} as amount FROM ${tableName} WHERE 1=1 {dateFilter} ORDER BY ${amountField} DESC`,
        columns: [
            { key: 'id', label: 'ID', type: 'text' },
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'amount', label: 'Amount', type: 'currency' }
        ],
        pagination: true
    })
};
exports.DashboardConfigService = DashboardConfigService = DashboardConfigService_1 = __decorate([
    (0, common_1.Injectable)()
], DashboardConfigService);
//# sourceMappingURL=dashboard-config.service.js.map