"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrcModule = void 0;
const common_1 = require("@nestjs/common");
const grc_dashboard_controller_1 = require("./grc-dashboard.controller");
const grc_dashboard_service_1 = require("./grc-dashboard.service");
const grc_risks_controller_1 = require("./grc-risks.controller");
const grc_risks_service_1 = require("./grc-risks.service");
const database_service_1 = require("../database/database.service");
let GrcModule = class GrcModule {
};
exports.GrcModule = GrcModule;
exports.GrcModule = GrcModule = __decorate([
    (0, common_1.Module)({
        controllers: [grc_dashboard_controller_1.GrcDashboardController, grc_risks_controller_1.GrcRisksController],
        providers: [grc_dashboard_service_1.GrcDashboardService, grc_risks_service_1.GrcRisksService, database_service_1.DatabaseService],
        exports: [grc_dashboard_service_1.GrcDashboardService, grc_risks_service_1.GrcRisksService],
    })
], GrcModule);
//# sourceMappingURL=grc.module.js.map