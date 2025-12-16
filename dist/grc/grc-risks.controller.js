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
exports.GrcRisksController = void 0;
const common_1 = require("@nestjs/common");
const grc_risks_service_1 = require("./grc-risks.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
let GrcRisksController = class GrcRisksController {
    constructor(grcRisksService) {
        this.grcRisksService = grcRisksService;
    }
    async getRisksDashboard(startDate, endDate) {
        return this.grcRisksService.getRisksDashboard(startDate, endDate);
    }
    async getTotalRisks(page = 1, limit = 10, startDate, endDate) {
        return this.grcRisksService.getTotalRisks(page, limit, startDate, endDate);
    }
    async getCard(cardType, page = 1, limit = 10, startDate, endDate) {
        return this.grcRisksService.getCardData(cardType, page, limit, startDate, endDate);
    }
    async getCardByParam(cardType, page = 1, limit = 10, startDate, endDate) {
        return this.grcRisksService.getCardData(cardType, page, limit, startDate, endDate);
    }
    async getHighRisks(page = 1, limit = 10, startDate, endDate) {
        return this.grcRisksService.getHighRisks(page, limit, startDate, endDate);
    }
    async getMediumRisks(page = 1, limit = 10, startDate, endDate) {
        return this.grcRisksService.getMediumRisks(page, limit, startDate, endDate);
    }
    async getLowRisks(page = 1, limit = 10, startDate, endDate) {
        return this.grcRisksService.getLowRisks(page, limit, startDate, endDate);
    }
    async getRiskReduction(page = 1, limit = 10, startDate, endDate) {
        return this.grcRisksService.getRiskReduction(page, limit, startDate, endDate);
    }
    async getNewRisks(page = 1, limit = 10, startDate, endDate) {
        return this.grcRisksService.getNewRisks(page, limit, startDate, endDate);
    }
    async getRisksByCategory(category, page = 1, limit = 10, startDate, endDate) {
        try {
            return await this.grcRisksService.getRisksByCategory(category, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getRisksByCategory:', error);
            throw error;
        }
    }
    async getRisksByEventType(eventType, page = 1, limit = 10, startDate, endDate) {
        try {
            return await this.grcRisksService.getRisksByEventType(eventType, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getRisksByEventType:', error);
            throw error;
        }
    }
    async getRisksByQuarter(quarter, page = 1, limit = 10, startDate, endDate) {
        try {
            return await this.grcRisksService.getRisksByQuarter(quarter, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getRisksByQuarter:', error);
            throw error;
        }
    }
    async getRisksByApprovalStatus(approvalStatus, page = 1, limit = 10, startDate, endDate) {
        try {
            return await this.grcRisksService.getRisksByApprovalStatus(approvalStatus, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getRisksByApprovalStatus:', error);
            throw error;
        }
    }
    async getRisksByFinancialImpact(financialImpact, page = 1, limit = 10, startDate, endDate) {
        try {
            return await this.grcRisksService.getRisksByFinancialImpact(financialImpact, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getRisksByFinancialImpact:', error);
            throw error;
        }
    }
    async getRisksByFunction(functionName, page = 1, limit = 10, startDate, endDate) {
        try {
            return await this.grcRisksService.getRisksByFunction(functionName, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getRisksByFunction:', error);
            throw error;
        }
    }
    async getRisksByBusinessProcess(processName, page = 1, limit = 10, startDate, endDate) {
        try {
            return await this.grcRisksService.getRisksByBusinessProcess(processName, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getRisksByBusinessProcess:', error);
            throw error;
        }
    }
    async getRisksByName(riskName, page = 1, limit = 10, startDate, endDate) {
        try {
            return await this.grcRisksService.getRisksByName(riskName, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getRisksByName:', error);
            throw error;
        }
    }
    async getRisksByControlName(controlName, page = 1, limit = 10, startDate, endDate) {
        try {
            return await this.grcRisksService.getRisksByControlName(controlName, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getRisksByControlName:', error);
            throw error;
        }
    }
    async getRisksForComparison(riskName, page = 1, limit = 10, startDate, endDate) {
        try {
            return await this.grcRisksService.getRisksForComparison(riskName, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getRisksForComparison:', error);
            throw error;
        }
    }
};
exports.GrcRisksController = GrcRisksController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksDashboard", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('total'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getTotalRisks", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('card'),
    __param(0, (0, common_1.Query)('cardType')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getCard", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('card/:cardType'),
    __param(0, (0, common_1.Param)('cardType')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getCardByParam", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('high-risk'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getHighRisks", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('medium-risk'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getMediumRisks", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('low-risk'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getLowRisks", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('reduction'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRiskReduction", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('new-risks'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getNewRisks", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('by-category'),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByCategory", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('by-event-type'),
    __param(0, (0, common_1.Query)('eventType')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByEventType", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('by-quarter'),
    __param(0, (0, common_1.Query)('quarter')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByQuarter", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('by-approval-status'),
    __param(0, (0, common_1.Query)('approvalStatus')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByApprovalStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('by-financial-impact'),
    __param(0, (0, common_1.Query)('financialImpact')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByFinancialImpact", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('by-function'),
    __param(0, (0, common_1.Query)('functionName')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByFunction", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('by-business-process'),
    __param(0, (0, common_1.Query)('processName')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByBusinessProcess", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('by-name'),
    __param(0, (0, common_1.Query)('riskName')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByName", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('by-control-name'),
    __param(0, (0, common_1.Query)('controlName')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByControlName", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Risk Catalog', ['show']),
    (0, common_1.Get)('for-comparison'),
    __param(0, (0, common_1.Query)('riskName')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksForComparison", null);
exports.GrcRisksController = GrcRisksController = __decorate([
    (0, common_1.Controller)('api/grc/risks'),
    __metadata("design:paramtypes", [grc_risks_service_1.GrcRisksService])
], GrcRisksController);
//# sourceMappingURL=grc-risks.controller.js.map