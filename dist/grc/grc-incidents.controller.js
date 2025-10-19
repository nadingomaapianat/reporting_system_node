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
exports.GrcIncidentsController = GrcIncidentsController = __decorate([
    (0, common_1.Controller)('api/grc/incidents'),
    __metadata("design:paramtypes", [grc_incidents_service_1.GrcIncidentsService])
], GrcIncidentsController);
//# sourceMappingURL=grc-incidents.controller.js.map