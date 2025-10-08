"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
let AuthService = class AuthService {
    async login(email, password) {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }
        const user = {
            id: '1',
            email,
            name: email.split('@')[0],
            role: 'admin',
        };
        const token = 'demo-jwt-token-' + Date.now();
        return {
            user,
            token,
            expiresIn: '24h',
        };
    }
    async register(email, password, name) {
        if (!email || !password || !name) {
            throw new Error('Email, password, and name are required');
        }
        const user = {
            id: Date.now().toString(),
            email,
            name,
            role: 'user',
        };
        const token = 'demo-jwt-token-' + Date.now();
        return {
            user,
            token,
            expiresIn: '24h',
            message: 'User registered successfully',
        };
    }
    async validateUser(email, password) {
        return {
            id: '1',
            email,
            name: email.split('@')[0],
            role: 'admin',
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)()
], AuthService);
//# sourceMappingURL=auth.service.js.map