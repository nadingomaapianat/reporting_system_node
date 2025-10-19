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
};
exports.GrcDashboardService = GrcDashboardService;
exports.GrcDashboardService = GrcDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], GrcDashboardService);
//# sourceMappingURL=grc-dashboard.service.js.map