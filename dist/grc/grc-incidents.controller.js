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
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
let GrcIncidentsController = class GrcIncidentsController {
    constructor(grcIncidentsService) {
        this.grcIncidentsService = grcIncidentsService;
    }
    async getIncidentsDashboard(req, timeframe, startDate, endDate, functionId) {
        return this.grcIncidentsService.getIncidentsDashboard(req.user, timeframe, startDate, endDate, functionId);
    }
    async exportIncidents(req, format, timeframe) {
        return this.grcIncidentsService.exportIncidents(req.user, format, timeframe);
    }
    async getIncidentsList(req, page = 1, limit = 10000, startDate, endDate, functionId) {
        return this.grcIncidentsService.getTotalIncidents(req.user, page, limit, startDate, endDate, functionId);
    }
    async getTotalIncidents(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcIncidentsService.getTotalIncidents(req.user, page, limit, startDate, endDate, functionId);
    }
    async getPendingPreparerIncidents(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcIncidentsService.getPendingPreparerIncidents(req.user, page, limit, startDate, endDate, functionId);
    }
    async getPendingCheckerIncidents(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcIncidentsService.getPendingCheckerIncidents(req.user, page, limit, startDate, endDate, functionId);
    }
    async getPendingReviewerIncidents(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcIncidentsService.getPendingReviewerIncidents(req.user, page, limit, startDate, endDate, functionId);
    }
    async getPendingAcceptanceIncidents(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcIncidentsService.getPendingAcceptanceIncidents(req.user, page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByCategory(req, category, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!category) {
            throw new Error('category parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByCategory(req.user, category, page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByEventType(req, eventType, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!eventType) {
            throw new Error('eventType parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByEventType(req.user, eventType, page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByFinancialImpact(req, financialImpact, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!financialImpact) {
            throw new Error('financialImpact parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByFinancialImpact(req.user, financialImpact, page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByStatus(req, status, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!status) {
            throw new Error('status parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByStatus(req.user, status, page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByMonthYear(req, monthYear, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!monthYear) {
            throw new Error('monthYear parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByMonthYear(req.user, monthYear, page, limit, startDate, endDate, functionId);
    }
    async getIncidentsBySubCategory(req, subCategory, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!subCategory) {
            throw new Error('subCategory parameter is required');
        }
        return this.grcIncidentsService.getIncidentsBySubCategory(req.user, subCategory, page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByPeriod(req, period, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!period) {
            throw new Error('period parameter is required. Expected format: MM/YYYY');
        }
        return this.grcIncidentsService.getIncidentsByPeriod(req.user, period, page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByInternalFraud(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcIncidentsService.getIncidentsByEventType(req.user, 'Internal Fraud', page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByExternalFraud(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcIncidentsService.getIncidentsByEventType(req.user, 'External Fraud', page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByPhysicalAssetDamage(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcIncidentsService.getIncidentsByEventType(req.user, 'Damage to Physical Assets', page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByATMIssue(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcIncidentsService.getIncidentsBySubCategory(req.user, 'ATM issue', page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByPeopleError(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcIncidentsService.getIncidentsBySubCategory(req.user, 'Human Mistake', page, limit, startDate, endDate, functionId);
    }
    async getIncidentsWithRecognitionTime(req, page = 1, limit = 10, startDate, endDate, functionId) {
        return this.grcIncidentsService.getIncidentsWithRecognitionTime(req.user, page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByPeriodAndType(req, period, incidentType, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!period) {
            throw new Error('period parameter is required. Expected format: YYYY-MM or MM/YYYY');
        }
        if (!incidentType) {
            throw new Error('incidentType parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByPeriodAndType(req.user, period, incidentType, page, limit, startDate, endDate, functionId);
    }
    async getIncidentsByComprehensiveMetric(req, metric, page = 1, limit = 10, startDate, endDate, functionId) {
        if (!metric) {
            throw new Error('metric parameter is required');
        }
        return this.grcIncidentsService.getIncidentsByComprehensiveMetric(req.user, metric, page, limit, startDate, endDate, functionId);
    }
};
exports.GrcIncidentsController = GrcIncidentsController;
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
], GrcIncidentsController.prototype, "getIncidentsDashboard", null);
__decorate([
    (0, common_1.Get)('export'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Query)('timeframe')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "exportIncidents", null);
__decorate([
    (0, common_1.Get)('list'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsList", null);
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
], GrcIncidentsController.prototype, "getTotalIncidents", null);
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
], GrcIncidentsController.prototype, "getPendingPreparerIncidents", null);
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
], GrcIncidentsController.prototype, "getPendingCheckerIncidents", null);
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
], GrcIncidentsController.prototype, "getPendingReviewerIncidents", null);
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
], GrcIncidentsController.prototype, "getPendingAcceptanceIncidents", null);
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
], GrcIncidentsController.prototype, "getIncidentsByCategory", null);
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
], GrcIncidentsController.prototype, "getIncidentsByEventType", null);
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
], GrcIncidentsController.prototype, "getIncidentsByFinancialImpact", null);
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
], GrcIncidentsController.prototype, "getIncidentsByStatus", null);
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
], GrcIncidentsController.prototype, "getIncidentsByMonthYear", null);
__decorate([
    (0, common_1.Get)('by-sub-category'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('subCategory')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsBySubCategory", null);
__decorate([
    (0, common_1.Get)('by-period'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('period')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByPeriod", null);
__decorate([
    (0, common_1.Get)('by-internal-fraud'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByInternalFraud", null);
__decorate([
    (0, common_1.Get)('by-external-fraud'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByExternalFraud", null);
__decorate([
    (0, common_1.Get)('by-physical-asset-damage'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByPhysicalAssetDamage", null);
__decorate([
    (0, common_1.Get)('by-atm-issue'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByATMIssue", null);
__decorate([
    (0, common_1.Get)('by-people-error'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByPeopleError", null);
__decorate([
    (0, common_1.Get)('recognition-time'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsWithRecognitionTime", null);
__decorate([
    (0, common_1.Get)('by-period-and-type'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('period')),
    __param(2, (0, common_1.Query)('incidentType')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('startDate')),
    __param(6, (0, common_1.Query)('endDate')),
    __param(7, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByPeriodAndType", null);
__decorate([
    (0, common_1.Get)('by-comprehensive-metric'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('metric')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('functionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], GrcIncidentsController.prototype, "getIncidentsByComprehensiveMetric", null);
exports.GrcIncidentsController = GrcIncidentsController = __decorate([
    (0, common_1.Controller)('api/grc/incidents'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('Reporting', ['show']),
    __metadata("design:paramtypes", [grc_incidents_service_1.GrcIncidentsService])
], GrcIncidentsController);
//# sourceMappingURL=grc-incidents.controller.js.map