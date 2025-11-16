"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const bodyParser = require("body-parser");
const express = require("express");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((req, res, next) => {
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
        next();
    });
    app.use((req, res, next) => {
        res.removeHeader('X-Powered-By');
        next();
    });
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    app.use((err, req, res, next) => {
        if (err.status === 413 || err.type === 'entity.too.large') {
            return res.status(413).json({
                statusCode: 413,
                message: 'File size exceeds the maximum limit of 50MB',
                error: 'Payload Too Large'
            });
        }
        res.status(500).json({
            statusCode: 500,
            message: 'Server Error',
        });
    });
    app.useGlobalPipes(new common_1.ValidationPipe());
    app.enableCors({
        origin: [process.env.CHART_URL, process.env.WEB_SOCKET, process.env.FRONTEND_URL, process.env.FRONTEND_URL2],
        credentials: true,
    });
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    const port = process.env.PORT || 3002;
    await app.listen(port, '0.0.0.0', () => {
        console.log(`Server is running on http://0.0.0.0:${port}`);
    });
}
bootstrap();
//# sourceMappingURL=main.js.map