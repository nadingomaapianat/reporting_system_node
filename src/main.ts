import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, HttpException, HttpStatus, ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
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
  
  // CORS configuration - Reading from environment variables
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'https://reporting-system-frontend.pianat.ai',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4200',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
      ];
  
  const corsMethods = process.env.CORS_METHODS
    ? process.env.CORS_METHODS.split(',').map(method => method.trim())
    : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
  
  const corsAllowedHeaders = process.env.CORS_ALLOWED_HEADERS
    ? process.env.CORS_ALLOWED_HEADERS.split(',').map(header => header.trim())
    : ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'];
  
  const corsExposedHeaders = process.env.CORS_EXPOSED_HEADERS
    ? process.env.CORS_EXPOSED_HEADERS.split(',').map(header => header.trim())
    : ['Content-Range', 'X-Content-Range'];
  
  app.enableCors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, Postman, or same-origin requests)
      if (!origin) {
        return callback(null, true);
      }
      // Check if origin is in allowed list
      if (corsOrigins.indexOf(origin) !== -1 || corsOrigins.includes('*')) {
        callback(null, true);
      } else {
        // Log for debugging
        console.log('CORS blocked origin:', origin);
        console.log('Allowed origins:', corsOrigins);
        callback(null, true); // Allow all for now - change to callback(new Error('Not allowed'), false) for strict mode
      }
    },
    credentials: process.env.CORS_CREDENTIALS === 'true' || process.env.CORS_CREDENTIALS === undefined,
    methods: corsMethods,
    allowedHeaders: [...corsAllowedHeaders, 'Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
    exposedHeaders: corsExposedHeaders,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  
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
