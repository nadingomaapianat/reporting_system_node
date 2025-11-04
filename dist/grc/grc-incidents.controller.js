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
exports.GrcIncidentsController = void 0;
const common_1 = require("@nestjs/common");
const grc_incidents_service_1 = require("./grc-incidents.service");
let GrcIncidentsController = class GrcIncidentsController {
    constructor(grcIncidentsService) {
        this.grcIncidentsService = grcIncidentsService;
    }
    async getIncidentsDashboard(timeframe) {
        return this.grcIncidentsService.getIncidentsDashboard(timeframe);
    }
    async exportIncidents(format, timeframe) {
        return this.grcIncidentsService.exportIncidents(format, timeframe);
    }
    async getTotalIncidents(page = 1, limit = 10, startDate, endDate) {
        return this.grcIncidentsService.getTotalIncidents(page, limit, startDate, endDate);
    }
    async getPendingPreparerIncidents(page = 1, limit = 10, startDate, endDate) {
        return this.grcIncidentsService.getPendingPreparerIncidents(page, limit, startDate, endDate);
    }
    async getPendingCheckerIncidents(page = 1, limit = 10, startDate, endDate) {
        return this.grcIncidentsService.getPendingCheckerIncidents(page, limit, startDate, endDate);
    }
    async getPendingReviewerIncidents(page = 1, limit = 10, startDate, endDate) {
        return this.grcIncidentsService.getPendingReviewerIncidents(page, limit, startDate, endDate);
    }
    async getPendingAcceptanceIncidents(page = 1, limit = 10, startDate, endDate) {
        return this.grcIncidentsService.getPendingAcceptanceIncidents(page, limit, startDate, endDate);
    }
    async getIncidentsByCategory(category, page = 1, limit = 10, startDate, endDate) {
        if (!category) {
            throw new Error('category parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByCategory(category, page, limit, startDate, endDate);
    }
    async getIncidentsByEventType(eventType, page = 1, limit = 10, startDate, endDate) {
        if (!eventType) {
            throw new Error('eventType parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByEventType(eventType, page, limit, startDate, endDate);
    }
    async getIncidentsByFinancialImpact(financialImpact, page = 1, limit = 10, startDate, endDate) {
        if (!financialImpact) {
            throw new Error('financialImpact parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByFinancialImpact(financialImpact, page, limit, startDate, endDate);
    }
    async getIncidentsByStatus(status, page = 1, limit = 10, startDate, endDate) {
        if (!status) {
            throw new Error('status parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByStatus(status, page, limit, startDate, endDate);
    }
    async getIncidentsByMonthYear(monthYear, page = 1, limit = 10, startDate, endDate) {
        if (!monthYear) {
            throw new Error('monthYear parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByMonthYear(monthYear, page, limit, startDate, endDate);
    }
    async getIncidentsBySubCategory(subCategory, page = 1, limit = 10, startDate, endDate) {
        if (!subCategory) {
            throw new Error('subCategory parameter is required');
        }
        return this.grcIncidentsService.getIncidentsBySubCategory(subCategory, page, limit, startDate, endDate);
    }
    async getIncidentsByPeriod(period, page = 1, limit = 10, startDate, endDate) {
        if (!period) {
            throw new Error('period parameter is required. Expected format: MM/YYYY');
        }
        return this.grcIncidentsService.getIncidentsByPeriod(period, page, limit, startDate, endDate);
    }
    async getIncidentsByInternalFraud(page = 1, limit = 10, startDate, endDate) {
        return this.grcIncidentsService.getIncidentsByEventType('Internal Fraud', page, limit, startDate, endDate);
    }
    async getIncidentsByExternalFraud(page = 1, limit = 10, startDate, endDate) {
        return this.grcIncidentsService.getIncidentsByEventType('External Fraud', page, limit, startDate, endDate);
    }
    async getIncidentsByPhysicalAssetDamage(page = 1, limit = 10, startDate, endDate) {
        return this.grcIncidentsService.getIncidentsByEventType('Damage to Physical Assets', page, limit, startDate, endDate);
    }
    async getIncidentsByATMIssue(page = 1, limit = 10, startDate, endDate) {
        return this.grcIncidentsService.getIncidentsBySubCategory('ATM issue', page, limit, startDate, endDate);
    }
    async getIncidentsByPeopleError(page = 1, limit = 10, startDate, endDate) {
        return this.grcIncidentsService.getIncidentsBySubCategory('Human Mistake', page, limit, startDate, endDate);
    }
    async getIncidentsWithRecognitionTime(page = 1, limit = 10, startDate, endDate) {
        return this.grcIncidentsService.getIncidentsWithRecognitionTime(page, limit, startDate, endDate);
    }
    async getIncidentsByPeriodAndType(period, incidentType, page = 1, limit = 10, startDate, endDate) {
        if (!period) {
            throw new Error('period parameter is required. Expected format: YYYY-MM or MM/YYYY');
        }
        if (!incidentType) {
            throw new Error('incidentType parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByPeriodAndType(period, incidentType, page, limit, startDate, endDate);
    }
    async getIncidentsByComprehensiveMetric(metric, page = 1, limit = 10, startDate, endDate) {
        if (!metric) {
            throw new Error('metric parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByComprehensiveMetric(metric, page, limit, startDate, endDate);
    }
};
exports.GrcIncidentsController = GrcIncidentsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('timeframe')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsDashboard", null);
__decorate([
    (0, common_1.Get)('export'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Query)('timeframe')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "exportIncidents", null);
__decorate([
    (0, common_1.Get)('total'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getTotalIncidents", null);
__decorate([
    (0, common_1.Get)('pending-preparer'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getPendingPreparerIncidents", null);
__decorate([
    (0, common_1.Get)('pending-checker'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getPendingCheckerIncidents", null);
__decorate([
    (0, common_1.Get)('pending-reviewer'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getPendingReviewerIncidents", null);
__decorate([
    (0, common_1.Get)('pending-acceptance'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getPendingAcceptanceIncidents", null);
__decorate([
    (0, common_1.Get)('by-category'),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByCategory", null);
__decorate([
    (0, common_1.Get)('by-event-type'),
    __param(0, (0, common_1.Query)('eventType')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByEventType", null);
__decorate([
    (0, common_1.Get)('by-financial-impact'),
    __param(0, (0, common_1.Query)('financialImpact')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByFinancialImpact", null);
__decorate([
    (0, common_1.Get)('by-status'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByStatus", null);
__decorate([
    (0, common_1.Get)('by-month-year'),
    __param(0, (0, common_1.Query)('monthYear')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByMonthYear", null);
__decorate([
    (0, common_1.Get)('by-sub-category'),
    __param(0, (0, common_1.Query)('subCategory')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsBySubCategory", null);
__decorate([
    (0, common_1.Get)('by-period'),
    __param(0, (0, common_1.Query)('period')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByPeriod", null);
__decorate([
    (0, common_1.Get)('by-internal-fraud'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByInternalFraud", null);
__decorate([
    (0, common_1.Get)('by-external-fraud'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByExternalFraud", null);
__decorate([
    (0, common_1.Get)('by-physical-asset-damage'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByPhysicalAssetDamage", null);
__decorate([
    (0, common_1.Get)('by-atm-issue'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByATMIssue", null);
__decorate([
    (0, common_1.Get)('by-people-error'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByPeopleError", null);
__decorate([
    (0, common_1.Get)('recognition-time'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsWithRecognitionTime", null);
__decorate([
    (0, common_1.Get)('by-period-and-type'),
    __param(0, (0, common_1.Query)('period')),
    __param(1, (0, common_1.Query)('incidentType')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByPeriodAndType", null);
__decorate([
    (0, common_1.Get)('by-comprehensive-metric'),
    __param(0, (0, common_1.Query)('metric')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByComprehensiveMetric", null);
exports.GrcIncidentsController = GrcIncidentsController = __decorate([
    (0, common_1.Controller)('api/grc/incidents'),
    __metadata("design:paramtypes", [grc_incidents_service_1.GrcIncidentsService])
], GrcIncidentsController);
//# sourceMappingURL=grc-incidents.controller.js.map