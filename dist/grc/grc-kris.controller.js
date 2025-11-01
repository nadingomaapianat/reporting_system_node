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
let GrcKrisController = class GrcKrisController {
    constructor(grcKrisService) {
        this.grcKrisService = grcKrisService;
    }
    async getKrisDashboard(timeframe) {
        return this.grcKrisService.getKrisDashboard(timeframe);
    }
    async exportKris(format, timeframe) {
        return this.grcKrisService.exportKris(format, timeframe);
    }
    async getTotalKris(page = 1, limit = 10, startDate, endDate) {
        return this.grcKrisService.getTotalKris(page, limit, startDate, endDate);
    }
    async getPendingPreparerKris(page = 1, limit = 10, startDate, endDate) {
        return this.grcKrisService.getPendingPreparerKris(page, limit, startDate, endDate);
    }
    async getPendingCheckerKris(page = 1, limit = 10, startDate, endDate) {
        return this.grcKrisService.getPendingCheckerKris(page, limit, startDate, endDate);
    }
    async getPendingReviewerKris(page = 1, limit = 10, startDate, endDate) {
        return this.grcKrisService.getPendingReviewerKris(page, limit, startDate, endDate);
    }
    async getPendingAcceptanceKris(page = 1, limit = 10, startDate, endDate) {
        return this.grcKrisService.getPendingAcceptanceKris(page, limit, startDate, endDate);
    }
};
exports.GrcKrisController = GrcKrisController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('timeframe')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getKrisDashboard", null);
__decorate([
    (0, common_1.Get)('export'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Query)('timeframe')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "exportKris", null);
__decorate([
    (0, common_1.Get)('total'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getTotalKris", null);
__decorate([
    (0, common_1.Get)('pending-preparer'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getPendingPreparerKris", null);
__decorate([
    (0, common_1.Get)('pending-checker'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getPendingCheckerKris", null);
__decorate([
    (0, common_1.Get)('pending-reviewer'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getPendingReviewerKris", null);
__decorate([
    (0, common_1.Get)('pending-acceptance'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcKrisController.prototype, "getPendingAcceptanceKris", null);
exports.GrcKrisController = GrcKrisController = __decorate([
    (0, common_1.Controller)('api/grc/kris'),
    __metadata("design:paramtypes", [grc_kris_service_1.GrcKrisService])
], GrcKrisController);
//# sourceMappingURL=grc-kris.controller.js.map