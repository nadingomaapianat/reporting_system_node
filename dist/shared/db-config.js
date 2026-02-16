"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fq = exports.DB_BRACKETED = exports.DB_NAME = void 0;
exports.DB_NAME = process.env.DB_NAME || 'NEWDCC-V4-UAT';
exports.DB_BRACKETED = `[${exports.DB_NAME}]`;
const fq = (table) => `${exports.DB_BRACKETED}.dbo.${table}`;
exports.fq = fq;
//# sourceMappingURL=db-config.js.map