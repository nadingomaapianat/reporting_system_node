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
exports.BaseDashboardController = void 0;
const common_1 = require("@nestjs/common");
const base_dashboard_service_1 = require("./base-dashboard.service");
let BaseDashboardController = class BaseDashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async getDashboard(req, startDate, endDate, functionId) {
        return this.dashboardService.getDashboardData(req.user, startDate, endDate, functionId);
    }
    async getCardData(req, cardType, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.dashboardService.getCardData(req.user, cardType, page, limit, startDate, endDate, functionId);
    }
};
exports.BaseDashboardController = BaseDashboardController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], BaseDashboardController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('card/:cardType'),
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
], BaseDashboardController.prototype, "getCardData", null);
exports.BaseDashboardController = BaseDashboardController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [base_dashboard_service_1.BaseDashboardService])
], BaseDashboardController);
//# sourceMappingURL=base-dashboard.controller.js.map