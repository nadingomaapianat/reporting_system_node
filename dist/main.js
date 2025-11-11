"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const cors = require("cors");
const helmet_1 = require("helmet");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.use(cors({
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000', 'http://localhost:3002'],
        credentials: true,
    }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    const port = process.env.PORT || 3002;
    await app.listen(port);
    console.log(`🚀 Real-time API server running on port ${port}`);
    console.log(`📊 WebSocket server ready for real-time updates`);
}
bootstrap();
//# sourceMappingURL=main.js.map