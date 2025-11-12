import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, HttpException, HttpStatus, ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as cors from 'cors';
import helmet from 'helmet';

@Catch()
class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    
    const responseMessage = exception instanceof HttpException
      ? exception.getResponse()
      : { message: exception.message || 'Internal server error' };
    
    // Ensure message is always an object for spreading
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
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(cors({
    origin: ['https://reporting-system-frontend.pianat.ai', 'http://localhost:3001', 'https://reporting-system-backend.pianat.ai','https://reporting-system-frontend.pianat.ai','https://reporting-system-backend.pianat.ai'],
    credentials: true,
  }));
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Global exception filter to handle errors gracefully
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));
  
  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Real-time API server running on port ${port}`);
  console.log(`📊 WebSocket server ready for real-time updates`);
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
