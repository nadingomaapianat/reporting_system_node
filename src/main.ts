import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as cors from 'cors';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002','http://localhost:3000','http://localhost:3002'],
    credentials: true,
  }));
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));
  
  const port = process.env.PORT || 3002;
  await app.listen(port);
  
  console.log(`🚀 Real-time API server running on port ${port}`);
  console.log(`📊 WebSocket server ready for real-time updates`);
}

bootstrap();
