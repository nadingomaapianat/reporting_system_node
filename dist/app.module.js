"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const realtime_module_1 = require("./realtime/realtime.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const auth_module_1 = require("./auth/auth.module");
const grc_module_1 = require("./grc/grc.module");
const bull_1 = require("@nestjs/bull");
const simple_chart_controller_1 = require("./shared/simple-chart.controller");
const auto_dashboard_service_1 = require("./shared/auto-dashboard.service");
const chart_registry_service_1 = require("./shared/chart-registry.service");
const database_service_1 = require("./database/database.service");
const user_function_access_service_1 = require("./shared/user-function-access.service");
const user_functions_controller_1 = require("./shared/user-functions.controller");
const csrf_module_1 = require("./csrf/csrf.module");
const csrf_middleware_1 = require("./middleware/csrf.middleware");
const frame_ancestors_middleware_1 = require("./middleware/frame-ancestors.middleware");
const jwt_auth_middleware_1 = require("./auth/jwt-auth.middleware");
const cookieParser = require("cookie-parser");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(cookieParser())
            .forRoutes({ path: '*', method: common_1.RequestMethod.ALL });
        consumer
            .apply(frame_ancestors_middleware_1.FrameAncestorsMiddleware)
            .forRoutes({ path: '*', method: common_1.RequestMethod.ALL });
        consumer
            .apply(jwt_auth_middleware_1.JwtAuthMiddleware)
            .forRoutes({ path: '*', method: common_1.RequestMethod.ALL });
        consumer
            .apply(csrf_middleware_1.CsrfMiddleware)
            .forRoutes({ path: '*', method: common_1.RequestMethod.ALL });
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            schedule_1.ScheduleModule.forRoot(),
            bull_1.BullModule.forRoot({
                redis: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT) || 6379,
                },
            }),
            realtime_module_1.RealtimeModule,
            dashboard_module_1.DashboardModule,
            auth_module_1.AuthModule,
            grc_module_1.GrcModule,
            csrf_module_1.CsrfModule,
        ],
        controllers: [simple_chart_controller_1.SimpleChartController, user_functions_controller_1.UserFunctionsController],
        providers: [
            auto_dashboard_service_1.AutoDashboardService,
            chart_registry_service_1.ChartRegistryService,
            database_service_1.DatabaseService,
            jwt_auth_middleware_1.JwtAuthMiddleware,
            frame_ancestors_middleware_1.FrameAncestorsMiddleware,
            user_function_access_service_1.UserFunctionAccessService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map