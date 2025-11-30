import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security middleware
  app.use(helmet());
  
  // CORS configuration - Reading from environment variables
  const corsOrigins =  [
        'https://reporting-system-frontend.pianat.ai',
        'http://localhost:3001',
        'https://reporting-system-backend.pianat.ai',
        'https://reporting-system-frontend.pianat.ai',
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

  app.use((req, res, next) => {
    // إزالة الرأس X-Powered-By
    res.removeHeader('X-Powered-By');
    next();
  });

  // Configure body parser with increased limits
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Configure express to handle large payloads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Error handling middleware
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

 
  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({ 
    origin: [process.env.CHART_URL, process.env.WEB_SOCKET, process.env.FRONTEND_URL, process.env.FRONTEND_URL2], // Replace with your frontend URLs
    credentials: true,  
  });

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
  });
}

bootstrap();
