"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const sql = require("mssql");
let DatabaseService = class DatabaseService {
    async onModuleInit() {
        const config = {
            user: 'SA',
            password: 'Nothing_159',
            server: '206.189.57.0',
            port: 1433,
            database: 'NEWDCC-V4-UAT',
            options: {
                encrypt: true,
                trustServerCertificate: true,
                enableArithAbort: true,
                packetSize: 32768,
                connectTimeout: 60000,
                requestTimeout: 60000
            },
            pool: {
                max: 20,
                min: 5,
                idleTimeoutMillis: 30000
            }
        };
        try {
            this.pool = await sql.connect(config);
            console.log('Database connected successfully!');
        }
        catch (err) {
            console.error('Database connection failed:', err);
            console.log('Continuing with mock data...');
        }
    }
    async onModuleDestroy() {
        if (this.pool) {
            await this.pool.close();
            console.log('Database connection closed.');
        }
    }
    async query(sqlQuery, params = []) {
        if (!this.pool) {
            throw new Error('Database not connected');
        }
        try {
            const request = this.pool.request();
            if (params && params.length > 0) {
                params.forEach((param, index) => {
                    request.input(`param${index}`, param);
                });
            }
            const result = await request.query(sqlQuery);
            return result.recordset;
        }
        catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }
    async getConnection() {
        return this.pool;
    }
    async closeConnection() {
        if (this.pool) {
            await this.pool.close();
        }
    }
    isConnected() {
        return !!this.pool;
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)()
], DatabaseService);
//# sourceMappingURL=database.service.js.map