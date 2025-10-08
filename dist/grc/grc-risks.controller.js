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
    async getRisksDashboard(startDate, endDate) {
        return this.grcRisksService.getRisksDashboard(startDate, endDate);
    }
    async getTotalRisks(page = 1, limit = 10, startDate, endDate) {
        return this.grcRisksService.getTotalRisks(page, limit, startDate, endDate);
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
};
exports.GrcRisksController = GrcRisksController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getRisksDashboard", null);
__decorate([
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
    (0, common_1.Get)('new-risks'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcRisksController.prototype, "getNewRisks", null);
exports.GrcRisksController = GrcRisksController = __decorate([
    (0, common_1.Controller)('api/grc/risks'),
    __metadata("design:paramtypes", [grc_risks_service_1.GrcRisksService])
], GrcRisksController);
//# sourceMappingURL=grc-risks.controller.js.map