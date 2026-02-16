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
exports.GrcKrisController = void 0;
const common_1 = require("@nestjs/common");
const grc_kris_service_1 = require("./grc-kris.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
let GrcKrisController = class GrcKrisController {
    constructor(grcKrisService) {
        this.grcKrisService = grcKrisService;
    }
    async getKrisDashboard(req, timeframe, startDate, endDate, functionId) {
        return this.grcKrisService.getKrisDashboard(req.user, timeframe, startDate, endDate, functionId);
    }
    async exportKris(req, format, timeframe) {
        return this.grcKrisService.exportKris(req.user, format, timeframe);
    }
    async getTotalKris(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcKrisService.getTotalKris(req.user, page, limit, startDate, endDate, functionId);
    }
    async getPendingPreparerKris(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcKrisService.getPendingPreparerKris(req.user, page, limit, startDate, endDate, functionId);
    }
    async getPendingCheckerKris(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcKrisService.getPendingCheckerKris(req.user, page, limit, startDate, endDate, functionId);
    }
    async getPendingReviewerKris(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcKrisService.getPendingReviewerKris(req.user, page, limit, startDate, endDate, functionId);
    }
    async getPendingAcceptanceKris(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcKrisService.getPendingAcceptanceKris(req.user, page, limit, startDate, endDate, functionId);
    }
    async getKrisByStatus(req, status, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcKrisService.getKrisByStatus(req.user, status, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error fetching KRIs by status:', error);
            return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
        }
    }
    async getKrisByLevel(req, level, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcKrisService.getKrisByLevel(req.user, level, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error fetching KRIs by level:', error);
            return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
        }
    }
    async getKrisByFunction(req, functionName, page = 1, limit = 10, startDate, endDate, submissionStatus, functionId) {
        try {
            return await this.grcKrisService.getKrisByFunction(req.user, functionName, page, limit, startDate, endDate, submissionStatus, functionId);
        }
        catch (error) {
            console.error('Error fetching KRIs by function:', error);
            return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
        }
    }
    async getKrisWithAssessmentsByFunction(req, functionName, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcKrisService.getKrisWithAssessmentsByFunction(req.user, functionName, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error fetching KRIs with assessments by function:', error);
            return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
        }
    }
    async getKrisByFrequency(req, frequency, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcKrisService.getKrisByFrequency(req.user, frequency, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error fetching KRIs by frequency:', error);
            return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
        }
    }
    async getRisksByKriName(req, kriName, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcKrisService.getRisksByKriName(req.user, kriName, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error fetching risks by KRI name:', error);
            return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
        }
    }
    async getKrisByMonthYear(req, monthYear, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcKrisService.getKrisByMonthYear(req.user, monthYear, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error fetching KRIs by month/year:', error);
            return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
        }
    }
    async getKriAssessmentsByMonthAndLevel(req, monthYear, assessmentLevel, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcKrisService.getKriAssessmentsByMonthAndLevel(req.user, monthYear, assessmentLevel, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error fetching KRI assessments by month and level:', error);
            return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
        }
    }
    async getKrisByOverdueStatus(req, overdueStatus, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcKrisService.getKrisByOverdueStatus(req.user, overdueStatus, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error fetching KRIs by overdue status:', error);
            return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
        }
    }
};
exports.GrcKrisController = GrcKrisController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('timeframe')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __param(4, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getKrisDashboard", null);
__decorate([
    (0, common_1.Get)('export'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Query)('timeframe')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "exportKris", null);
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
], GrcKrisController.prototype, "getTotalKris", null);
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
], GrcKrisController.prototype, "getPendingPreparerKris", null);
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
], GrcKrisController.prototype, "getPendingCheckerKris", null);
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
], GrcKrisController.prototype, "getPendingReviewerKris", null);
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
], GrcKrisController.prototype, "getPendingAcceptanceKris", null);
__decorate([
    (0, common_1.Get)('by-status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getKrisByStatus", null);
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
], GrcKrisController.prototype, "getKrisByLevel", null);
__decorate([
    (0, common_1.Get)('by-function'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('functionName')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('submissionStatus')),
    __param(7, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getKrisByFunction", null);
__decorate([
    (0, common_1.Get)('with-assessments-by-function'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('functionName')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getKrisWithAssessmentsByFunction", null);
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
], GrcKrisController.prototype, "getKrisByFrequency", null);
__decorate([
    (0, common_1.Get)('risks-by-kri-name'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('kriName')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getRisksByKriName", null);
__decorate([
    (0, common_1.Get)('by-month-year'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('monthYear')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getKrisByMonthYear", null);
__decorate([
    (0, common_1.Get)('assessments-by-month-level'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('monthYear')),
    __param(2, (0, common_1.Query)('assessmentLevel')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('startDate')),
    __param(6, (0, common_1.Query)('endDate')),
    __param(7, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getKriAssessmentsByMonthAndLevel", null);
__decorate([
    (0, common_1.Get)('by-overdue-status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('overdueStatus')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getKrisByOverdueStatus", null);
exports.GrcKrisController = GrcKrisController = __decorate([
    (0, common_1.Controller)('api/grc/kris'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Reporting', ['show']),
    __metadata("design:paramtypes", [grc_kris_service_1.GrcKrisService])
], GrcKrisController);
//# sourceMappingURL=grc-kris.controller.js.map