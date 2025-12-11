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
  const corsOrigins =  [
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
      // For CSRF token endpoint, require origin (block direct access)
      // For other endpoints, allow requests with no origin (like mobile apps, curl, Postman, or same-origin requests)
      // Note: CORS only applies to cross-origin requests, so same-origin requests don't send Origin header
      
      // If no origin, check if it's a same-origin request (allowed) or cross-origin without origin (blocked for security)
      // In practice, cross-origin requests always have an Origin header
      if (!origin) {
        // Same-origin requests don't have Origin header - this is normal and allowed
        // But we'll validate in the controller for CSRF token endpoint
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (corsOrigins.indexOf(origin) !== -1 || corsOrigins.includes('*')) {
        callback(null, true);
      } else {
        // Log for debugging
        console.warn('[CORS] Blocked origin:', origin);
        console.warn('[CORS] Allowed origins:', corsOrigins);
        // Block unauthorized origins for security
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
