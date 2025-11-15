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
    async getControlsDashboard(startDate, endDate) {
        try {
            return await this.grcDashboardService.getControlsDashboard(startDate, endDate);
        }
        catch (error) {
            console.error('Error in getControlsDashboard:', error);
            throw error;
        }
    }
    async getTotalControls(page = 1, limit = 10, startDate, endDate) {
        return this.grcDashboardService.getTotalControls(page, limit, startDate, endDate);
    }
    async getUnmappedControls(page = 1, limit = 10, startDate, endDate) {
        return this.grcDashboardService.getUnmappedControls(page, limit, startDate, endDate);
    }
    async getPendingPreparerControls(page = 1, limit = 10, startDate, endDate) {
        return this.grcDashboardService.getPendingPreparerControls(page, limit, startDate, endDate);
    }
    async getPendingCheckerControls(page = 1, limit = 10, startDate, endDate) {
        return this.grcDashboardService.getPendingCheckerControls(page, limit, startDate, endDate);
    }
    async getPendingReviewerControls(page = 1, limit = 10, startDate, endDate) {
        return this.grcDashboardService.getPendingReviewerControls(page, limit, startDate, endDate);
    }
    async getPendingAcceptanceControls(page = 1, limit = 10, startDate, endDate) {
        return this.grcDashboardService.getPendingAcceptanceControls(page, limit, startDate, endDate);
    }
    async getTestsPendingPreparer(page = 1, limit = 10, startDate, endDate) {
        return this.grcDashboardService.getTestsPendingPreparer(page, limit, startDate, endDate);
    }
    async getTestsPendingChecker(page = 1, limit = 10, startDate, endDate) {
        return this.grcDashboardService.getTestsPendingChecker(page, limit, startDate, endDate);
    }
    async getTestsPendingReviewer(page = 1, limit = 10, startDate, endDate) {
        return this.grcDashboardService.getTestsPendingReviewer(page, limit, startDate, endDate);
    }
    async getTestsPendingAcceptance(page = 1, limit = 10, startDate, endDate) {
        return this.grcDashboardService.getTestsPendingAcceptance(page, limit, startDate, endDate);
    }
    async getUnmappedIcofrControls(page = 1, limit = 10, startDate, endDate) {
        return this.grcDashboardService.getUnmappedIcofrControls(page, limit, startDate, endDate);
    }
    async getUnmappedNonIcofrControls(page = 1, limit = 10, startDate, endDate) {
        return this.grcDashboardService.getUnmappedNonIcofrControls(page, limit, startDate, endDate);
    }
    async getControlsByQuarter(quarter, page = 1, limit = 10, startDate, endDate) {
        if (!quarter) {
            throw new Error('quarter parameter is required (e.g., "Q1 2024")');
        }
        return this.grcDashboardService.getControlsByQuarter(quarter, page, limit, startDate, endDate);
    }
    async getControlsByDepartment(department, page = 1, limit = 10, startDate, endDate) {
        if (!department) {
            throw new Error('department parameter is required');
        }
        return this.grcDashboardService.getControlsByDepartment(department, page, limit, startDate, endDate);
    }
    async getControlsByType(type, page = 1, limit = 10, startDate, endDate) {
        if (!type) {
            throw new Error('type parameter is required');
        }
        return this.grcDashboardService.getControlsByType(type, page, limit, startDate, endDate);
    }
    async getControlsByLevel(level, page = 1, limit = 10, startDate, endDate) {
        if (!level) {
            throw new Error('level parameter is required');
        }
        return this.grcDashboardService.getControlsByLevel(level, page, limit, startDate, endDate);
    }
    async getControlsByFrequency(frequency, page = 1, limit = 10, startDate, endDate) {
        if (!frequency) {
            throw new Error('frequency parameter is required');
        }
        return this.grcDashboardService.getControlsByFrequency(frequency, page, limit, startDate, endDate);
    }
    async getControlsByRiskResponse(riskResponse, page = 1, limit = 10, startDate, endDate) {
        if (!riskResponse) {
            throw new Error('riskResponse parameter is required');
        }
        return this.grcDashboardService.getControlsByRiskResponse(riskResponse, page, limit, startDate, endDate);
    }
    async getControlsByAntiFraud(antiFraud, page = 1, limit = 10, startDate, endDate) {
        if (!antiFraud) {
            throw new Error('antiFraud parameter is required (Anti-Fraud or Non-Anti-Fraud)');
        }
        return this.grcDashboardService.getControlsByAntiFraud(antiFraud, page, limit, startDate, endDate);
    }
    async getControlsByIcofrStatus(icofrStatus, page = 1, limit = 10, startDate, endDate) {
        if (!icofrStatus) {
            throw new Error('icofrStatus parameter is required (ICOFR or Non-ICOFR)');
        }
        return this.grcDashboardService.getControlsByIcofrStatus(icofrStatus, page, limit, startDate, endDate);
    }
    async getFocusPointsByPrinciple(principle, page = 1, limit = 10, startDate, endDate) {
        if (!principle) {
            throw new Error('principle parameter is required');
        }
        return this.grcDashboardService.getFocusPointsByPrinciple(principle, page, limit, startDate, endDate);
    }
    async getControlsByComponent(component, page = 1, limit = 10, startDate, endDate) {
        if (!component) {
            throw new Error('component parameter is required');
        }
        return this.grcDashboardService.getControlsByComponent(component, page, limit, startDate, endDate);
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
    async getControlsByDepartmentAndKeyControl(department, keyControl, page = 1, limit = 10, startDate, endDate) {
        if (!department || !keyControl) {
            throw new Error('department and keyControl parameters are required (keyControl: "Key Controls" or "Non-Key Controls")');
        }
        return this.grcDashboardService.getControlsByDepartmentAndKeyControl(department, keyControl, page, limit, startDate, endDate);
    }
    async getControlsByProcessAndKeyControl(process, keyControl, page = 1, limit = 10, startDate, endDate) {
        if (!process || !keyControl) {
            throw new Error('process and keyControl parameters are required (keyControl: "Key Controls" or "Non-Key Controls")');
        }
        return this.grcDashboardService.getControlsByProcessAndKeyControl(process, keyControl, page, limit, startDate, endDate);
    }
    async getControlsByBusinessUnitAndKeyControl(businessUnit, keyControl, page = 1, limit = 10, startDate, endDate) {
        if (!businessUnit || !keyControl) {
            throw new Error('businessUnit and keyControl parameters are required (keyControl: "Key Controls" or "Non-Key Controls")');
        }
        return this.grcDashboardService.getControlsByBusinessUnitAndKeyControl(businessUnit, keyControl, page, limit, startDate, endDate);
    }
    async getControlsByAssertion(assertionName, page = 1, limit = 10, startDate, endDate) {
        try {
            if (!assertionName) {
                throw new Error('assertionName parameter is required');
            }
            return await this.grcDashboardService.getControlsByAssertion(assertionName, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getControlsByAssertion:', error);
            throw error;
        }
    }
    async getControlsByComponentAndIcofrStatus(component, icofrStatus, page = 1, limit = 10, startDate, endDate) {
        try {
            if (!component || !icofrStatus) {
                throw new Error('component and icofrStatus parameters are required');
            }
            return await this.grcDashboardService.getControlsByComponentAndIcofrStatus(component, icofrStatus, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getControlsByComponentAndIcofrStatus:', error);
            throw error;
        }
    }
    async getControlsByFunctionQuarterYear(functionName, quarter, year, columnType, page = 1, limit = 10, startDate, endDate) {
        try {
            if (!functionName || quarter === undefined || year === undefined) {
                throw new Error('functionName, quarter, and year parameters are required');
            }
            return await this.grcDashboardService.getControlsByFunctionQuarterYear(functionName, Number(quarter), Number(year), columnType, page, limit, startDate, endDate);
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
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsDashboard", null);
__decorate([
    (0, common_1.Get)('total'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getTotalControls", null);
__decorate([
    (0, common_1.Get)('unmapped'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getUnmappedControls", null);
__decorate([
    (0, common_1.Get)('pending-preparer'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getPendingPreparerControls", null);
__decorate([
    (0, common_1.Get)('pending-checker'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getPendingCheckerControls", null);
__decorate([
    (0, common_1.Get)('pending-reviewer'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getPendingReviewerControls", null);
__decorate([
    (0, common_1.Get)('pending-acceptance'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getPendingAcceptanceControls", null);
__decorate([
    (0, common_1.Get)('tests/pending-preparer'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getTestsPendingPreparer", null);
__decorate([
    (0, common_1.Get)('tests/pending-checker'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getTestsPendingChecker", null);
__decorate([
    (0, common_1.Get)('tests/pending-reviewer'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getTestsPendingReviewer", null);
__decorate([
    (0, common_1.Get)('tests/pending-acceptance'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getTestsPendingAcceptance", null);
__decorate([
    (0, common_1.Get)('unmapped-icofr'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getUnmappedIcofrControls", null);
__decorate([
    (0, common_1.Get)('unmapped-non-icofr'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getUnmappedNonIcofrControls", null);
__decorate([
    (0, common_1.Get)('by-quarter'),
    __param(0, (0, common_1.Query)('quarter')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByQuarter", null);
__decorate([
    (0, common_1.Get)('by-department'),
    __param(0, (0, common_1.Query)('department')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByDepartment", null);
__decorate([
    (0, common_1.Get)('by-type'),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByType", null);
__decorate([
    (0, common_1.Get)('by-level'),
    __param(0, (0, common_1.Query)('level')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByLevel", null);
__decorate([
    (0, common_1.Get)('by-frequency'),
    __param(0, (0, common_1.Query)('frequency')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByFrequency", null);
__decorate([
    (0, common_1.Get)('by-risk-response'),
    __param(0, (0, common_1.Query)('riskResponse')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByRiskResponse", null);
__decorate([
    (0, common_1.Get)('by-anti-fraud'),
    __param(0, (0, common_1.Query)('antiFraud')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByAntiFraud", null);
__decorate([
    (0, common_1.Get)('by-icofr-status'),
    __param(0, (0, common_1.Query)('icofrStatus')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
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
    __param(0, (0, common_1.Query)('component')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
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
    __param(0, (0, common_1.Query)('department')),
    __param(1, (0, common_1.Query)('keyControl')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByDepartmentAndKeyControl", null);
__decorate([
    (0, common_1.Get)('by-process-and-key-control'),
    __param(0, (0, common_1.Query)('process')),
    __param(1, (0, common_1.Query)('keyControl')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByProcessAndKeyControl", null);
__decorate([
    (0, common_1.Get)('by-business-unit-and-key-control'),
    __param(0, (0, common_1.Query)('businessUnit')),
    __param(1, (0, common_1.Query)('keyControl')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByBusinessUnitAndKeyControl", null);
__decorate([
    (0, common_1.Get)('by-assertion'),
    __param(0, (0, common_1.Query)('assertionName')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByAssertion", null);
__decorate([
    (0, common_1.Get)('by-component-and-icofr-status'),
    __param(0, (0, common_1.Query)('component')),
    __param(1, (0, common_1.Query)('icofrStatus')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByComponentAndIcofrStatus", null);
__decorate([
    (0, common_1.Get)('by-function-quarter-year'),
    __param(0, (0, common_1.Query)('functionName')),
    __param(1, (0, common_1.Query)('quarter')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Query)('columnType')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __param(6, (0, common_1.Query)('startDate')),
    __param(7, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcDashboardController.prototype, "getControlsByFunctionQuarterYear", null);
exports.GrcDashboardController = GrcDashboardController = __decorate([
    (0, common_1.Controller)('api/grc/controls'),
    __metadata("design:paramtypes", [grc_dashboard_service_1.GrcDashboardService])
], GrcDashboardController);
//# sourceMappingURL=grc-dashboard.controller.js.map