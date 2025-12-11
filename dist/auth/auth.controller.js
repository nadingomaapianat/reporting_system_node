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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const jwt = require("jsonwebtoken");
let AuthController = class AuthController {
    async getProfile(req) {
        const user = req.user;
        return {
            id: user?.id || '1',
            email: user?.email || 'demo@example.com',
            name: user?.name || 'Demo User',
            role: user?.role || 'admin',
        };
    }
    async validateToken(body) {
        const { token } = body;
        if (!token) {
            return { success: false, message: 'Token is required' };
        }
        try {
            const secretKey = 'GRC_ADIB_2025';
            const decoded = jwt.verify(token, secretKey);
            const { group, title, name, id } = decoded;
            return {
                success: true,
                data: { group, title, name, id },
            };
        }
        catch (error) {
            console.error('Error validating token:', error);
            return { success: false, message: 'Invalid or expired token' };
        }
    }
    async logout(req) {
        try {
            return {
                isSuccess: true,
                message: 'Logged out successfully',
            };
        }
        catch (error) {
            console.error('Error during logout:', error);
            return {
                isSuccess: false,
                message: 'An error occurred during logout',
            };
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)('validate-token'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "validateToken", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('api/auth')
], AuthController);
//# sourceMappingURL=auth.controller.js.map