"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const permissions_guard_1 = require("./guards/permissions.guard");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => {
                    const secret = config.get('JWT_SECRET') || config.get('JWT_SECRET_KEY');
                    if (process.env.NODE_ENV === 'production' && !secret) {
                        throw new Error('JWT_SECRET (or JWT_SECRET_KEY) must be set in production');
                    }
                    return {
                        secret: secret || 'GRC_ADIB_2025',
                        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '2h' },
                    };
                },
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard],
        exports: [jwt_1.JwtModule, auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map