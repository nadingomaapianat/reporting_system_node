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
exports.GrcDashboardService = void 0;
const common_1 = require("@nestjs/common");
const base_dashboard_service_1 = require("../shared/base-dashboard.service");
const dashboard_config_service_1 = require("../shared/dashboard-config.service");
const database_service_1 = require("../database/database.service");
let GrcDashboardService = class GrcDashboardService extends base_dashboard_service_1.BaseDashboardService {
    constructor(databaseService) {
        super(databaseService);
    }
    getConfig() {
        return dashboard_config_service_1.DashboardConfigService.getControlsConfig();
    }
    async getControlsDashboard(startDate, endDate) {
        return this.getDashboardData(startDate, endDate);
    }
    async getTotalControls(page = 1, limit = 10, startDate, endDate) {
        return this.getCardData('total', page, limit, startDate, endDate);
    }
    async getUnmappedControls(page = 1, limit = 10, startDate, endDate) {
        return this.getCardData('unmapped', page, limit, startDate, endDate);
    }
    async getPendingPreparerControls(page = 1, limit = 10, startDate, endDate) {
        return this.getCardData('pendingPreparer', page, limit, startDate, endDate);
    }
    async getPendingCheckerControls(page = 1, limit = 10, startDate, endDate) {
        return this.getCardData('pendingChecker', page, limit, startDate, endDate);
    }
    async getPendingReviewerControls(page = 1, limit = 10, startDate, endDate) {
        return this.getCardData('pendingReviewer', page, limit, startDate, endDate);
    }
    async getPendingAcceptanceControls(page = 1, limit = 10, startDate, endDate) {
        return this.getCardData('pendingAcceptance', page, limit, startDate, endDate);
    }
    async getTestsPendingPreparer(page = 1, limit = 10, startDate, endDate) {
        return this.getCardData('testsPendingPreparer', page, limit, startDate, endDate);
    }
    async getTestsPendingChecker(page = 1, limit = 10, startDate, endDate) {
        return this.getCardData('testsPendingChecker', page, limit, startDate, endDate);
    }
    async getTestsPendingReviewer(page = 1, limit = 10, startDate, endDate) {
        return this.getCardData('testsPendingReviewer', page, limit, startDate, endDate);
    }
    async getTestsPendingAcceptance(page = 1, limit = 10, startDate, endDate) {
        return this.getCardData('testsPendingAcceptance', page, limit, startDate, endDate);
    }
    async getUnmappedIcofrControls(page = 1, limit = 10, startDate, endDate) {
        return this.getCardData('unmappedIcofrControls', page, limit, startDate, endDate);
    }
    async getUnmappedNonIcofrControls(page = 1, limit = 10, startDate, endDate) {
        return this.getCardData('unmappedNonIcofrControls', page, limit, startDate, endDate);
    }
    async getControlsByQuarter(quarter, page = 1, limit = 10, startDate, endDate) {
        try {
            const match = quarter.match(/Q(\d+)\s+(\d+)/);
            if (!match) {
                throw new Error('Invalid quarter format. Expected format: "Q1 2024"');
            }
            const quarterNum = parseInt(match[1]);
            const year = parseInt(match[2]);
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            let query = `
        SELECT 
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        WHERE c.isDeleted = 0
          AND YEAR(c.createdAt) = @param0
          AND DATEPART(QUARTER, c.createdAt) = @param1
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET @param2 ROWS
        FETCH NEXT @param3 ROWS ONLY
      `;
            const offset = (page - 1) * limit;
            const result = await this.databaseService.query(query, [year, quarterNum, offset, limit]);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Controls] c
        WHERE c.isDeleted = 0
          AND YEAR(c.createdAt) = @param0
          AND DATEPART(QUARTER, c.createdAt) = @param1
          ${dateFilter}
      `;
            const countResult = await this.databaseService.query(countQuery, [year, quarterNum]);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by quarter:', error);
            throw error;
        }
    }
    async getControlsByDepartment(department, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const query = `
        SELECT 
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        JOIN dbo.[ControlFunctions] cf ON c.id = cf.control_id
        JOIN dbo.[Functions] f ON cf.function_id = f.id
        WHERE c.isDeleted = 0
          AND f.name = @param0
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET @param1 ROWS
        FETCH NEXT @param2 ROWS ONLY
      `;
            const result = await this.databaseService.query(query, [department, offset, limit]);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Controls] c
        JOIN dbo.[ControlFunctions] cf ON c.id = cf.control_id
        JOIN dbo.[Functions] f ON cf.function_id = f.id
        WHERE c.isDeleted = 0
          AND f.name = @param0
          ${dateFilter}
      `;
            const countResult = await this.databaseService.query(countQuery, [department]);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by department:', error);
            throw error;
        }
    }
    async getControlsByType(type, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const isNotSpecified = type === 'Not Specified';
            const typeCondition = isNotSpecified ? '(c.type IS NULL OR c.type = \'\')' : 'c.type = @param0';
            const params = isNotSpecified ? [offset, limit] : [type, offset, limit];
            const query = `
        SELECT 
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        WHERE c.isDeleted = 0
          AND ${typeCondition}
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET ${isNotSpecified ? '@param0' : '@param1'} ROWS
        FETCH NEXT ${isNotSpecified ? '@param1' : '@param2'} ROWS ONLY
      `;
            const result = await this.databaseService.query(query, params);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Controls] c
        WHERE c.isDeleted = 0
          AND ${typeCondition}
          ${dateFilter}
      `;
            const countParams = isNotSpecified ? [] : [type];
            const countResult = await this.databaseService.query(countQuery, countParams);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by type:', error);
            throw error;
        }
    }
    async getControlsByLevel(level, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const isNotSpecified = level === 'Not Specified';
            const levelCondition = isNotSpecified ? '(c.entityLevel IS NULL OR c.entityLevel = \'\')' : 'c.entityLevel = @param0';
            const params = isNotSpecified ? [offset, limit] : [level, offset, limit];
            const query = `
        SELECT 
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        WHERE c.isDeleted = 0
          AND ${levelCondition}
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET ${isNotSpecified ? '@param0' : '@param1'} ROWS
        FETCH NEXT ${isNotSpecified ? '@param1' : '@param2'} ROWS ONLY
      `;
            const result = await this.databaseService.query(query, params);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Controls] c
        WHERE c.isDeleted = 0
          AND ${levelCondition}
          ${dateFilter}
      `;
            const countParams = isNotSpecified ? [] : [level];
            const countResult = await this.databaseService.query(countQuery, countParams);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by level:', error);
            throw error;
        }
    }
    async getControlsByFrequency(frequency, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const query = `
        SELECT 
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        WHERE c.isDeleted = 0
          AND c.frequency = @param0
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET @param1 ROWS
        FETCH NEXT @param2 ROWS ONLY
      `;
            const result = await this.databaseService.query(query, [frequency, offset, limit]);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Controls] c
        WHERE c.isDeleted = 0
          AND c.frequency = @param0
          ${dateFilter}
      `;
            const countResult = await this.databaseService.query(countQuery, [frequency]);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by frequency:', error);
            throw error;
        }
    }
    async getControlsByRiskResponse(riskResponse, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const isUnknown = riskResponse === 'Unknown' || riskResponse === 'NULL' || riskResponse === '';
            const riskResponseCondition = isUnknown
                ? '(c.risk_response IS NULL OR c.risk_response = \'\')'
                : 'c.risk_response = @param0';
            const params = isUnknown ? [offset, limit] : [riskResponse, offset, limit];
            const query = `
        SELECT 
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        WHERE c.isDeleted = 0
          AND ${riskResponseCondition}
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET ${isUnknown ? '@param0' : '@param1'} ROWS
        FETCH NEXT ${isUnknown ? '@param1' : '@param2'} ROWS ONLY
      `;
            const result = await this.databaseService.query(query, params);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Controls] c
        WHERE c.isDeleted = 0
          AND ${riskResponseCondition}
          ${dateFilter}
      `;
            const countParams = isUnknown ? [] : [riskResponse];
            const countResult = await this.databaseService.query(countQuery, countParams);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by risk response:', error);
            throw error;
        }
    }
    async getControlsByAntiFraud(antiFraud, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const antiFraudValue = antiFraud === 'Anti-Fraud' ? 1 : 0;
            const query = `
        SELECT 
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        WHERE c.isDeleted = 0
          AND c.AntiFraud = @param0
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET @param1 ROWS
        FETCH NEXT @param2 ROWS ONLY
      `;
            const result = await this.databaseService.query(query, [antiFraudValue, offset, limit]);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Controls] c
        WHERE c.isDeleted = 0
          AND c.AntiFraud = @param0
          ${dateFilter}
      `;
            const countResult = await this.databaseService.query(countQuery, [antiFraudValue]);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by anti-fraud:', error);
            throw error;
        }
    }
    async getControlsByIcofrStatus(icofrStatus, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const isIcofr = icofrStatus === 'ICOFR';
            const query = `
        SELECT 
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        LEFT JOIN dbo.[Assertions] a ON c.icof_id = a.id AND a.isDeleted = 0
        WHERE c.isDeleted = 0
          ${isIcofr ? `AND a.id IS NOT NULL 
          AND (a.C = 1 OR a.E = 1 OR a.A = 1 OR a.V = 1 OR a.O = 1 OR a.P = 1)
          AND a.account_type IN ('Balance Sheet', 'Income Statement')` : `AND (a.id IS NULL OR 
          ((a.C IS NULL OR a.C = 0) AND (a.E IS NULL OR a.E = 0) AND (a.A IS NULL OR a.A = 0) 
          AND (a.V IS NULL OR a.V = 0) AND (a.O IS NULL OR a.O = 0) AND (a.P IS NULL OR a.P = 0))
          OR a.account_type NOT IN ('Balance Sheet', 'Income Statement'))`}
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET @param0 ROWS
        FETCH NEXT @param1 ROWS ONLY
      `;
            const result = await this.databaseService.query(query, [offset, limit]);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Controls] c
        LEFT JOIN dbo.[Assertions] a ON c.icof_id = a.id AND a.isDeleted = 0
        WHERE c.isDeleted = 0
          ${isIcofr ? `AND a.id IS NOT NULL 
          AND (a.C = 1 OR a.E = 1 OR a.A = 1 OR a.V = 1 OR a.O = 1 OR a.P = 1)
          AND a.account_type IN ('Balance Sheet', 'Income Statement')` : `AND (a.id IS NULL OR 
          ((a.C IS NULL OR a.C = 0) AND (a.E IS NULL OR a.E = 0) AND (a.A IS NULL OR a.A = 0) 
          AND (a.V IS NULL OR a.V = 0) AND (a.O IS NULL OR a.O = 0) AND (a.P IS NULL OR a.P = 0))
          OR a.account_type NOT IN ('Balance Sheet', 'Income Statement'))`}
          ${dateFilter}
      `;
            const countResult = await this.databaseService.query(countQuery, []);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by ICOFR status:', error);
            throw error;
        }
    }
    async getFocusPointsByPrinciple(principle, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'point.createdAt');
            const offset = (page - 1) * limit;
            const query = `
        SELECT 
          NULL as focus_point_code,
          point.name as focus_point_name,
          point.createdAt as created_at
        FROM dbo.[CosoPoints] point
        JOIN dbo.[CosoPrinciples] prin ON point.principle_id = prin.id AND prin.deletedAt IS NULL
        WHERE prin.name = @param0
          AND point.deletedAt IS NULL
          ${dateFilter}
        ORDER BY point.createdAt DESC
        OFFSET @param1 ROWS
        FETCH NEXT @param2 ROWS ONLY
      `;
            const result = await this.databaseService.query(query, [principle, offset, limit]);
            const countQuery = `
        SELECT COUNT(point.id) as total
        FROM dbo.[CosoPoints] point
        JOIN dbo.[CosoPrinciples] prin ON point.principle_id = prin.id AND prin.deletedAt IS NULL
        WHERE prin.name = @param0
          AND point.deletedAt IS NULL
          ${dateFilter}
      `;
            const countResult = await this.databaseService.query(countQuery, [principle]);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.focus_point_code || null,
                    name: row.focus_point_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching focus points by principle:', error);
            throw error;
        }
    }
    async getControlsByComponent(component, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const query = `
        SELECT DISTINCT
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        JOIN dbo.[ControlCosos] ccx ON c.id = ccx.control_id AND ccx.deletedAt IS NULL
        JOIN dbo.[CosoPoints] point ON ccx.coso_id = point.id AND point.deletedAt IS NULL
        JOIN dbo.[CosoPrinciples] pr ON point.principle_id = pr.id AND pr.deletedAt IS NULL
        JOIN dbo.[CosoComponents] cc ON pr.component_id = cc.id AND cc.deletedAt IS NULL
        WHERE c.isDeleted = 0
          AND cc.name = @param0
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET @param1 ROWS
        FETCH NEXT @param2 ROWS ONLY
      `;
            const result = await this.databaseService.query(query, [component, offset, limit]);
            const countQuery = `
        SELECT COUNT(DISTINCT c.id) as total
        FROM dbo.[Controls] c
        JOIN dbo.[ControlCosos] ccx ON c.id = ccx.control_id AND ccx.deletedAt IS NULL
        JOIN dbo.[CosoPoints] point ON ccx.coso_id = point.id AND point.deletedAt IS NULL
        JOIN dbo.[CosoPrinciples] pr ON point.principle_id = pr.id AND pr.deletedAt IS NULL
        JOIN dbo.[CosoComponents] cc ON pr.component_id = cc.id AND cc.deletedAt IS NULL
        WHERE c.isDeleted = 0
          AND cc.name = @param0
          ${dateFilter}
      `;
            const countResult = await this.databaseService.query(countQuery, [component]);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by component:', error);
            throw error;
        }
    }
    async getFocusPointsByComponent(component, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'point.createdAt');
            const offset = (page - 1) * limit;
            const query = `
        SELECT 
          NULL as focus_point_code,
          point.name as focus_point_name,
          point.createdAt as created_at
        FROM dbo.[CosoPoints] point
        JOIN dbo.[CosoPrinciples] prin ON point.principle_id = prin.id AND prin.deletedAt IS NULL
        JOIN dbo.[CosoComponents] comp ON prin.component_id = comp.id AND comp.deletedAt IS NULL
        WHERE point.deletedAt IS NULL
          AND comp.name = @param0
          ${dateFilter}
        ORDER BY point.createdAt DESC
        OFFSET @param1 ROWS
        FETCH NEXT @param2 ROWS ONLY
      `;
            const result = await this.databaseService.query(query, [component, offset, limit]);
            const countQuery = `
        SELECT COUNT(point.id) as total
        FROM dbo.[CosoPoints] point
        JOIN dbo.[CosoPrinciples] prin ON point.principle_id = prin.id AND prin.deletedAt IS NULL
        JOIN dbo.[CosoComponents] comp ON prin.component_id = comp.id AND comp.deletedAt IS NULL
        WHERE point.deletedAt IS NULL
          AND comp.name = @param0
          ${dateFilter}
      `;
            const countResult = await this.databaseService.query(countQuery, [component]);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.focus_point_code || null,
                    name: row.focus_point_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching focus points by component:', error);
            throw error;
        }
    }
    async getControlsByDepartmentAndKeyControl(department, keyControl, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const isKeyControl = keyControl === 'Key Controls' || keyControl === '1' || keyControl === 'true';
            const keyControlValue = isKeyControl ? 1 : 0;
            const isUnassigned = department === 'Unassigned Department';
            const departmentCondition = isUnassigned
                ? '(jt.name IS NULL OR jt.name = \'\')'
                : 'jt.name = @param0';
            const params = isUnassigned ? [keyControlValue, offset, limit] : [department, keyControlValue, offset, limit];
            const query = `
        SELECT 
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        LEFT JOIN dbo.[JobTitles] jt ON c.departmentId = jt.id
        WHERE c.isDeleted = 0
          AND c.keyControl = ${isUnassigned ? '@param0' : '@param1'}
          AND ${departmentCondition}
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET ${isUnassigned ? '@param1' : '@param2'} ROWS
        FETCH NEXT ${isUnassigned ? '@param2' : '@param3'} ROWS ONLY
      `;
            const result = await this.databaseService.query(query, params);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Controls] c
        LEFT JOIN dbo.[JobTitles] jt ON c.departmentId = jt.id
        WHERE c.isDeleted = 0
          AND c.keyControl = ${isUnassigned ? '@param0' : '@param1'}
          AND ${departmentCondition}
          ${dateFilter}
      `;
            const countParams = isUnassigned ? [keyControlValue] : [department, keyControlValue];
            const countResult = await this.databaseService.query(countQuery, countParams);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by department and key control:', error);
            throw error;
        }
    }
    async getControlsByProcessAndKeyControl(process, keyControl, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const isKeyControl = keyControl === 'Key Controls' || keyControl === '1' || keyControl === 'true';
            const keyControlValue = isKeyControl ? 1 : 0;
            const isUnassigned = process === 'Unassigned Process';
            const processCondition = isUnassigned
                ? '(p.name IS NULL OR p.name = \'\')'
                : 'p.name = @param0';
            const params = isUnassigned ? [keyControlValue, offset, limit] : [process, keyControlValue, offset, limit];
            const query = `
        SELECT 
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        LEFT JOIN dbo.[ControlProcesses] cp ON c.id = cp.control_id
        LEFT JOIN dbo.[Processes] p ON cp.process_id = p.id
        WHERE c.isDeleted = 0
          AND c.keyControl = ${isUnassigned ? '@param0' : '@param1'}
          AND ${processCondition}
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET ${isUnassigned ? '@param1' : '@param2'} ROWS
        FETCH NEXT ${isUnassigned ? '@param2' : '@param3'} ROWS ONLY
      `;
            const result = await this.databaseService.query(query, params);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Controls] c
        LEFT JOIN dbo.[ControlProcesses] cp ON c.id = cp.control_id
        LEFT JOIN dbo.[Processes] p ON cp.process_id = p.id
        WHERE c.isDeleted = 0
          AND c.keyControl = ${isUnassigned ? '@param0' : '@param1'}
          AND ${processCondition}
          ${dateFilter}
      `;
            const countParams = isUnassigned ? [keyControlValue] : [process, keyControlValue];
            const countResult = await this.databaseService.query(countQuery, countParams);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by process and key control:', error);
            throw error;
        }
    }
    async getControlsByBusinessUnitAndKeyControl(businessUnit, keyControl, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const isKeyControl = keyControl === 'Key Controls' || keyControl === '1' || keyControl === 'true';
            const keyControlValue = isKeyControl ? 1 : 0;
            const query = `
        SELECT 
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[ControlFunctions] cf
        JOIN dbo.[Functions] f ON cf.function_id = f.id
        JOIN dbo.[Controls] c ON cf.control_id = c.id
        WHERE c.isDeleted = 0
          AND f.name = @param0
          AND c.keyControl = @param1
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET @param2 ROWS
        FETCH NEXT @param3 ROWS ONLY
      `;
            const result = await this.databaseService.query(query, [businessUnit, keyControlValue, offset, limit]);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[ControlFunctions] cf
        JOIN dbo.[Functions] f ON cf.function_id = f.id
        JOIN dbo.[Controls] c ON cf.control_id = c.id
        WHERE c.isDeleted = 0
          AND f.name = @param0
          AND c.keyControl = @param1
          ${dateFilter}
      `;
            const countResult = await this.databaseService.query(countQuery, [businessUnit, keyControlValue]);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by business unit and key control:', error);
            throw error;
        }
    }
    async getControlsByAssertion(assertionName, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const isUnassigned = assertionName === 'Unassigned Assertion';
            const assertionCondition = isUnassigned
                ? '(a.name IS NULL OR a.name = \'\')'
                : 'a.name = @param0';
            const params = isUnassigned ? [offset, limit] : [assertionName, offset, limit];
            const query = `
        SELECT 
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        LEFT JOIN dbo.[Assertions] a ON c.icof_id = a.id AND a.isDeleted = 0
        WHERE c.isDeleted = 0
          AND ${assertionCondition}
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET ${isUnassigned ? '@param0' : '@param1'} ROWS
        FETCH NEXT ${isUnassigned ? '@param1' : '@param2'} ROWS ONLY
      `;
            const result = await this.databaseService.query(query, params);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Controls] c
        LEFT JOIN dbo.[Assertions] a ON c.icof_id = a.id AND a.isDeleted = 0
        WHERE c.isDeleted = 0
          AND ${assertionCondition}
          ${dateFilter}
      `;
            const countParams = isUnassigned ? [] : [assertionName];
            const countResult = await this.databaseService.query(countQuery, countParams);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by assertion:', error);
            throw error;
        }
    }
    async getControlsByComponentAndIcofrStatus(component, icofrStatus, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            let icofrWhereCondition = '';
            if (icofrStatus === 'ICOFR') {
                icofrWhereCondition = `
          AND c.icof_id IS NOT NULL 
          AND (a.C = 1 OR a.E = 1 OR a.A = 1 OR a.V = 1 OR a.O = 1 OR a.P = 1) 
          AND (a.account_type IN ('Balance Sheet', 'Income Statement'))
        `;
            }
            else if (icofrStatus === 'Non-ICOFR') {
                icofrWhereCondition = `
          AND (
            c.icof_id IS NULL 
            OR ((a.C IS NULL OR a.C = 0) AND (a.E IS NULL OR a.E = 0) AND (a.A IS NULL OR a.A = 0) 
                AND (a.V IS NULL OR a.V = 0) AND (a.O IS NULL OR a.O = 0) AND (a.P IS NULL OR a.P = 0)) 
            OR a.account_type NOT IN ('Balance Sheet', 'Income Statement')
          )
        `;
            }
            else if (icofrStatus === 'Other') {
                icofrWhereCondition = `
          AND c.icof_id IS NOT NULL 
          AND NOT (
            (a.C = 1 OR a.E = 1 OR a.A = 1 OR a.V = 1 OR a.O = 1 OR a.P = 1) 
            AND (a.account_type IN ('Balance Sheet', 'Income Statement'))
          )
          AND NOT (
            ((a.C IS NULL OR a.C = 0) AND (a.E IS NULL OR a.E = 0) AND (a.A IS NULL OR a.A = 0) 
                AND (a.V IS NULL OR a.V = 0) AND (a.O IS NULL OR a.O = 0) AND (a.P IS NULL OR a.P = 0)) 
            OR a.account_type NOT IN ('Balance Sheet', 'Income Statement')
          )
        `;
            }
            const query = `
        SELECT DISTINCT
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Controls] c
        LEFT JOIN dbo.[Assertions] a ON c.icof_id = a.id AND (a.isDeleted = 0 OR a.id IS NULL)
        JOIN dbo.[ControlCosos] ccx ON c.id = ccx.control_id AND ccx.deletedAt IS NULL
        JOIN dbo.[CosoPoints] point ON ccx.coso_id = point.id AND point.deletedAt IS NULL
        JOIN dbo.[CosoPrinciples] prin ON point.principle_id = prin.id AND prin.deletedAt IS NULL
        JOIN dbo.[CosoComponents] comp ON prin.component_id = comp.id AND comp.deletedAt IS NULL
        WHERE c.isDeleted = 0
          AND comp.name = @param0
          ${icofrWhereCondition}
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET @param1 ROWS
        FETCH NEXT @param2 ROWS ONLY
      `;
            const result = await this.databaseService.query(query, [component, offset, limit]);
            const countQuery = `
        SELECT COUNT(DISTINCT c.id) as total
        FROM dbo.[Controls] c
        LEFT JOIN dbo.[Assertions] a ON c.icof_id = a.id AND (a.isDeleted = 0 OR a.id IS NULL)
        JOIN dbo.[ControlCosos] ccx ON c.id = ccx.control_id AND ccx.deletedAt IS NULL
        JOIN dbo.[CosoPoints] point ON ccx.coso_id = point.id AND point.deletedAt IS NULL
        JOIN dbo.[CosoPrinciples] prin ON point.principle_id = prin.id AND prin.deletedAt IS NULL
        JOIN dbo.[CosoComponents] comp ON prin.component_id = comp.id AND comp.deletedAt IS NULL
        WHERE c.isDeleted = 0
          AND comp.name = @param0
          ${icofrWhereCondition}
          ${dateFilter}
      `;
            const countResult = await this.databaseService.query(countQuery, [component]);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by component and ICOFR status:', error);
            throw error;
        }
    }
    async getControlsByFunctionQuarterYear(functionName, quarter, year, columnType, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'c.createdAt');
            const offset = (page - 1) * limit;
            const quarterMap = {
                1: 'quarterOne',
                2: 'quarterTwo',
                3: 'quarterThree',
                4: 'quarterFour'
            };
            const quarterValue = quarterMap[quarter] || 'quarterOne';
            let additionalCondition = '';
            if (columnType === 'Controls Submitted') {
                additionalCondition = ` AND c.preparerStatus = 'sent' AND c.acceptanceStatus = 'approved'`;
            }
            else if (columnType === 'Tests Approved') {
                additionalCondition = ` AND cdt.preparerStatus = 'sent' AND cdt.acceptanceStatus = 'approved'`;
            }
            const query = `
        SELECT DISTINCT
          c.code as control_code,
          c.name as control_name,
          c.createdAt as created_at
        FROM dbo.[Functions] f
        JOIN dbo.[ControlFunctions] cf ON f.id = cf.function_id
        JOIN dbo.[Controls] c ON cf.control_id = c.id AND c.isDeleted = 0
        LEFT JOIN dbo.[ControlDesignTests] cdt ON c.id = cdt.control_id 
          AND cdt.function_id = f.id 
          AND cdt.quarter = @param1
          AND cdt.year = @param2
          AND cdt.deletedAt IS NULL
        WHERE f.name = @param0
          AND cdt.id IS NOT NULL
          ${additionalCondition}
          ${dateFilter}
        ORDER BY c.createdAt DESC
        OFFSET @param3 ROWS
        FETCH NEXT @param4 ROWS ONLY
      `;
            const result = await this.databaseService.query(query, [functionName, quarterValue, year, offset, limit]);
            const countQuery = `
        SELECT COUNT(DISTINCT c.id) as total
        FROM dbo.[Functions] f
        JOIN dbo.[ControlFunctions] cf ON f.id = cf.function_id
        JOIN dbo.[Controls] c ON cf.control_id = c.id AND c.isDeleted = 0
        LEFT JOIN dbo.[ControlDesignTests] cdt ON c.id = cdt.control_id 
          AND cdt.function_id = f.id 
          AND cdt.quarter = @param1
          AND cdt.year = @param2
          AND cdt.deletedAt IS NULL
        WHERE f.name = @param0
          AND cdt.id IS NOT NULL
          ${additionalCondition}
          ${dateFilter}
      `;
            const countResult = await this.databaseService.query(countQuery, [functionName, quarterValue, year]);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.control_code || 'N/A',
                    name: row.control_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching controls by function, quarter, and year:', error);
            throw error;
        }
    }
    async getActionPlansByStatus(status, page = 1, limit = 10, startDate, endDate) {
        try {
            const dateFilter = this.buildDateFilterForQuery(startDate, endDate, 'a.createdAt');
            const offset = (page - 1) * limit;
            const isOverdue = status === 'Overdue';
            const query = `
        SELECT 
          NULL as action_plan_code,
          a.control_procedure as action_plan_name,
          a.createdAt as created_at
        FROM dbo.[Actionplans] a
        WHERE a.deletedAt IS NULL
          AND (CASE 
            WHEN a.done = 0 AND a.implementation_date < GETDATE() THEN 'Overdue'
            ELSE 'Not Overdue'
          END) = @param0
          ${dateFilter}
        ORDER BY a.createdAt DESC
        OFFSET @param1 ROWS
        FETCH NEXT @param2 ROWS ONLY
      `;
            const result = await this.databaseService.query(query, [status, offset, limit]);
            const countQuery = `
        SELECT COUNT(*) as total
        FROM dbo.[Actionplans] a
        WHERE a.deletedAt IS NULL
          AND (CASE 
            WHEN a.done = 0 AND a.implementation_date < GETDATE() THEN 'Overdue'
            ELSE 'Not Overdue'
          END) = @param0
          ${dateFilter}
      `;
            const countResult = await this.databaseService.query(countQuery, [status]);
            const total = countResult[0]?.total || 0;
            return {
                data: result.map((row) => ({
                    code: row.action_plan_code || null,
                    name: row.action_plan_name || 'N/A',
                    createdAt: row.created_at || null
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching action plans by status:', error);
            throw error;
        }
    }
    buildDateFilterForQuery(startDate, endDate, field = 'createdAt') {
        let filter = '';
        if (startDate && startDate.trim()) {
            const escapedStartDate = startDate.replace(/'/g, "''");
            filter += ` AND ${field} >= '${escapedStartDate}'`;
        }
        if (endDate && endDate.trim()) {
            const escapedEndDate = endDate.replace(/'/g, "''");
            filter += ` AND ${field} <= '${escapedEndDate}'`;
        }
        return filter;
    }
};
exports.GrcDashboardService = GrcDashboardService;
exports.GrcDashboardService = GrcDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], GrcDashboardService);
//# sourceMappingURL=grc-dashboard.service.js.map