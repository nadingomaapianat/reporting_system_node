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
        return this.grcDashboardService.getControlsDashboard(startDate, endDate);
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
exports.GrcDashboardController = GrcDashboardController = __decorate([
    (0, common_1.Controller)('api/grc/controls'),
    __metadata("design:paramtypes", [grc_dashboard_service_1.GrcDashboardService])
], GrcDashboardController);
//# sourceMappingURL=grc-dashboard.controller.js.map