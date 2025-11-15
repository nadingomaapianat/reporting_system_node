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
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sql = require("mssql");
let DatabaseService = class DatabaseService {
    constructor(configService) {
        this.configService = configService;
    }
    async onModuleInit() {
        const dbHost = this.configService.get('DB_HOST');
        const dbPort = parseInt(this.configService.get('DB_PORT'), 10);
        const dbName = this.configService.get('DB_NAME');
        const dbDomain = this.configService.get('DB_Domain');
        const dbUsername = this.configService.get('DB_USERNAME');
        const dbPassword = this.configService.get('DB_PASSWORD');
        const config = {
            server: dbHost,
            port: dbPort,
            database: dbName,
            options: {
                requestTimeout: parseInt(this.configService.get('DB_REQUEST_TIMEOUT') || '60000', 10),
                connectTimeout: parseInt(this.configService.get('DB_CONNECT_TIMEOUT') || '60000', 10),
                encrypt: true,
                trustServerCertificate: true,
                enableArithAbort: true,
                packetSize: 32768,
                trustedConnection: true,
                integratedSecurity: true
            },
            authentication: {
                type: 'ntlm',
                options: {
                    domain: dbDomain,
                    userName: dbUsername,
                    password: dbPassword
                }
            },
            pool: {
                max: parseInt(this.configService.get('DB_POOL_MAX') || '20', 10),
                min: parseInt(this.configService.get('DB_POOL_MIN') || '5', 10),
                idleTimeoutMillis: parseInt(this.configService.get('DB_POOL_IDLE') || '30000', 10),
            },
        };
        try {
            this.pool = await sql.connect(config);
            const authInfo = dbDomain && dbUsername
                ? `${dbDomain}\\${dbUsername}`
                : dbUsername || 'NTLM';
            console.log(`Database connected successfully to ${dbHost}:${dbPort}/${dbName} using NTLM authentication (${authInfo})!`);
        }
        catch (err) {
            console.error('Database connection failed:', err);
            const authInfo = dbDomain && dbUsername
                ? `${dbDomain}\\${dbUsername}`
                : dbUsername || 'NTLM';
            console.error(`Connection details: server=${dbHost}:${dbPort}, database=${dbName}, auth=${authInfo}`);
            if (err instanceof Error) {
                console.error(`Error message: ${err.message}`);
                console.error(`Error code: ${err.code || 'N/A'}`);
            }
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
        return !!this.pool && this.pool.connected;
    }
    async healthCheck() {
        if (!this.pool) {
            return { connected: false, error: 'Connection pool not initialized' };
        }
        if (!this.pool.connected) {
            return { connected: false, error: 'Connection pool not connected' };
        }
        try {
            const request = this.pool.request();
            await request.query('SELECT 1 as health');
            return { connected: true };
        }
        catch (error) {
            return {
                connected: false,
                error: error instanceof Error ? error.message : 'Unknown error during health check',
            };
        }
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DatabaseService);
//# sourceMappingURL=database.service.js.map