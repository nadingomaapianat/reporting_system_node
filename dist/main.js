"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const helmet_1 = require("helmet");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const responseMessage = exception instanceof common_1.HttpException
            ? exception.getResponse()
            : { message: exception.message || 'Internal server error' };
        const message = typeof responseMessage === 'string'
            ? { message: responseMessage }
            : responseMessage;
        console.error(`[${request.method}] ${request.url} - Error:`, exception);
        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            ...message
        });
    }
};
GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    const corsOrigins = [
        'https://fawry-reporting.comply.now',
        'http://localhost:3001',
        'https://backendnode-fawry-reporting.comply.now',
        'http://localhost:3000',
        'https://fawry.comply.now',
        'https://reporting-system-backend.pianat.ai',
        'https://reporting-system-frontend.pianat.ai',
        'http://localhost:5173',
        'http://localhost:4200',
        'http://127.0.0.1:3002',
    ];
    const corsMethods = process.env.CORS_METHODS
        ? process.env.CORS_METHODS.split(',').map(method => method.trim())
        : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    const corsAllowedHeaders = process.env.CORS_ALLOWED_HEADERS
        ? process.env.CORS_ALLOWED_HEADERS.split(',').map(header => header.trim())
        : ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-csrf-token'];
    const corsExposedHeaders = process.env.CORS_EXPOSED_HEADERS
        ? process.env.CORS_EXPOSED_HEADERS.split(',').map(header => header.trim())
        : ['Content-Range', 'X-Content-Range'];
    app.enableCors({
        origin: function (origin, callback) {
            if (!origin) {
                return callback(null, true);
            }
            if (corsOrigins.indexOf(origin) !== -1 || corsOrigins.includes('*')) {
                callback(null, true);
            }
            else {
                console.warn('[CORS] Blocked origin:', origin);
                console.warn('[CORS] Allowed origins:', corsOrigins);
                callback(new Error(`Origin ${origin} is not allowed by CORS policy`), false);
            }
        },
        credentials: process.env.CORS_CREDENTIALS === 'true' || process.env.CORS_CREDENTIALS === undefined,
        methods: corsMethods,
        allowedHeaders: [...corsAllowedHeaders, 'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'x-csrf-token'],
        exposedHeaders: corsExposedHeaders,
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    const port = process.env.PORT || 3002;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Real-time API server running on port ${port}`);
    console.log(`📊 WebSocket server ready for real-time updates`);
}
bootstrap().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map