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
let GrcRisksController = class GrcRisksController {
    constructor(grcRisksService) {
        this.grcRisksService = grcRisksService;
    }
    async getRisksDashboard(req, startDate, endDate, functionId) {
        return this.grcRisksService.getRisksDashboard(req.user, startDate, endDate, functionId);
    }
    async getTotalRisks(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcRisksService.getTotalRisks(req.user, page, limit, startDate, endDate, functionId);
    }
    async getCard(req, cardType, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcRisksService.getFilteredCardData(req.user, cardType, page, limit, startDate, endDate);
    }
    async getCardByParam(req, cardType, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcRisksService.getFilteredCardData(req.user, cardType, page, limit, startDate, endDate);
    }
    async getHighRisks(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcRisksService.getHighRisks(req.user, page, limit, startDate, endDate, functionId);
    }
    async getMediumRisks(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcRisksService.getMediumRisks(req.user, page, limit, startDate, endDate, functionId);
    }
    async getLowRisks(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcRisksService.getLowRisks(req.user, page, limit, startDate, endDate, functionId);
    }
    async getRiskReduction(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcRisksService.getRiskReduction(req.user, page, limit, startDate, endDate, functionId);
    }
    async getNewRisks(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcRisksService.getNewRisks(req.user, page, limit, startDate, endDate, functionId);
    }
    async getRisksByCategory(req, category, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcRisksService.getRisksByCategory(req.user, category, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error in getRisksByCategory:', error);
            throw error;
        }
    }
    async getRisksByEventType(req, eventType, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcRisksService.getRisksByEventType(req.user, eventType, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error in getRisksByEventType:', error);
            throw error;
        }
    }
    async getRisksByQuarter(req, quarter, page = 1, limit = 10, startDate, endDate) {
        try {
            return await this.grcRisksService.getRisksByQuarter(req.user, quarter, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getRisksByQuarter:', error);
            throw error;
        }
    }
    async getRisksByApprovalStatus(req, approvalStatus, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcRisksService.getRisksByApprovalStatus(req.user, approvalStatus, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error in getRisksByApprovalStatus:', error);
            throw error;
        }
    }
    async getRisksByFinancialImpact(req, financialImpact, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcRisksService.getRisksByFinancialImpact(req.user, financialImpact, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error in getRisksByFinancialImpact:', error);
            throw error;
        }
    }
    async getRisksByFunction(req, functionName, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcRisksService.getRisksByFunction(req.user, functionName, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error in getRisksByFunction:', error);
            throw error;
        }
    }
    async getRisksByBusinessProcess(req, processName, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcRisksService.getRisksByBusinessProcess(req.user, processName, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error in getRisksByBusinessProcess:', error);
            throw error;
        }
    }
    async getRisksByName(req, riskName, page = 1, limit = 10, startDate, endDate) {
        try {
            return await this.grcRisksService.getRisksByName(req.user, riskName, page, limit, startDate, endDate);
        }
        catch (error) {
            console.error('Error in getRisksByName:', error);
            throw error;
        }
    }
    async getRisksByControlName(req, controlName, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcRisksService.getRisksByControlName(req.user, controlName, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error in getRisksByControlName:', error);
            throw error;
        }
    }
    async getRisksForComparison(req, riskName, page = 1, limit = 10, startDate, endDate, functionId) {
        try {
            return await this.grcRisksService.getRisksForComparison(req.user, riskName, page, limit, startDate, endDate, functionId);
        }
        catch (error) {
            console.error('Error in getRisksForComparison:', error);
            throw error;
        }
    }
};
exports.GrcRisksController = GrcRisksController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksDashboard", null);
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
], GrcRisksController.prototype, "getTotalRisks", null);
__decorate([
    (0, common_1.Get)('card'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('cardType')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getCard", null);
__decorate([
    (0, common_1.Get)('card/:cardType'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('cardType')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getCardByParam", null);
__decorate([
    (0, common_1.Get)('high-risk'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getHighRisks", null);
__decorate([
    (0, common_1.Get)('medium-risk'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getMediumRisks", null);
__decorate([
    (0, common_1.Get)('low-risk'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getLowRisks", null);
__decorate([
    (0, common_1.Get)('reduction'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRiskReduction", null);
__decorate([
    (0, common_1.Get)('new-risks'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getNewRisks", null);
__decorate([
    (0, common_1.Get)('by-category'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByCategory", null);
__decorate([
    (0, common_1.Get)('by-event-type'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('eventType')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByEventType", null);
__decorate([
    (0, common_1.Get)('by-quarter'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('quarter')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByQuarter", null);
__decorate([
    (0, common_1.Get)('by-approval-status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('approvalStatus')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByApprovalStatus", null);
__decorate([
    (0, common_1.Get)('by-financial-impact'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('financialImpact')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByFinancialImpact", null);
__decorate([
    (0, common_1.Get)('by-function'),
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
], GrcRisksController.prototype, "getRisksByFunction", null);
__decorate([
    (0, common_1.Get)('by-business-process'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('processName')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByBusinessProcess", null);
__decorate([
    (0, common_1.Get)('by-name'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('riskName')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByName", null);
__decorate([
    (0, common_1.Get)('by-control-name'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('controlName')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksByControlName", null);
__decorate([
    (0, common_1.Get)('for-comparison'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('riskName')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksForComparison", null);
exports.GrcRisksController = GrcRisksController = __decorate([
    (0, common_1.Controller)('api/grc/risks'),
    __metadata("design:paramtypes", [grc_risks_service_1.GrcRisksService])
], GrcRisksController);
//# sourceMappingURL=grc-risks.controller.js.map