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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrcDashboardController = void 0;
const common_1 = require("@nestjs/common");
const grc_dashboard_service_1 = require("./grc-dashboard.service");
let GrcDashboardController = class GrcDashboardController {
    constructor(grcDashboardService) {
        this.grcDashboardService = grcDashboardService;
    }
    async getControlsDashboard(req, startDate, endDate, functionId) {
        try {
            return await this.grcDashboardService.getControlsDashboard(req.user, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error in getControlsDashboard:', error);
            throw error;
        }
    }
    async getTotalControls(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcDashboardService.getTotalControls(req.user, page, limit, startDate, endDate, functionId);
    }
    async getUnmappedControls(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcDashboardService.getUnmappedControls(req.user, page, limit, startDate, endDate, functionId);
    }
    async getPendingPreparerControls(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcDashboardService.getPendingPreparerControls(req.user, page, limit, startDate, endDate);
    }
    async getPendingCheckerControls(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcDashboardService.getPendingCheckerControls(req.user, page, limit, startDate, endDate, functionId);
    }
    async getPendingReviewerControls(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcDashboardService.getPendingReviewerControls(req.user, page, limit, startDate, endDate, functionId);
    }
    async getPendingAcceptanceControls(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcDashboardService.getPendingAcceptanceControls(req.user, page, limit, startDate, endDate, functionId);
    }
    async getTestsPendingPreparer(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcDashboardService.getTestsPendingPreparer(req.user, page, limit, startDate, endDate, functionId);
    }
    async getTestsPendingChecker(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcDashboardService.getTestsPendingChecker(req.user, page, limit, startDate, endDate, functionId);
    }
    async getTestsPendingReviewer(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcDashboardService.getTestsPendingReviewer(req.user, page, limit, startDate, endDate);
    }
    async getTestsPendingAcceptance(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcDashboardService.getTestsPendingAcceptance(req.user, page, limit, startDate, endDate, functionId);
    }
    async getUnmappedIcofrControls(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcDashboardService.getUnmappedIcofrControls(req.user, page, limit, startDate, endDate);
    }
    async getUnmappedNonIcofrControls(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcDashboardService.getUnmappedNonIcofrControls(req.user, page, limit, startDate, endDate, functionId);
    }
    async getControlsByQuarter(req, quarter, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!quarter) {
            throw new Error('quarter parameter is required (e.g., "Q1 2024")');
        }
        return this.grcDashboardService.getControlsByQuarter(req.user, quarter, page, limit, startDate, endDate, functionId);
    }
    async getControlsByDepartment(req, department, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!department) {
            throw new Error('department parameter is required');
        }
        return this.grcDashboardService.getControlsByDepartment(req.user, department, page, limit, startDate, endDate, functionId);
    }
    async getControlsByType(req, type, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!type) {
            throw new Error('type parameter is required');
        }
        return this.grcDashboardService.getControlsByType(req.user, type, page, limit, startDate, endDate, functionId);
    }
    async getControlsByLevel(req, level, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!level) {
            throw new Error('level parameter is required');
        }
        return this.grcDashboardService.getControlsByLevel(req.user, level, page, limit, startDate, endDate, functionId);
    }
    async getControlsByFrequency(req, frequency, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!frequency) {
            throw new Error('frequency parameter is required');
        }
        return this.grcDashboardService.getControlsByFrequency(req.user, frequency, page, limit, startDate, endDate, functionId);
    }
    async getControlsByRiskResponse(req, riskResponse, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!riskResponse) {
            throw new Error('riskResponse parameter is required');
        }
        return this.grcDashboardService.getControlsByRiskResponse(req.user, riskResponse, page, limit, startDate, endDate, functionId);
    }
    async getControlsByAntiFraud(req, antiFraud, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!antiFraud) {
            throw new Error('antiFraud parameter is required (Anti-Fraud or Non-Anti-Fraud)');
        }
        return this.grcDashboardService.getControlsByAntiFraud(req.user, antiFraud, page, limit, startDate, endDate, functionId);
    }
    async getControlsByIcofrStatus(req, icofrStatus, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!icofrStatus) {
            throw new Error('icofrStatus parameter is required (ICOFR or Non-ICOFR)');
        }
        return this.grcDashboardService.getControlsByIcofrStatus(req.user, icofrStatus, page, limit, startDate, endDate, functionId);
    }
    async getFocusPointsByPrinciple(principle, page = 1, limit = 10, startDate, endDate) {
        if (!principle) {
            throw new Error('principle parameter is required');
        }
        return this.grcDashboardService.getFocusPointsByPrinciple(principle, page, limit, startDate, endDate);
    }
    async getControlsByComponent(req, component, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!component) {
            throw new Error('component parameter is required');
        }
        return this.grcDashboardService.getControlsByComponent(req.user, component, page, limit, startDate, endDate, functionId);
    }
    async getFocusPointsByComponent(component, page = 1, limit = 10, startDate, endDate) {
        if (!component) {
            throw new Error('component parameter is required');
        }
        return this.grcDashboardService.getFocusPointsByComponent(component, page, limit, startDate, endDate);
    }
    async getActionPlansByStatus(status, page = 1, limit = 10, startDate, endDate) {
        if (!status) {
            throw new Error('status parameter is required (Overdue or Not Overdue)');
        }
        return this.grcDashboardService.getActionPlansByStatus(status, page, limit, startDate, endDate);
    }
    async getControlsByDepartmentAndKeyControl(req, department, keyControl, page = 1, limit = 10, startDate, endDate) {
        if (!department || !keyControl) {
            throw new Error('department and keyControl parameters are required (keyControl: "Key Controls" or "Non-Key Controls")');
        }
        return this.grcDashboardService.getControlsByDepartmentAndKeyControl(req.user, department, keyControl, page, limit, startDate, endDate);
    }
    async getControlsByProcessAndKeyControl(req, process, keyControl, page = 1, limit = 10, startDate, endDate) {
        if (!process || !keyControl) {
            throw new Error('process and keyControl parameters are required (keyControl: "Key Controls" or "Non-Key Controls")');
        }
        return this.grcDashboardService.getControlsByProcessAndKeyControl(req.user, process, keyControl, page, limit, startDate, endDate);
    }
    async getControlsByBusinessUnitAndKeyControl(req, businessUnit, keyControl, page = 1, limit = 10, startDate, endDate) {
        if (!businessUnit || !keyControl) {
            throw new Error('businessUnit and keyControl parameters are required (keyControl: "Key Controls" or "Non-Key Controls")');
        }
        return this.grcDashboardService.getControlsByBusinessUnitAndKeyControl(req.user, businessUnit, keyControl, page, limit, startDate, endDate);
    }
    async getControlsByAssertion(req, assertionName, page = 1, limit = 10, startDate, endDate) {
        try {
            if (!assertionName) {
                throw new Error('assertionName parameter is required');
            }
            return await this.grcDashboardService.getControlsByAssertion(req.user, assertionName, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getControlsByAssertion:', error);
            throw error;
        }
    }
    async getControlsByComponentAndIcofrStatus(req, component, icofrStatus, page = 1, limit = 10, startDate, endDate) {
        try {
            if (!component || !icofrStatus) {
                throw new Error('component and icofrStatus parameters are required');
            }
            return await this.grcDashboardService.getControlsByComponentAndIcofrStatus(req.user, component, icofrStatus, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getControlsByComponentAndIcofrStatus:', error);
            throw error;
        }
    }
    async getControlsByFunctionQuarterYear(req, functionName, quarter, year, columnType, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            if (!functionName || quarter === undefined || year === undefined) {
                throw new Error('functionName, quarter, and year parameters are required');
            }
            return await this.grcDashboardService.getControlsByFunctionQuarterYear(req.user, functionName, Number(quarter), Number(year), columnType, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error in getControlsByFunctionQuarterYear:', error);
            throw error;
        }
    }
};
exports.GrcDashboardController = GrcDashboardController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsDashboard", null);
__decorate([
    (0, common_1.Get)('total'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getTotalControls", null);
__decorate([
    (0, common_1.Get)('unmapped'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getUnmappedControls", null);
__decorate([
    (0, common_1.Get)('pending-preparer'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getPendingPreparerControls", null);
__decorate([
    (0, common_1.Get)('pending-checker'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getPendingCheckerControls", null);
__decorate([
    (0, common_1.Get)('pending-reviewer'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getPendingReviewerControls", null);
__decorate([
    (0, common_1.Get)('pending-acceptance'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getPendingAcceptanceControls", null);
__decorate([
    (0, common_1.Get)('tests/pending-preparer'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getTestsPendingPreparer", null);
__decorate([
    (0, common_1.Get)('tests/pending-checker'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getTestsPendingChecker", null);
__decorate([
    (0, common_1.Get)('tests/pending-reviewer'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getTestsPendingReviewer", null);
__decorate([
    (0, common_1.Get)('tests/pending-acceptance'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getTestsPendingAcceptance", null);
__decorate([
    (0, common_1.Get)('unmapped-icofr'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getUnmappedIcofrControls", null);
__decorate([
    (0, common_1.Get)('unmapped-non-icofr'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getUnmappedNonIcofrControls", null);
__decorate([
    (0, common_1.Get)('by-quarter'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('quarter')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByQuarter", null);
__decorate([
    (0, common_1.Get)('by-department'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('department')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByDepartment", null);
__decorate([
    (0, common_1.Get)('by-type'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByType", null);
__decorate([
    (0, common_1.Get)('by-level'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('level')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByLevel", null);
__decorate([
    (0, common_1.Get)('by-frequency'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('frequency')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByFrequency", null);
__decorate([
    (0, common_1.Get)('by-risk-response'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('riskResponse')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByRiskResponse", null);
__decorate([
    (0, common_1.Get)('by-anti-fraud'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('antiFraud')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByAntiFraud", null);
__decorate([
    (0, common_1.Get)('by-icofr-status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('icofrStatus')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByIcofrStatus", null);
__decorate([
    (0, common_1.Get)('focus-points/by-principle'),
    __param(0, (0, common_1.Query)('principle')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getFocusPointsByPrinciple", null);
__decorate([
    (0, common_1.Get)('by-component'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('component')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByComponent", null);
__decorate([
    (0, common_1.Get)('focus-points/by-component'),
    __param(0, (0, common_1.Query)('component')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getFocusPointsByComponent", null);
__decorate([
    (0, common_1.Get)('action-plans/by-status'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getActionPlansByStatus", null);
__decorate([
    (0, common_1.Get)('by-department-and-key-control'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('department')),
    __param(2, (0, common_1.Query)('keyControl')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('startDate')),
    __param(6, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByDepartmentAndKeyControl", null);
__decorate([
    (0, common_1.Get)('by-process-and-key-control'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('process')),
    __param(2, (0, common_1.Query)('keyControl')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('startDate')),
    __param(6, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByProcessAndKeyControl", null);
__decorate([
    (0, common_1.Get)('by-business-unit-and-key-control'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('businessUnit')),
    __param(2, (0, common_1.Query)('keyControl')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('startDate')),
    __param(6, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByBusinessUnitAndKeyControl", null);
__decorate([
    (0, common_1.Get)('by-assertion'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('assertionName')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByAssertion", null);
__decorate([
    (0, common_1.Get)('by-component-and-icofr-status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('component')),
    __param(2, (0, common_1.Query)('icofrStatus')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('startDate')),
    __param(6, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByComponentAndIcofrStatus", null);
__decorate([
    (0, common_1.Get)('by-function-quarter-year'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('functionName')),
    __param(2, (0, common_1.Query)('quarter')),
    __param(3, (0, common_1.Query)('year')),
    __param(4, (0, common_1.Query)('columnType')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('limit')),
    __param(7, (0, common_1.Query)('startDate')),
    __param(8, (0, common_1.Query)('endDate')),
    __param(9, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByFunctionQuarterYear", null);
exports.GrcDashboardController = GrcDashboardController = __decorate([
    (0, common_1.Controller)('api/grc/controls'),
    __metadata("design:paramtypes", [grc_dashboard_service_1.GrcDashboardService])
], GrcDashboardController);
//# sourceMappingURL=grc-dashboard.controller.js.map