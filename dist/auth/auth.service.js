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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const axios_1 = require("axios");
const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || process.env.NEXT_PUBLIC_NODE_API_URL || 'http://localhost:5040';
const ORIGIN_FOR_MAIN_BACKEND = process.env.IFRAME_MAIN_ORIGIN || process.env.MAIN_APP_ORIGIN || 'http://localhost:5050';
const JWT_EXPIRES_IN = '2h';
let AuthService = class AuthService {
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    async createTokenFromIet(iet, moduleId, _origin) {
        const base = MAIN_BACKEND_URL.replace(/\/+$/, '');
        const url = `${base}/entry/validate`;
        try {
            const res = await axios_1.default.post(url, { iet: iet, module_id: moduleId }, {
                headers: {
                    Origin: ORIGIN_FOR_MAIN_BACKEND,
                    'Content-Type': 'application/json',
                },
                validateStatus: () => true,
            });
            if (res.status === 403) {
                const reason = res.data?.reason;
                if (reason) {
                    const fixNoRow = 'MAIN_BACKEND_URL (here) must equal main app NEXT_PUBLIC_BASE_URL; run migration on main backend; restart main backend; open Reporting from main app (do not paste IET from another tab)';
                    console.warn(`[IET] CASE=${reason} (from main backend) | FIX: ${reason === 'invalid_origin' ? 'Match origin (e.g. http://localhost:5050)' : reason === 'expired' ? 'Open Reporting again (< 90s)' : reason === 'already_used' ? 'Fresh IET, avoid double submit' : reason === 'no_row' ? fixNoRow : 'See main backend terminal'}`);
                }
                else {
                    console.warn('[IET] Main backend returned 403 (no reason in body). Check MAIN BACKEND terminal for [IET] CASE=...');
                }
            }
            if ((res.status !== 200 && res.status !== 201) || !res.data?.success || !res.data?.user_id) {
                return null;
            }
            const userId = res.data.user_id;
            const token = this.jwtService.sign({ id: userId }, { expiresIn: JWT_EXPIRES_IN });
            const expiresInSeconds = 2 * 60 * 60;
            return { token, expiresIn: expiresInSeconds, userId };
        }
        catch {
            return null;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map