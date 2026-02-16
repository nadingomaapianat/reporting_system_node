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
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const auth_service_1 = require("./auth.service");
const jwt = require("jsonwebtoken");
const REPORTING_FRONTEND_URL = process.env.REPORTING_FRONTEND_URL || process.env.NEXT_PUBLIC_REPORTING_FRONTEND_URL || 'http://localhost:3000';
const COOKIE_NAME = 'reporting_node_token';
function getAllowedEntryOrigins() {
    const list = [REPORTING_FRONTEND_URL.replace(/\/+$/, '').toLowerCase()];
    const extra = process.env.ENTRY_TOKEN_ALLOWED_ORIGINS;
    if (extra) {
        extra.split(',').forEach((o) => {
            const t = o.trim().replace(/\/+$/, '').toLowerCase();
            if (t && !list.includes(t))
                list.push(t);
        });
    }
    return list;
}
function getAllowedLogoutOrigins() {
    const main = process.env.MAIN_APP_ORIGIN || process.env.MAIN_APP_URL || process.env.NEXT_PUBLIC_MAIN_APP_ORIGIN;
    const list = [];
    if (main)
        list.push(main.replace(/\/+$/, '').toLowerCase());
    const extra = process.env.LOGOUT_ALLOWED_ORIGINS;
    if (extra) {
        extra.split(',').forEach((o) => {
            const t = o.trim().replace(/\/+$/, '').toLowerCase();
            if (t && !list.includes(t))
                list.push(t);
        });
    }
    return list;
}
function toOriginBase(value) {
    const v = (value || '').trim();
    if (!v)
        return null;
    try {
        const url = new URL(v.startsWith('http') ? v : `https://${v}`);
        return `${url.protocol}//${url.host}`.toLowerCase();
    }
    catch {
        return null;
    }
}
function isAllowedOrigin(origin, referer, allowed) {
    const o = toOriginBase(origin || '');
    if (o && allowed.includes(o))
        return true;
    const r = toOriginBase(referer || '');
    return r !== null && allowed.includes(r);
}
function isAllowedRedirectUri(uri) {
    const base = REPORTING_FRONTEND_URL.replace(/\/+$/, '').toLowerCase();
    const u = (uri || '').trim().toLowerCase().replace(/\/+$/, '');
    if (!u)
        return false;
    return u === base || u === `${base}/` || u.startsWith(`${base}/`);
}
let AuthController = AuthController_1 = class AuthController {
    constructor(authService) {
        this.authService = authService;
        this.logger = new common_1.Logger(AuthController_1.name);
    }
    async createEntryToken(body, origin, referer, res) {
        const iet = (body?.iet && String(body.iet).trim()) || '';
        const moduleId = (body?.module_id && String(body.module_id).trim()) || 'default';
        const allowedEntry = getAllowedEntryOrigins();
        if (allowedEntry.length && !isAllowedOrigin(origin || '', referer || '', allowedEntry)) {
            this.logger.warn(`[AUDIT] event=ENTRY_TOKEN_FAIL reason=invalid_origin origin=${origin || '(none)'} referer=${referer || '(none)'} timestamp=${new Date().toISOString()}`);
            throw new common_1.ForbiddenException('Invalid origin');
        }
        if (!iet) {
            this.logger.warn(`[AUDIT] event=ENTRY_TOKEN_FAIL reason=no_iet timestamp=${new Date().toISOString()}`);
            throw new common_1.ForbiddenException('IET required');
        }
        const result = await this.authService.createTokenFromIet(iet, moduleId, origin || '');
        if (!result) {
            this.logger.warn(`[AUDIT] event=ENTRY_TOKEN_FAIL reason=invalid_or_expired_iet iet_length=${iet.length} timestamp=${new Date().toISOString()}`);
            throw new common_1.ForbiddenException('Invalid or expired IET');
        }
        this.logger.log(`[AUDIT] event=ENTRY_TOKEN_SUCCESS user_id=${result.userId} timestamp=${new Date().toISOString()}`);
        const requestedRedirect = (body?.redirect_uri && String(body.redirect_uri).trim()) || '';
        const defaultRedirect = REPORTING_FRONTEND_URL.replace(/\/+$/, '') + '/';
        let redirectTo = defaultRedirect;
        if (requestedRedirect) {
            if (isAllowedRedirectUri(requestedRedirect)) {
                redirectTo = requestedRedirect.replace(/\/+$/, '') + '/';
            }
            else {
                this.logger.warn(`[AUDIT] event=REDIRECT_URI_REJECTED requested=${requestedRedirect} allowed_base=${REPORTING_FRONTEND_URL} timestamp=${new Date().toISOString()}`);
            }
        }
        res
            .cookie(COOKIE_NAME, result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: result.expiresIn * 1000,
            path: '/',
        })
            .status(302)
            .redirect(redirectTo);
    }
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
            const secretKey = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'GRC_ADIB_2025';
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
    async logoutGet(origin, referer, res) {
        const allowed = getAllowedLogoutOrigins();
        const fromAllowedOrigin = allowed.length === 0 || isAllowedOrigin(origin || '', referer || '', allowed);
        if (!fromAllowedOrigin) {
            this.logger.warn(`[AUDIT] event=LOGOUT_ORIGIN_UNKNOWN origin=${origin || '(none)'} referer=${referer || '(none)'} – cookie cleared anyway`);
        }
        this.clearReportingCookies(res);
        res.status(200).json({ success: true, message: 'Logged out' });
    }
    async logoutPost(origin, referer, res) {
        const allowed = getAllowedLogoutOrigins();
        const fromAllowedOrigin = allowed.length === 0 || isAllowedOrigin(origin || '', referer || '', allowed);
        if (!fromAllowedOrigin) {
            this.logger.warn(`[AUDIT] event=LOGOUT_ORIGIN_UNKNOWN origin=${origin || '(none)'} referer=${referer || '(none)'} – cookie cleared anyway`);
        }
        this.clearReportingCookies(res);
        res.status(200).json({ success: true, message: 'Logged out' });
    }
    clearReportingCookies(res) {
        const opts = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
        };
        res.cookie(COOKIE_NAME, '', opts);
        res.cookie('iframe_d_c_c_t_p_1', '', opts);
        res.cookie('iframe_d_c_c_t_p_2', '', opts);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('entry-token'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('origin')),
    __param(2, (0, common_1.Headers)('referer')),
    __param(3, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "createEntryToken", null);
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
    (0, common_1.Get)('logout'),
    __param(0, (0, common_1.Headers)('origin')),
    __param(1, (0, common_1.Headers)('referer')),
    __param(2, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutGet", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Headers)('origin')),
    __param(1, (0, common_1.Headers)('referer')),
    __param(2, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutPost", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('api/auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map