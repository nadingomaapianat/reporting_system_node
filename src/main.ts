import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as bodyParser from 'body-parser';
import * as path from 'path';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import 'dotenv/config';

// Load .env first so process.env is set before any module (e.g. AuthService) reads it
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Load .env first so process.env is set before any module (e.g. AuthService) reads it
dotenv.config({ path: path.join(process.cwd(), '.env') });

function normalizeOrigin(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

async function bootstrap() {
  const bootLog = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Parse form POSTs (e.g. /api/auth/entry-token from HTML form with application/x-www-form-urlencoded)
  app.use(bodyParser.urlencoded({ extended: true }));

  // Security middleware
  app.use(helmet());
  
  // CORS: env CORS_ORIGINS (comma-separated) or fallback for dev
  const envOrigins = [
    ...(process.env.CORS_ORIGINS?.split(',') ?? []),
    ...(process.env.ALLOWED_ORIGINS?.split(',') ?? []),
  ]
    .map((o) => normalizeOrigin(o))
    .filter(Boolean) as string[];
  const devOrigins = [
    'https://reporting-system-frontend.pianat.ai',
    'https://reporting-system-backend.pianat.ai',
    
   
    
   
   
    
  ];
  // When CORS_ORIGINS not set, use FRONTEND_URL / NODE_PUBLIC_URL from .env so links are env-driven
  const fallbackFromEnv = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL2,
    process.env.NEXT_PUBLIC_REPORTING_FRONTEND_URL,
    process.env.REPORTING_FRONTEND_URL,
    process.env.NODE_PUBLIC_URL,
    process.env.IFRAME_MAIN_ORIGIN,
    process.env.MAIN_APP_ORIGIN,
    process.env.CHART_URL,
    process.env.WEB_SOCKET,
  ]
    .map((o) => normalizeOrigin(o))
    .filter(Boolean) as string[];
  const corsOrigins = envOrigins?.length
    ? [...new Set([...envOrigins, ...devOrigins])]
    : fallbackFromEnv.length
      ? [...new Set([...fallbackFromEnv, ...devOrigins])]
      : [...devOrigins];
  
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
      const normalizedOrigin = normalizeOrigin(origin);
      if ((normalizedOrigin && corsOrigins.includes(normalizedOrigin)) || corsOrigins.includes('*')) {
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
    allowedHeaders: [...corsAllowedHeaders, 'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'x-csrf-token', 'X-Control-Name'],
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

  // Configure body parser for large payloads (already set above with 50mb limit)

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

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');

  bootLog.log(
    `[Reporting] listening port=${port} bind=0.0.0.0 cors_origins=${corsOrigins.length} ` +
      `REPORTING_VERBOSE_LOG=${process.env.REPORTING_VERBOSE_LOG ?? '(unset)'} ` +
      `MAIN_BACKEND_URL=${(process.env.MAIN_BACKEND_URL || '(unset)').replace(/\/+$/, '')}`,
  );
}

bootstrap();
